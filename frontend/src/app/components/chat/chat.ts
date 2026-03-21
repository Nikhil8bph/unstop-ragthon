import { Component, Input, signal, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService, Project, Folder } from '../../services/api.service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnChanges {
  @Input() project?: Project;
  @Input() folder?: Folder;

  messages = signal<Message[]>([]);
  userInput = '';
  isTyping = signal(false);
  sessionId?: number;

  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  private isNearBottom = true;

  constructor(private apiService: ApiService, private sanitizer: DomSanitizer) {}

  onScroll() {
    if (!this.chatContainer) return;
    const el = this.chatContainer.nativeElement;
    const threshold = 150; // pixels from bottom to consider 'near'
    const position = el.scrollTop + el.offsetHeight;
    const height = el.scrollHeight;
    this.isNearBottom = (height - position) <= threshold;
  }

  private scrollToBottomIfNear() {
    if (this.isNearBottom && this.chatContainer) {
      try {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      } catch(err) {}
    }
  }

  private forceScrollToBottom() {
    this.isNearBottom = true;
    setTimeout(() => this.scrollToBottomIfNear(), 50);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.project) {
      this.loadLatestSession();
    } else {
      this.messages.set([]);
      this.sessionId = undefined;
    }
  }

  /** Converts basic markdown to safe HTML */
  renderMarkdown(text: string): SafeHtml {
    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Headings: ###, ##, #
      .replace(/^### (.+)$/gm, '<h5 class="mt-3 mb-1 fw-bold text-info" style="font-size:0.9rem;">$1</h5>')
      .replace(/^## (.+)$/gm, '<h4 class="mt-3 mb-1 fw-bold text-info">$1</h4>')
      .replace(/^# (.+)$/gm, '<h3 class="mt-3 mb-1 fw-bold text-light">$1</h3>')
      // Bold+italic ***
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      // Bold **
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-light">$1</strong>')
      // Italic *
      .replace(/\*(.+?)\*/g, '<em class="text-info-emphasis">$1</em>')
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<code class="px-1 rounded" style="background:rgba(255,255,255,0.1);font-size:0.85em;">$1</code>')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" class="text-info">$1</a>')
      // Unordered lists: - item or * item
      .replace(/^\s*[-\*] (.+)$/gm, '<li class="mb-1">$1</li>')
      // Numbered lists: 1. item
      .replace(/^\s*\d+\. (.+)$/gm, '<li class="mb-1">$1</li>')
      // Horizontal rule
      .replace(/^---+$/gm, '<hr style="border-color:rgba(255,255,255,0.1);">')
      // Wrap consecutive <li> in <ul>
      .replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, (match) => `<ul class="ps-3 my-1">${match}</ul>`)
      // Line breaks (double newline = paragraph, single = <br>)
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>');

    html = `<p class="mb-2">${html}</p>`;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  loadLatestSession() {
    this.apiService.getChatSessions(this.project!.id).subscribe(sessions => {
      if (sessions.length > 0) {
        const latest = sessions[sessions.length - 1];
        this.sessionId = latest.id;
        this.loadHistory(latest.id);
      } else {
        this.messages.set([]);
        this.sessionId = undefined;
      }
    });
  }

  loadHistory(sessionId: number) {
    this.apiService.getChatHistory(sessionId).subscribe(history => {
      const msgs: Message[] = history.map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content
      }));
      this.messages.set(msgs);
      this.forceScrollToBottom();
    });
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    const userMessage: Message = { role: 'user', content: this.userInput };
    this.messages.set([...this.messages(), userMessage]);
    this.forceScrollToBottom();

    const queryPost = {
      message: this.userInput,
      project_id: this.project?.id,
      folder_id: this.folder?.id,
      session_id: this.sessionId
    };

    this.userInput = '';
    this.isTyping.set(true);

    this.apiService.queryChat({
      message: queryPost.message,
      projectId: queryPost.project_id,
      folderId: queryPost.folder_id,
      sessionId: queryPost.session_id
    }).subscribe({
      next: (res) => {
        this.sessionId = res.session_id;
        const assistantMessage: Message = {
          role: 'assistant',
          content: res.answer
        };
        this.messages.set([...this.messages(), assistantMessage]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottomIfNear(), 50);
      },
      error: (err) => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: `⚠️ Error: ${err.error?.detail || err.message}`
        };
        this.messages.set([...this.messages(), assistantMessage]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottomIfNear(), 50);
      }
    });
  }
}
