#!/usr/bin/env python3
"""Script to download the pre-trained GloVe 50d word embeddings.

Attempts to fetch the 50d file directly from a Hugging Face mirror to save bandwidth,
falling back to Stanford's official ZIP repository if the mirror is unavailable.
"""

import os
import sys
import zipfile
import urllib.request
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Target paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
TARGET_FILE = os.path.join(DATA_DIR, "glove.6B.50d.txt")
ZIP_FILE = os.path.join(DATA_DIR, "glove.6B.zip")

# Source URLs
HF_URL = "https://huggingface.co/JeremiahZ/glove/resolve/main/glove.6B.50d.txt"
STANFORD_URL = "http://nlp.stanford.edu/data/glove.6B.zip"


def download_progress_hook(count, block_size, total_size):
    """Callback for urllib.request.urlretrieve to show progress."""
    if total_size > 0:
        percent = int(count * block_size * 100 / total_size)
        percent = min(percent, 100)
        sys.stdout.write(f"\rDownloading... {percent}%")
        sys.stdout.flush()


def download_glove() -> None:
    """Download and prepare the GloVe 50d dataset."""
    os.makedirs(DATA_DIR, exist_ok=True)

    if os.path.exists(TARGET_FILE):
        logger.info(
            "GloVe 50d file already exists at %s. Skipping download.", TARGET_FILE
        )
        return

    # Strategy 1: Fast direct download from Hugging Face Mirror
    logger.info("Attempting fast download from Hugging Face mirror...")
    try:
        urllib.request.urlretrieve(
            HF_URL, TARGET_FILE, reporthook=download_progress_hook
        )
        print()  # Newline after progress bar
        logger.info("Download completed successfully from Hugging Face.")
        return
    except Exception as e:
        logger.warning("Fast download failed: %s. Falling back to Stanford ZIP...", e)
        if os.path.exists(TARGET_FILE):
            os.remove(TARGET_FILE)

    # Strategy 2: Official Stanford ZIP download
    logger.info("Downloading official GloVe.6B ZIP from Stanford (~822MB)...")
    try:
        urllib.request.urlretrieve(
            STANFORD_URL, ZIP_FILE, reporthook=download_progress_hook
        )
        print()  # Newline after progress bar
        logger.info("Extracting glove.6B.50d.txt...")

        with zipfile.ZipFile(ZIP_FILE, "r") as zip_ref:
            # Only extract the 50d file to save space
            zip_ref.extract("glove.6B.50d.txt", DATA_DIR)

        logger.info("Extraction complete. Cleaning up ZIP archive...")
        if os.path.exists(ZIP_FILE):
            os.remove(ZIP_FILE)

        logger.info("GloVe 50d file prepared successfully.")
    except Exception as e:
        logger.error("Failed to download and extract official GloVe dataset: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    download_glove()
