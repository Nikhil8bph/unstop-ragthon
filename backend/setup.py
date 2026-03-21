from setuptools import setup, find_packages

def parse_requirements(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="ragthon_backend",
    version="0.1.0",
    description="FastAPI Backend Core for RAG-X-Thon",
    author="DevMistri (Nikhil Sharma & Puja Chatterjee)",
    packages=find_packages(include=["app", "app.*"]),
    install_requires=[
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "psycopg2-binary",
        "langchain",
        "langchain-chroma",
        "ollama",
        "pydantic",
        "python-multipart"
    ],
    python_requires=">=3.10",
)
