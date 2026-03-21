import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Project, Folder, FileResponse } from '../../services/api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {
  projects = signal<Project[]>([]);
  folders = signal<Folder[]>([]);
  files = signal<FileResponse[]>([]);
  
  @Output() projectSelected = new EventEmitter<Project>();
  @Output() folderSelected = new EventEmitter<Folder>();
  @Output() fileSelected = new EventEmitter<FileResponse>();

  @Output() openRename = new EventEmitter<{type: 'project' | 'folder' | 'file', item: any}>();
  @Output() openDelete = new EventEmitter<{type: 'project' | 'folder' | 'file', item: any}>();

  selectedProjectId?: number;
  selectedFolderId?: number;
  selectedFileId?: number;

  showProjectInput = false;
  newProjectName = '';
  showFolderInput = false;
  newFolderName = '';

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.apiService.getProjects().subscribe({
      next: projs => this.projects.set(projs),
      error: err => console.error('Failed to load projects', err)
    });
  }

  onSelectProject(project: Project) {
    this.selectedProjectId = project.id;
    this.projectSelected.emit(project);
    this.apiService.getFolders(project.id).subscribe(fols => {
      this.folders.set(fols);
    });
  }

  onSelectFolder(folder: Folder) {
    this.selectedFolderId = folder.id;
    this.folderSelected.emit(folder);
    this.apiService.getFiles(folder.id).subscribe(fols => {
      this.files.set(fols);
    });
  }

  onSelectFile(file: FileResponse) {
    this.selectedFileId = file.id;
    this.fileSelected.emit(file);
  }

  refreshFiles() {
    if (this.selectedFolderId) {
      this.apiService.getFiles(this.selectedFolderId).subscribe(files => {
        this.files.set(files);
      });
    }
  }

  toggleProjectInput() {
    this.showProjectInput = !this.showProjectInput;
    if (this.showProjectInput) this.newProjectName = '';
  }

  confirmCreateProject() {
    if (this.newProjectName.trim()) {
      this.apiService.createProject(this.newProjectName).subscribe({
        next: (newProj) => {
          this.projects.set([...this.projects(), newProj]);
          this.showProjectInput = false;
          this.newProjectName = '';
        },
        error: (err) => alert('Failed to create project: ' + err.message)
      });
    }
  }

  toggleFolderInput() {
    this.showFolderInput = !this.showFolderInput;
    if (this.showFolderInput) this.newFolderName = '';
  }

  confirmCreateFolder() {
    if (!this.selectedProjectId) return;
    if (this.newFolderName.trim()) {
      this.apiService.createFolder(this.newFolderName.trim(), this.selectedProjectId).subscribe({
        next: (newFol) => {
          this.folders.set([...this.folders(), newFol]);
          this.showFolderInput = false;
          this.newFolderName = '';
        },
        error: (err) => alert('Failed to create folder: ' + err.message)
      });
    }
  }

  deleteProject(event: Event, project: Project) {
    event.stopPropagation();
    this.openDelete.emit({ type: 'project', item: project });
  }

  deleteFolder(event: Event, folder: Folder) {
    event.stopPropagation();
    this.openDelete.emit({ type: 'folder', item: folder });
  }

  deleteFile(event: Event, file: FileResponse) {
    event.stopPropagation();
    this.openDelete.emit({ type: 'file', item: file });
  }

  renameProject(event: Event, project: Project) {
    event.stopPropagation();
    this.openRename.emit({ type: 'project', item: project });
  }

  renameFolder(event: Event, folder: Folder) {
    event.stopPropagation();
    this.openRename.emit({ type: 'folder', item: folder });
  }

  renameFile(event: Event, file: FileResponse) {
    event.stopPropagation();
    this.openRename.emit({ type: 'file', item: file });
  }
}
