import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  Type,
  ViewChildren
} from '@angular/core';

export interface SegmentedControlOption {
  label: string;
  value: string;
  icon?: Type<unknown>;
}

export type SegmentedControlOrientation = 'horizontal' | 'vertical';

let nextSegmentedControlId = 0;

@Component({
  selector: 'app-segmented-control',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './segmented-control.component.html',
  styleUrls: ['./segmented-control.component.scss']
})
export class SegmentedControlComponent {

  @Input() label = '';
  @Input() name = `segmented-control-${nextSegmentedControlId++}`;
  @Input() options: SegmentedControlOption[] = [];
  @Input() orientation: SegmentedControlOrientation = 'horizontal';
  @Input() value = '';

  @Output() readonly valueChange = new EventEmitter<string>();

  @ViewChildren('optionInput') private readonly optionInputs!: QueryList<ElementRef<HTMLInputElement>>;

  select(value: string) {
    this.value = value;
    this.valueChange.emit(value);
  }

  handleKeydown(event: KeyboardEvent, optionIndex: number) {
    const forwardKey = this.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const backwardKey = this.orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const direction = event.key === forwardKey ? 1 : event.key === backwardKey ? -1 : undefined;

    if (direction === undefined && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    event.preventDefault();

    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? this.options.length - 1
        : (optionIndex + direction + this.options.length) % this.options.length;
    const nextOption = this.options[nextIndex];

    if (!nextOption) {
      return;
    }

    this.select(nextOption.value);
    this.optionInputs.get(nextIndex)?.nativeElement.focus();
  }
}
