import nltk
import os

nltk_data_path = os.path.join(os.getcwd(), "nltk_data")

# Create the directory if it doesn't exist
os.makedirs(nltk_data_path, exist_ok=True)

# Download resources only if not already present
def download_if_missing(package):
    try:
        nltk.data.find(f"{package}")
    except LookupError:
        nltk.download(package.split("/")[-1], download_dir=nltk_data_path)

download_if_missing("corpora/wordnet")
download_if_missing("corpora/omw-1.4")
