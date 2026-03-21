import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("No DATABASE_URL found")
    exit(1)

# Remove the schema option for the initial connection to create it
base_url = database_url.split("?")[0]

try:
    conn = psycopg2.connect(base_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute("CREATE SCHEMA IF NOT EXISTS rag_system;")
    print("Successfully created/verified schema 'rag_system'")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error creating schema: {e}")
