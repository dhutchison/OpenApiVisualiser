import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppTooltipDirective } from './app-tooltip.directive';

@Component({
  template: '<button type="button" appTooltip="A <plain-text> tooltip">Hover me</button>',
  imports: [AppTooltipDirective]
})
class TooltipHostComponent {}

describe('AppTooltipDirective', () => {
  let fixture: ComponentFixture<TooltipHostComponent>;
  let button: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button');
  });

  it('associates a hidden plain-text tooltip with its host', () => {
    const tooltipId = button.getAttribute('aria-describedby');
    const tooltip = document.getElementById(tooltipId ?? '') as HTMLElement;

    expect(tooltipId).toBeTruthy();
    expect(tooltip.id).toBe(tooltipId);
    expect(tooltip.hidden).toBeTrue();
    expect(tooltip.textContent).toBe('A <plain-text> tooltip');
  });

  it('shows for pointer and keyboard focus, then hides on focusout', () => {
    const tooltip = document.getElementById(button.getAttribute('aria-describedby') ?? '') as HTMLElement;

    button.dispatchEvent(new Event('mouseenter'));
    expect(tooltip.hidden).toBeFalse();

    button.dispatchEvent(new FocusEvent('focusin'));

    button.dispatchEvent(new Event('mouseleave'));
    expect(tooltip.hidden).toBeFalse();

    button.dispatchEvent(new FocusEvent('focusout'));
    expect(tooltip.hidden).toBeTrue();
  });
});
