"""Train Meerup's lightweight ORB landmark model from the local dataset."""

import argparse
import sys
from pathlib import Path

# Add project root to sys.path so it runs standalone
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.vision.landmark_detector import LandmarkDetector


def main() -> None:
    parser = argparse.ArgumentParser(description="Train lightweight ORB landmark detector.")
    parser.add_argument("--dataset", type=Path, default=Path("dataset"), help="Path to dataset directory")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("models/landmark_orb_index.npz"),
        help="Output path for compressed model index",
    )
    args = parser.parse_args()

    if not args.dataset.exists():
        print(f"Error: Dataset directory '{args.dataset}' does not exist.")
        sys.exit(1)

    print(f"Scanning dataset at '{args.dataset}'...")
    summary = LandmarkDetector.train(args.dataset, args.output)
    print(f"✅ Successfully saved {summary['references']} landmark references to {args.output}")
    if summary['skipped'] > 0:
        print(f"⚠️  Skipped {summary['skipped']} unreadable images")
    else:
        print("✨ All images processed with zero errors.")


if __name__ == "__main__":
    main()
