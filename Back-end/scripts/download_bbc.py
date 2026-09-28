"""Download the BBC News dataset (2,225 articles, 5 categories; D. Greene & P. Cunningham, ICML 2006).

Run from Back-end/:  python -m scripts.download_bbc
Then:                python -m scripts.ingest --bbc datasets/bbc --reset
"""
import io
import sys
import urllib.request
import zipfile
from pathlib import Path

URL = "http://mlg.ucd.ie/files/datasets/bbc-fulltext.zip"
DEST = Path(__file__).resolve().parent.parent / "datasets"

if __name__ == "__main__":
    print(f"Downloading {URL} …")
    try:
        data = urllib.request.urlopen(URL, timeout=60).read()
    except Exception as exc:
        sys.exit(f"Download failed ({exc}). Get bbc-fulltext.zip manually and unzip it into {DEST}/")
    zipfile.ZipFile(io.BytesIO(data)).extractall(DEST)
    print(f"Extracted to {DEST / 'bbc'}")
