import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Project {
  id: number;
  name: string;
  created_at: string;
}

export interface Folder {
  id: number;
  project_id: number;
  name: string;
  parent_folder_id?: number;
}

export interface FileResponse {
  id: number;
  folder_id: number;
  filename: string;
  original_format: string;
  ingestion_status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projects/`);
  }

  createProject(name: string): Observable<Project> {
    console.log('ApiService: Creating project', name);
    return this.http.post<Project>(`${this.apiUrl}/projects/`, { name });
  }

  getFolders(projectId: number): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.apiUrl}/projects/${projectId}/folders/`);
  }

  createFolder(name: string, projectId: number, parentFolderId?: number): Observable<Folder> {
    console.log('ApiService: Creating folder', name, 'for project', projectId);
    return this.http.post<Folder>(`${this.apiUrl}/folders/`, {
      name,
      project_id: projectId,
      parent_folder_id: parentFolderId
    });
  }

  uploadFile(folderId: number, file: File): Observable<FileResponse> {
    console.log('ApiService: Uploading file', file.name, 'to folder', folderId);
    const formData = new FormData();
    formData.append('folder_id', folderId.toString());
    formData.append('file', file);
    return this.http.post<FileResponse>(`${this.apiUrl}/files/upload/`, formData);
  }

  getFiles(folderId: number): Observable<FileResponse[]> {
    return this.http.get<FileResponse[]>(`${this.apiUrl}/folders/${folderId}/files/`);
  }

  deleteProject(projectId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${projectId}`);
  }

  updateProject(projectId: number, name: string): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/projects/${projectId}`, { name });
  }

  deleteFolder(folderId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/folders/${folderId}`);
  }

  deleteFile(fileId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/files/${fileId}`);
  }

  renameFile(fileId: number, name: string): Observable<FileResponse> {
    const formData = new FormData();
    formData.append('filename', name);
    return this.http.patch<FileResponse>(`${this.apiUrl}/files/${fileId}`, formData);
  }

  getFileUrl(fileId: number): string {
    return `${this.apiUrl}/files/${fileId}/content`;
  }

  getFileBlob(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/files/${fileId}/content`, { responseType: 'blob' });
  }

  queryChat(options: { 
    message: string, 
    projectId?: number, 
    folderId?: number, 
    sessionId?: number 
  }): Observable<any> {
    console.log('ApiService: Querying chat', options.message);
    return this.http.post<any>(`${this.apiUrl}/chat/query/`, {
      message: options.message,
      project_id: options.projectId,
      folder_id: options.folderId,
      session_id: options.sessionId
    });
  }

  getChatSessions(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/projects/${projectId}/chat/sessions/`);
  }

  getChatHistory(sessionId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/chat/sessions/${sessionId}/messages/`);
  }
}
