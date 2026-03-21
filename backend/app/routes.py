import os
from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile, Form, HTTPException
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from . import models, schemas, database, rag

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(name=project.name)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/projects/", response_model=List[schemas.Project])
def get_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()

@router.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Cascade delete folders/files in DB (handled by relationship in models typically, but we'll do manual if needed)
    # Also would need to delete from vectorstore for all files in this project
    # For now, let's just delete the project and its files from vectorstore
    files = db.query(models.File).join(models.Folder).filter(models.Folder.project_id == project_id).all()
    for f in files:
        try:
            rag.vectorstore.delete(where={"file_id": str(f.id)})
        except:
            pass
            
    db.delete(db_proj)
    db.commit()
    return {"message": "Project deleted"}

@router.patch("/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db_proj.name = project.name
    db.commit()
    db.refresh(db_proj)
    return db_proj

@router.post("/folders/", response_model=schemas.Folder)
def create_folder(folder: schemas.FolderCreate, db: Session = Depends(get_db)):
    # Validate project exists
    db_proj = db.query(models.Project).filter(models.Project.id == folder.project_id).first()
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db_folder = models.Folder(name=folder.name, project_id=folder.project_id, parent_folder_id=folder.parent_folder_id)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Delete all files in this folder from vectorstore
    files = db.query(models.File).filter(models.File.folder_id == folder_id).all()
    for f in files:
        try:
            rag.vectorstore.delete(where={"file_id": str(f.id)})
        except:
            pass
            
    db.delete(db_folder)
    db.commit()
    return {"message": "Folder deleted"}

@router.get("/projects/{project_id}/folders/", response_model=List[schemas.Folder])
def get_folders(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Folder).filter(models.Folder.project_id == project_id).all()

@router.post("/chat/sessions/", response_model=schemas.ChatSession)
def create_chat_session(session: schemas.ChatSessionCreate, db: Session = Depends(get_db)):
    db_session = models.ChatSession(project_id=session.project_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/projects/{project_id}/chat/sessions/", response_model=List[schemas.ChatSession])
def get_chat_sessions(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.ChatSession).filter(models.ChatSession.project_id == project_id).all()

@router.get("/chat/sessions/{session_id}/messages/", response_model=List[schemas.ChatMessage])
def get_chat_history(session_id: int, db: Session = Depends(get_db)):
    return db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).order_by(models.ChatMessage.id).all()

class ChatQuery(BaseModel):
    message: str
    project_id: Optional[int] = None
    folder_id: Optional[int] = None
    session_id: Optional[int] = None

@router.post("/chat/query/")
def query_chat(query: ChatQuery, db: Session = Depends(get_db)):
    try:
        # 1. Get or Create Session
        if query.session_id:
            db_session = db.query(models.ChatSession).filter(models.ChatSession.id == query.session_id).first()
            if not db_session:
                db_session = models.ChatSession(project_id=query.project_id)
                db.add(db_session)
                db.commit()
                db.refresh(db_session)
        else:
            db_session = models.ChatSession(project_id=query.project_id)
            db.add(db_session)
            db.commit()
            db.refresh(db_session)

        # 2. Save User Message
        user_msg = models.ChatMessage(session_id=db_session.id, role="user", content=query.message)
        db.add(user_msg)
        db.commit()
        
        # 3. Perform RAG
        results = []
        context_text = ""
        try:
            results = rag.query_rag(
                query.message,
                project_id=str(query.project_id) if query.project_id else None,
                folder_id=str(query.folder_id) if query.folder_id else None
            )
            context_text = "\n\n".join([doc.page_content for doc in results])
        except Exception as e:
            print(f"RAG query failed: {e}")
            context_text = ""
        
        # 4. Get History
        history = db.query(models.ChatMessage).filter(
            models.ChatMessage.session_id == db_session.id
        ).order_by(models.ChatMessage.id.desc()).limit(10).all()
        history.reverse()
        
        history_str = ""
        for h in history[:-1]:
            history_str += f"{h.role.capitalize()}: {h.content}\n"
            
        if context_text:
            system_prompt = f"You are a helpful AI assistant. Use the following context to answer the user's question.\n\nCONTEXT:\n{context_text}\n\nCHAT HISTORY:\n{history_str}"
        else:
            system_prompt = f"You are a helpful AI assistant. Answer the user's question to the best of your ability.\n\nCHAT HISTORY:\n{history_str}"
        
        # 5. Call LLM
        from langchain_ollama import ChatOllama
        from langchain_core.messages import HumanMessage, SystemMessage
        
        llm = ChatOllama(model="qwen3-vl:4b", base_url=rag.OLLAMA_BASE_URL)
        
        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=query.message)
            ])
            answer = response.content
        except Exception as e:
            answer = f"I encountered an error connecting to the AI model: {str(e)}. Please ensure Ollama is running with the qwen3-vl:4b model."
        
        # 6. Save Assistant Message
        assistant_msg = models.ChatMessage(session_id=db_session.id, role="assistant", content=answer)
        db.add(assistant_msg)
        db.commit()

        return {
            "answer": answer,
            "session_id": db_session.id,
            "citations": [{"content": r.page_content, "metadata": r.metadata} for r in results]
        }
    except Exception as e:
        print(f"Chat query error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.post("/files/upload/", response_model=schemas.FileResponse)
async def upload_file(
    folder_id: int = Form(...),
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db)
):
    # Verify folder exists
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    original_format = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    # Create file record in DB as pending
    db_file = models.File(
        folder_id=folder_id,
        filename=file.filename,
        original_format=original_format,
        ingestion_status='processing'
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    try:
        content = await file.read()
        
        # Save file to local storage
        file_path = f"storage/{db_file.id}_{file.filename}"
        with open(os.path.join("d:/Project/Unstop/Ragthon Hackathon/backend", file_path), "wb") as f:
            f.write(content)
        
        db_file.pdf_path = file_path
        db.commit()

        text_content = ""
        
        # Handling supported formats
        chunks_to_ingest = []
        base_metadata = {
            "project_id": str(db_folder.project_id),
            "folder_id": str(folder_id),
            "file_id": str(db_file.id),
            "filename": file.filename
        }

        content_bytes = bytes(content)
        
        if original_format in ['txt', 'md']:
            try:
                text_content = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                text_content = content_bytes.decode('latin-1')
            chunks_to_ingest.append({"text": text_content, "metadata": base_metadata})
        elif original_format == 'pdf':
            pdf_pages = rag.extract_text_from_pdf(content)
            for p in pdf_pages:
                meta = base_metadata.copy()
                meta["page"] = p["page"]
                chunks_to_ingest.append({"text": p["text"], "metadata": meta})
        elif original_format == 'docx':
            text_content = rag.extract_text_from_docx(content_bytes)
            chunks_to_ingest.append({"text": text_content, "metadata": base_metadata})
            # Attempt conversion for viewing
            try:
                from docx2pdf import convert
                pdf_output = os.path.join("d:/Project/Unstop/Ragthon Hackathon/backend/storage", f"{db_file.id}_converted.pdf")
                convert(os.path.join("d:/Project/Unstop/Ragthon Hackathon/backend", db_file.pdf_path), pdf_output)
                db_file.pdf_path = f"storage/{db_file.id}_converted.pdf"
                db_file.original_format = 'pdf' # Treat as PDF for viewer
            except Exception as e:
                print(f"Docx conversion failed: {e}")
        elif original_format == 'pptx':
            text_content = rag.extract_text_from_pptx(content)
            chunks_to_ingest.append({"text": text_content, "metadata": base_metadata})
        elif original_format == 'csv':
            text_content = rag.extract_text_from_csv(content)
            chunks_to_ingest.append({"text": text_content, "metadata": base_metadata})
        elif original_format in ['png', 'jpg', 'jpeg']:
            text_analysis = rag.analyze_image(content_bytes)
            chunks_to_ingest.append({"text": text_analysis, "metadata": base_metadata})
        else:
            db_file.ingestion_status = f'error - format .{original_format} not supported yet'
            db.commit()
            raise HTTPException(status_code=400, detail=f"Unsupported format: {original_format}")

        # Ingest chunks
        if chunks_to_ingest:
            rag.ingest_document_chunks(chunks_to_ingest)
        
        db_file.ingestion_status = 'completed'
        db.commit()
        db.refresh(db_file)
        
        return db_file
    except Exception as e:
        db_file.ingestion_status = f'error - {str(e)}'
        db.commit()
        db.refresh(db_file)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/folders/{folder_id}/files/", response_model=List[schemas.FileResponse])
def get_folder_files(folder_id: int, db: Session = Depends(get_db)):
    return db.query(models.File).filter(models.File.folder_id == folder_id).all()

@router.get("/files/{file_id}/content")
def get_file_content(file_id: int, db: Session = Depends(get_db)):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = os.path.join("d:/Project/Unstop/Ragthon Hackathon/backend", db_file.pdf_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File content missing on server")
    
    # Set CORS headers explicitly so blob fetch works from any local origin
    return FastAPIFileResponse(
        file_path,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache"
        }
    )

@router.delete("/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete from vectorstore
    try:
        rag.vectorstore.delete(where={"file_id": str(file_id)})
    except Exception as e:
        print(f"Error deleting from vectorstore: {e}")
        
    # Delete local file if it exists
    file_path = os.path.join("d:/Project/Unstop/Ragthon Hackathon/backend", db_file.pdf_path)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    db.delete(db_file)
    db.commit()
    return {"message": "File deleted"}

@router.patch("/files/{file_id}", response_model=schemas.FileResponse)
def rename_file(file_id: int, filename: str = Form(...), db: Session = Depends(get_db)):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    db_file.filename = filename
    db.commit()
    db.refresh(db_file)
    return db_file
