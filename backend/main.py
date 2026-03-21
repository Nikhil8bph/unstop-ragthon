import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base
import app.models
from app.routes import router as api_router

app = FastAPI(title="Local Agentic RAG System", version="1.0.0")

# CORS MUST come before routes so it wraps all responses (including 500 errors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler - ensures CORS headers are always returned
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

app.include_router(api_router, prefix="/api")

# Create tables if they don't exist (in a real app, use Alembic)
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Local Agentic RAG System API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
