import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { LucideX } from '@lucide/angular';

export type AppDialogSize = 'small' | 'medium' | 'large';

let nextDialogId = 0;

@Component({
  selector: 'app-dialog',
  imports: [LucideX],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './app-dialog.component.html'
})
export class AppDialogComponent implements AfterViewInit, OnChanges {
  @Input() title = '';
  @Input() description?: string;
  @Input() size: AppDialogSize = 'medium';
  @Input() open = false;
  @Output() readonly openChange = new EventEmitter<boolean>();

  @ViewChild('dialog') private readonly dialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('closeButton') private readonly closeButton?: ElementRef<HTMLButtonElement>;

  readonly titleId = `app-dialog-title-${nextDialogId++}`;
  readonly descriptionId = `app-dialog-description-${nextDialogId++}`;

  private restoreFocusElement?: HTMLElement;

  ngAfterViewInit() {
    this.syncDialogState();
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.syncDialogState();
  }

  handleCancel(event: Event) {
    event.preventDefault();
    this.closeDialog();
  }

  handleNativeClose() {
    if (this.open) {
      this.open = false;
      this.openChange.emit(false);
    }

    this.restoreFocusElement?.focus();
    this.restoreFocusElement = undefined;
  }

  @HostListener('click', ['$event'])
  handleDialogClick(event: MouseEvent) {
    if (event.target === this.dialog?.nativeElement) {
      this.closeDialog();
    }
  }

  closeDialog() {
    if (!this.open && !this.dialog?.nativeElement.open) {
      return;
    }

    this.open = false;
    this.closeNativeDialog();
    this.openChange.emit(false);
  }

  private syncDialogState() {
    const dialog = this.dialog?.nativeElement;

    if (!dialog) {
      return;
    }

    if (this.open && !dialog.open) {
      this.openNativeDialog();
    } else if (!this.open && dialog.open) {
      this.closeNativeDialog();
    }
  }

  private openNativeDialog() {
    const dialog = this.dialog?.nativeElement;

    if (!dialog) {
      return;
    }

    const activeElement = document.activeElement;
    this.restoreFocusElement = activeElement instanceof HTMLElement ? activeElement : undefined;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }


    this.closeButton?.nativeElement.focus();
  }

  private closeNativeDialog() {
    const dialog = this.dialog?.nativeElement;

    if (!dialog) {
      return;
    }

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    this.restoreFocusElement?.focus();
    this.restoreFocusElement = undefined;
  }
}
