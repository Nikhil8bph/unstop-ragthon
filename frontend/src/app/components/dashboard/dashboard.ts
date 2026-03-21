import { Component, signal, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar';
import { ChatComponent } from '../chat/chat';
import { UploadComponent } from '../upload/upload';
import { AppPdfViewerComponent } from '../pdf-viewer/pdf-viewer';
import { ApiService, Project, Folder, FileResponse } from '../../services/api.service';

export interface ModalData {
  type: 'project' | 'folder' | 'file';
  action: 'rename' | 'delete';
  item: any;
  newName?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent, ChatComponent, UploadComponent, AppPdfViewerComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  selectedProject = signal<Project | undefined>(undefined);
  selectedFolder = signal<Folder | undefined>(undefined);
  selectedFile = signal<FileResponse | undefined>(undefined);
  
  @ViewChild(SidebarComponent) sidebar!: SidebarComponent;

  pdfUrl = signal<string | undefined>(undefined);
  pdfPage = signal<number>(1);

  // Modal State
  activeModal = signal<ModalData | undefined>(undefined);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const pId = params.get('projectId');
      const fId = params.get('folderId');
      const fileIdStr = params.get('fileId');

      const projectId = pId ? +pId : undefined;
      const folderId = fId ? +fId : undefined;
      const fileId = fileIdStr ? +fileIdStr : undefined;

      // Reset states initially or when jumping back
      if (!projectId) {
        this.selectedProject.set(undefined);
        this.selectedFolder.set(undefined);
        this.selectedFile.set(undefined);
        this.pdfUrl.set(undefined);
        if (this.sidebar) {
          this.sidebar.selectedProjectId = undefined;
          this.sidebar.selectedFolderId = undefined;
          this.sidebar.selectedFileId = undefined;
          this.sidebar.folders.set([]);
          this.sidebar.files.set([]);
        }
      }

      if (projectId) {
        if (this.sidebar) this.sidebar.selectedProjectId = projectId;
        
        this.apiService.getProjects().subscribe(projs => {
          const p = projs.find(x => x.id === projectId);
          if (p) this.selectedProject.set(p);
        });
        
        // Load folders if project changed
        this.apiService.getFolders(projectId).subscribe(fols => {
           if (this.sidebar) {
             this.sidebar.selectedProjectId = projectId;
             this.sidebar.folders.set(fols);
           }
        });
      }

      if (folderId) {
        if (this.sidebar) this.sidebar.selectedFolderId = folderId;
        
        this.apiService.getFolders(projectId!).subscribe(fols => {
          const f = fols.find(x => x.id === folderId);
          if (f) this.selectedFolder.set(f);
        });
        
        this.apiService.getFiles(folderId).subscribe(files => {
           if (this.sidebar) {
             this.sidebar.selectedFolderId = folderId;
             this.sidebar.files.set(files);
           }
        });
      }

      if (fileId) {
        if (this.sidebar) this.sidebar.selectedFileId = fileId;
        
        this.apiService.getFiles(folderId!).subscribe(files => {
          const f = files.find(x => x.id === fileId);
          if (f) {
            this.onFileSelected(f);
            if (this.sidebar) this.sidebar.selectedFileId = fileId;
          }
        });
      }
    });
  }

  onProjectSelected(project: Project) {
    this.selectedProject.set(project);
    this.selectedFolder.set(undefined);
    this.selectedFile.set(undefined);
    this.pdfUrl.set(undefined);
    
    // Update sidebar state implicitly
    if (this.sidebar) {
      this.sidebar.selectedProjectId = project.id;
      this.sidebar.selectedFolderId = undefined;
      this.sidebar.selectedFileId = undefined;
    }
    
    this.router.navigate(['/project', project.id]);
  }

  onFolderSelected(folder: Folder) {
    this.selectedFolder.set(folder);
    this.selectedFile.set(undefined);
    this.pdfUrl.set(undefined);
    
    if (this.sidebar) {
      this.sidebar.selectedFolderId = folder.id;
      this.sidebar.selectedFileId = undefined;
    }

    this.router.navigate(['/project', this.selectedProject()?.id, 'folder', folder.id]);
  }

  onFileSelected(file: FileResponse) {
    this.selectedFile.set(file);
    if (this.sidebar) {
      this.sidebar.selectedFileId = file.id;
    }
    if (this.pdfUrl()?.startsWith('blob:')) {
      URL.revokeObjectURL(this.pdfUrl()!);
    }
    const directUrl = this.apiService.getFileUrl(file.id);
    this.pdfUrl.set(directUrl);
    this.pdfPage.set(1);
  }

  openRenameModal(event: {type: 'project' | 'folder' | 'file', item: any}) {
    this.activeModal.set({ type: event.type, action: 'rename', item: event.item, newName: event.item.name || event.item.filename });
  }

  openDeleteModal(event: {type: 'project' | 'folder' | 'file', item: any}) {
    this.activeModal.set({ type: event.type, action: 'delete', item: event.item });
  }

  closeModal() {
    this.activeModal.set(undefined);
  }

  confirmModalAction() {
    const modal = this.activeModal();
    if (!modal) return;

    if (modal.action === 'rename') {
      const name = modal.newName || '';
      if (modal.type === 'project') {
        this.apiService.updateProject(modal.item.id, name).subscribe(() => this.finishModal());
      } else if (modal.type === 'file') {
        this.apiService.renameFile(modal.item.id, name).subscribe(() => this.finishModal());
      } else {
        this.finishModal();
      }
    } else if (modal.action === 'delete') {
      if (modal.type === 'project') {
        this.apiService.deleteProject(modal.item.id).subscribe(() => this.finishModal(true));
      } else if (modal.type === 'folder') {
        this.apiService.deleteFolder(modal.item.id).subscribe(() => this.finishModal(true));
      } else if (modal.type === 'file') {
        this.apiService.deleteFile(modal.item.id).subscribe(() => this.finishModal(true));
      }
    }
  }

  private finishModal(wasDelete = false) {
    this.closeModal();
    if (this.sidebar) this.sidebar.loadProjects();
    if (wasDelete) {
      this.router.navigate(['/']);
    }
  }

  closePdf() {
    if (this.pdfUrl()?.startsWith('blob:')) {
      URL.revokeObjectURL(this.pdfUrl()!);
    }
    this.pdfUrl.set(undefined);
    this.selectedFile.set(undefined);
  }

  onUploadComplete() {
    if (this.sidebar) this.sidebar.refreshFiles();
  }
}
