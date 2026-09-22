"""
download_models.py
Pulls AI4Bharat Speech-to-Speech models locally to cache for offline inference.
"""

import os
import sys
import time
from dotenv import load_dotenv
from huggingface_hub import snapshot_download

load_dotenv(override=True)
token = os.getenv("HF_TOKEN")

if not token:
    print("❌ Error: HF_TOKEN is not set in .env")
    sys.exit(1)

MODELS = [
    ("NMT: Manipuri -> English (Distilled 200M)", "ai4bharat/indictrans2-indic-en-dist-200M"),
    ("NMT: English -> Manipuri (Distilled 200M)", "ai4bharat/indictrans2-en-indic-dist-200M"),
    ("ASR: IndicConformer Multilingual (600M)", "ai4bharat/indic-conformer-600m-multilingual"),
    ("TTS: Indic Parler-TTS", "ai4bharat/indic-parler-tts"),
]

print("=================================================================")
print("🚀 Starting Local Model Downloads for Meerup STS Engine")
print("=================================================================")

for desc, repo_id in MODELS:
    print(f"\n📦 [{desc}]")
    print(f"   Repo: {repo_id}")
    start = time.time()
    try:
        path = snapshot_download(
            repo_id=repo_id,
            token=token,
            max_workers=4,
            resume_download=True
        )
        elapsed = time.time() - start
        print(f"   ✅ Downloaded in {elapsed:.1f}s")
        print(f"   📁 Local Path: {path}")
    except Exception as e:
        print(f"   ❌ Failed to download {repo_id}: {e}")

print("\n=================================================================")
print("🎉 Model download sequence complete!")
print("=================================================================")
