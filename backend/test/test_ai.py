import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1])
)
from app.ai.orchestrator import AIOrchestrator


def main():

    ai = AIOrchestrator()

    result = ai.process(
        message=(
            "I have 3 hours and I love "
            "nature and photography."
        ),
        latitude=24.8170,
        longitude=93.9368,
        interests=[
            "nature",
            "photography",
        ],
        available_minutes=30,
    )

    print("\n=== DESTINATIONS ===")

    for destination in result["destinations"]:
        print(
            destination["name"],
            "->",
            destination["distance_km"],
            "km"
        )

    print("\n=== LLM CONTEXT ===")
    print(result["context"])


if __name__ == "__main__":
    main()