from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB

from .database import Base

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {'schema': 'rag_system'}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    folders = relationship("Folder", back_populates="project")
    chat_sessions = relationship("ChatSession", back_populates="project")

class Folder(Base):
    __tablename__ = "folders"
    __table_args__ = {'schema': 'rag_system'}

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("rag_system.projects.id"))
    name = Column(String)
    parent_folder_id = Column(Integer, ForeignKey("rag_system.folders.id"), nullable=True)

    project = relationship("Project", back_populates="folders")
    files = relationship("File", back_populates="folder")
    subfolders = relationship("Folder", backref="parent", remote_side=[id])

class File(Base):
    __tablename__ = "files"
    __table_args__ = {'schema': 'rag_system'}

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("rag_system.folders.id"))
    filename = Column(String)
    original_format = Column(String)
    pdf_path = Column(String, nullable=True)
    ingestion_status = Column(String, default="pending") # pending, processing, completed, error

    folder = relationship("Folder", back_populates="files")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    __table_args__ = {'schema': 'rag_system'}

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("rag_system.projects.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {'schema': 'rag_system'}

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("rag_system.chat_sessions.id"))
    role = Column(String) # user or assistant
    content = Column(Text)
    meta_data = Column("metadata", JSONB, nullable=True) # stores citations, page numbers etc

    session = relationship("ChatSession", back_populates="messages")
