import os
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base
import app.models

print("Creating database tables if they do not exist...")
Base.metadata.create_all(bind=engine)
print("Finished setting up database tables.")
