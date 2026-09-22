"""Grounded place facts and AI stories for vision detections."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

from app.ai.llm import LocalLLM
from app.vision.landmark_detector import LandmarkDetection, LandmarkDetector
from app.vision.place_content import content_for_label

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = Path("models/landmark_orb_index.npz")
DEFAULT_DATASET_DIR = Path("dataset")


@dataclass(frozen=True)
class LandmarkResponse:
    recognized: bool
    place_id: str = ""
    name: str = ""
    confidence: float = 0.0
    good_matches: int = 0
    description: str = ""
    facts: list[str] = field(default_factory=list)
    highlights: list[str] = field(default_factory=list)
    story: str = ""
    llm_generated: bool = False


class LandmarkStoryService:
    def __init__(
        self,
        detector: LandmarkDetector | None = None,
        llm: LocalLLM | None = None,
        model_path: str | Path = DEFAULT_MODEL_PATH,
        dataset_dir: str | Path = DEFAULT_DATASET_DIR,
    ):
        self.model_path = Path(model_path)
        self.dataset_dir = Path(dataset_dir)
        self.llm = llm or LocalLLM()

        if detector is not None:
            self.detector = detector
        else:
            self._ensure_model_trained()
            self.detector = LandmarkDetector(self.model_path)

    def _ensure_model_trained(self) -> None:
        """Trains index automatically if missing and dataset exists."""
        if not self.model_path.is_file():
            if self.dataset_dir.is_dir():
                logger.info(
                    "Model index not found at %s. Training from %s...",
                    self.model_path,
                    self.dataset_dir,
                )
                self.model_path.parent.mkdir(parents=True, exist_ok=True)
                LandmarkDetector.train(self.dataset_dir, self.model_path)
            else:
                logger.warning(
                    "Neither model index (%s) nor dataset directory (%s) were found.",
                    self.model_path,
                    self.dataset_dir,
                )

    def recognize(self, image_bytes: bytes) -> LandmarkResponse:
        detection: LandmarkDetection = self.detector.detect(image_bytes)
        if detection.label is None:
            return LandmarkResponse(
                recognized=False,
                confidence=round(detection.confidence, 4),
                good_matches=detection.good_matches,
            )

        place = content_for_label(detection.label)
        if place is None:
            return LandmarkResponse(
                recognized=False,
                confidence=round(detection.confidence, 4),
                good_matches=detection.good_matches,
            )

        facts = list(place.facts)
        highlights = list(place.highlights)

        # Attempt dynamic storytelling via local LLM; fall back cleanly if unavailable
        story, llm_generated = self._generate_story(place.name, place.description, facts, place.fallback_story)

        return LandmarkResponse(
            recognized=True,
            place_id=place.place_id,
            name=place.name,
            confidence=round(detection.confidence, 4),
            good_matches=detection.good_matches,
            description=place.description,
            facts=facts,
            highlights=highlights,
            story=story,
            llm_generated=llm_generated,
        )

    def _generate_story(
        self,
        name: str,
        description: str,
        facts: list[str],
        fallback_story: str,
    ) -> tuple[str, bool]:
        """Generates AI story via LLM if reachable, otherwise returns curated fallback."""
        try:
            story = self.llm.chat(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are Meerup, a cultural guide for Manipur tourism. "
                            "Write an engaging, atmospheric story in 70-90 words about the landmark "
                            "using only the supplied description and facts. Do not invent ungrounded claims."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Landmark: {name}\n"
                            f"Description: {description}\n"
                            f"Key Facts:\n" + "\n".join(f"- {f}" for f in facts)
                        ),
                    },
                ],
                temperature=0.4,
                max_tokens=200,
            )
            if story and story.strip():
                return story.strip(), True
        except Exception as exc:
            logger.info("Local LLM unavailable (%s), using curated fallback story.", exc)

        return fallback_story, False
