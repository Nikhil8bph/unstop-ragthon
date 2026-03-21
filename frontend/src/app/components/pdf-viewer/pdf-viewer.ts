import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pdf-container h-100 d-flex flex-column" style="background:#1a1a22;">
      <!-- Toolbar -->
      <div class="flex-shrink-0 d-flex align-items-center px-3 gap-2 border-bottom border-secondary"
           style="height:46px; background:#0f0f1a;">
        <i class="bi bi-file-earmark-pdf text-danger"></i>
        <span class="text-light small fw-semibold flex-grow-1 text-truncate">{{ filename }}</span>
        <a *ngIf="src" [href]="src" target="_blank" class="btn btn-sm btn-outline-secondary py-0 px-2" title="Open in new tab">
          <i class="bi bi-box-arrow-up-right"></i>
        </a>
        <button class="btn btn-sm btn-outline-danger py-0 px-2" title="Close viewer" (click)="close.emit()">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-grow-1 position-relative overflow-hidden bg-secondary">
        <!-- PDF via embed (often more robust than iframe for direct URLs) -->
        <embed *ngIf="src && !isImage()"
          [src]="iframeSrc"
          type="application/pdf"
          class="w-100 h-100 border-0"
          style="display:block;">

        <!-- Image -->
        <div *ngIf="src && isImage()" class="w-100 h-100 overflow-auto p-2 d-flex align-items-start justify-content-center">
          <img [src]="src" class="img-fluid shadow rounded" style="max-width:100%;">
        </div>

        <!-- Empty state -->
        <div *ngIf="!src" class="h-100 d-flex align-items-center justify-content-center">
          <div class="text-center opacity-50">
            <i class="bi bi-file-earmark-pdf display-4 d-block mb-2 text-secondary"></i>
            <p class="small text-secondary">Select a document to preview</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display:block; height:100%; }`]
})
export class AppPdfViewerComponent implements OnChanges {
  @Input() src?: string;
  @Input() filename?: string;
  @Input() page: number = 1;
  @Output() close = new EventEmitter<void>();

  iframeSrc?: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src'] && this.src) {
      this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.src);
    }
  }

  isImage(): boolean {
    if (!this.filename) return false;
    const ext = this.filename.split('.').pop()?.toLowerCase() ?? '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  }
}
