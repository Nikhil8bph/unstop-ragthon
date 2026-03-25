from dotenv import load_dotenv
import os

load_dotenv()

from app.database import engine, SessionLocal
from sqlalchemy import text

def migrate():
    print("Starting migration...")
    with engine.connect() as conn:
        with conn.begin():
            try:
                # Add title column
                print("Adding title column...")
                conn.execute(text('ALTER TABLE rag_system.chat_sessions ADD COLUMN IF NOT EXISTS title VARCHAR;'))
                
                # Add context_type column
                print("Adding context_type column...")
                conn.execute(text("ALTER TABLE rag_system.chat_sessions ADD COLUMN IF NOT EXISTS context_type VARCHAR DEFAULT 'project';"))
                
                # Add context_id column
                print("Adding context_id column...")
                conn.execute(text('ALTER TABLE rag_system.chat_sessions ADD COLUMN IF NOT EXISTS context_id INTEGER;'))
                
                print("Migration completed successfully!")
            except Exception as e:
                print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
