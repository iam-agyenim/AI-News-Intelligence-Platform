"""Download the NLTK data packages the platform uses."""
import nltk

PACKAGES = ["punkt", "punkt_tab", "stopwords", "wordnet", "omw-1.4",
            "averaged_perceptron_tagger", "averaged_perceptron_tagger_eng"]

if __name__ == "__main__":
    for p in PACKAGES:
        nltk.download(p, quiet=True)
    print("NLTK data ready")
