import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1])
)
from app.ai.orchestrator import AIOrchestrator


orchestrator = AIOrchestrator()

result = orchestrator.recommend(
    message="I want to experience local culture",
    latitude=24.817,
    longitude=93.9368,
    interests=["culture"],
    available_minutes=120,
)

print("\n=== MEERUP AI RESPONSE ===\n")
print(result["answer"])

print("\n=== DESTINATIONS USED ===\n")

for destination in result["destinations"]:
    print(
        destination["name"],
        "->",
        destination["distance_km"],
        "km",
        "->",
        destination["estimated_duration_minutes"],
        "minutes",
    )