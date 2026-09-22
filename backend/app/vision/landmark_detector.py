"""A small, CPU-only landmark detector trained from local reference images."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass(frozen=True)
class LandmarkDetection:
    label: str | None
    confidence: float
    good_matches: int


class LandmarkDetector:
    """Matches ORB features against an index built from labeled photos.

    ORB descriptors are binary, compact, and fast on CPU.  The index contains
    no neural-network runtime, so it can run alongside the local LLM.
    """

    def __init__(
        self,
        model_path: str | Path,
        *,
        ratio_threshold: float = 0.75,
        min_good_matches: int = 12,
        min_confidence: float = 0.62,
    ):
        self.model_path = Path(model_path)
        self.ratio_threshold = ratio_threshold
        self.min_good_matches = min_good_matches
        self.min_confidence = min_confidence
        self._orb = cv2.ORB_create(nfeatures=700, fastThreshold=12)
        self._matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
        self._load()

    @classmethod
    def train(
        cls,
        dataset_dir: str | Path,
        output_path: str | Path,
    ) -> dict[str, int]:
        """Build a persistent ORB index from class-named dataset folders."""
        dataset_path = Path(dataset_dir)
        output = Path(output_path)
        orb = cv2.ORB_create(nfeatures=700, fastThreshold=12)

        labels: list[str] = []
        paths: list[str] = []
        offsets = [0]
        descriptor_sets: list[np.ndarray] = []
        skipped = 0

        for class_dir in sorted(path for path in dataset_path.iterdir() if path.is_dir()):
            label = "_".join(class_dir.name.lower().split())
            for image_path in sorted(class_dir.iterdir()):
                if image_path.suffix.lower() not in SUPPORTED_SUFFIXES:
                    continue
                image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
                if image is None:
                    skipped += 1
                    continue
                descriptors = cls._descriptors_for_image(orb, image)
                if descriptors is None or len(descriptors) < 2:
                    skipped += 1
                    continue
                labels.append(label)
                paths.append(str(image_path.relative_to(dataset_path)))
                descriptor_sets.append(descriptors)
                offsets.append(offsets[-1] + len(descriptors))

        if not descriptor_sets:
            raise ValueError("No usable images were found in the landmark dataset.")

        output.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            output,
            labels=np.asarray(labels, dtype=str),
            paths=np.asarray(paths, dtype=str),
            offsets=np.asarray(offsets, dtype=np.int64),
            descriptors=np.concatenate(descriptor_sets, axis=0),
        )
        return {"references": len(labels), "skipped": skipped}

    def detect(self, image_bytes: bytes) -> LandmarkDetection:
        encoded = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("The supplied image could not be decoded.")

        query = self._descriptors_for_image(self._orb, image)
        if query is None or len(query) < 2:
            return LandmarkDetection(None, 0.0, 0)

        scores: dict[str, list[int]] = {}
        for index, label in enumerate(self.labels):
            start, end = self.offsets[index], self.offsets[index + 1]
            reference = self.descriptors[start:end]
            if len(reference) < 2:
                continue
            good_matches = self._good_match_count(query, reference)
            scores.setdefault(str(label), []).append(good_matches)

        if not scores:
            return LandmarkDetection(None, 0.0, 0)

        class_scores = {
            label: sum(sorted(values, reverse=True)[:5])
            for label, values in scores.items()
        }
        ordered = sorted(class_scores.items(), key=lambda item: item[1], reverse=True)
        label, best_score = ordered[0]
        second_score = ordered[1][1] if len(ordered) > 1 else 0
        confidence = best_score / max(best_score + second_score, 1)

        if best_score < self.min_good_matches or confidence < self.min_confidence:
            return LandmarkDetection(None, confidence, best_score)
        return LandmarkDetection(label, confidence, best_score)

    def _load(self) -> None:
        if not self.model_path.is_file():
            raise FileNotFoundError(
                f"Landmark model not found at {self.model_path}. "
                "Run scripts/train_landmark_detector.py first."
            )
        with np.load(self.model_path, allow_pickle=False) as model:
            self.labels = model["labels"]
            self.offsets = model["offsets"]
            self.descriptors = model["descriptors"]

    def _good_match_count(
        self,
        query: np.ndarray,
        reference: np.ndarray,
    ) -> int:
        matches = self._matcher.knnMatch(query, reference, k=2)
        return sum(
            1
            for pair in matches
            if len(pair) == 2 and pair[0].distance < self.ratio_threshold * pair[1].distance
        )

    @staticmethod
    def _descriptors_for_image(
        orb: cv2.ORB,
        image: np.ndarray,
    ) -> np.ndarray | None:
        height, width = image.shape[:2]
        longest_edge = max(height, width)
        if longest_edge > 960:
            scale = 960 / longest_edge
            image = cv2.resize(
                image,
                (round(width * scale), round(height * scale)),
                interpolation=cv2.INTER_AREA,
            )
        grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, descriptors = orb.detectAndCompute(grayscale, None)
        return descriptors
