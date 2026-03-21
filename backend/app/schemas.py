from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any

class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class FolderBase(BaseModel):
    name: str
    project_id: int
    parent_folder_id: Optional[int] = None

class FolderCreate(FolderBase):
    pass

class Folder(FolderBase):
    id: int
    
    class Config:
        from_attributes = True

class FileResponse(BaseModel):
    id: int
    folder_id: int
    filename: str
    original_format: str
    ingestion_status: str

    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    role: str
    content: str
    meta_data: Optional[Any] = None

class ChatMessageCreate(ChatMessageBase):
    session_id: int

class ChatMessage(ChatMessageBase):
    id: int
    session_id: int

    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    project_id: int

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSession(ChatSessionBase):
    id: int
    created_at: datetime
    messages: List[ChatMessage] = []

    class Config:
        from_attributes = True
