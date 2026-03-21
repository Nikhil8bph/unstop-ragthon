import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Folder } from '../../services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class UploadComponent {
  @Input() folder?: Folder;
  @Output() uploadComplete = new EventEmitter<void>();
  
  isUploading = signal(false);
  uploadStatus = signal('');

  constructor(private apiService: ApiService) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file || !this.folder) return;

    this.isUploading.set(true);
    this.uploadStatus.set(`Uploading ${file.name}...`);

    this.apiService.uploadFile(this.folder.id, file).subscribe({
      next: (res) => {
        this.uploadStatus.set('Upload successful!');
        this.isUploading.set(false);
        this.uploadComplete.emit();
        setTimeout(() => this.uploadStatus.set(''), 3000);
      },
      error: (err) => {
        this.uploadStatus.set(`Upload failed: ${err.message}`);
        this.isUploading.set(false);
      }
    });
  }
}
