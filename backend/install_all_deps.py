import subprocess
import sys
import os

def install_deps():
    venv_python = os.path.join("venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        print("Venv not found at venv/Scripts/python.exe")
        return

    deps = [
        "python-docx",
        "python-pptx",
        "pandas",
        "requests",
        "Pillow",
        "pytesseract",
        "PyMuPDF",
        "langchain-ollama",
        "langchain-chroma",
        "sqlalchemy",
        "psycopg2-binary",
        "python-dotenv",
        "python-multipart",
        "docx2pdf"
    ]

    for dep in deps:
        print(f"Installing {dep}...")
        subprocess.run([venv_python, "-m", "pip", "install", dep], check=True)

if __name__ == "__main__":
    install_deps()
