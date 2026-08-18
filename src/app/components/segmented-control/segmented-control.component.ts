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
    let direction: -1 | 1 | undefined;
    if (event.key === forwardKey) {
      direction = 1;
    } else if (event.key === backwardKey) {
      direction = -1;
    }

    if (direction === undefined && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    event.preventDefault();

    let nextIndex: number;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.options.length - 1;
    } else {
      nextIndex = (optionIndex + direction! + this.options.length) % this.options.length;
    }
    const nextOption = this.options[nextIndex];

    if (!nextOption) {
      return;
    }

    this.select(nextOption.value);
    this.optionInputs.get(nextIndex)?.nativeElement.focus();
  }
}
