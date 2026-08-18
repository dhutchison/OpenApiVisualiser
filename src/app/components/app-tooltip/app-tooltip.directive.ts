import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges, inject } from '@angular/core';

let nextTooltipId = 0;

@Directive({
  selector: '[appTooltip]'
})
export class AppTooltipDirective implements AfterViewInit, OnChanges, OnDestroy {

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  @Input() appTooltip = '';

  @HostBinding('class.app-tooltip-host')
  readonly tooltipHostClass = true;

  @HostBinding('attr.aria-describedby')
  readonly tooltipId = `app-tooltip-${nextTooltipId++}`;

  private tooltipElement?: HTMLElement;
  private pointerOver = false;
  private focused = false;

  ngAfterViewInit() {
    this.tooltipElement = this.renderer.createElement('span');
    this.renderer.addClass(this.tooltipElement, 'app-tooltip');
    this.renderer.setAttribute(this.tooltipElement, 'id', this.tooltipId);
    this.renderer.setAttribute(this.tooltipElement, 'role', 'tooltip');
    this.renderer.setProperty(this.tooltipElement, 'hidden', true);
    this.renderer.appendChild(this.document.body, this.tooltipElement);
    this.updateTooltipText();
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.updateTooltipText();
  }

  ngOnDestroy() {
    if (this.tooltipElement) {
      this.renderer.removeChild(this.document.body, this.tooltipElement);
    }
  }

  @HostListener('mouseenter')
  showTooltip() {
    this.pointerOver = true;
    this.updateVisibility();
  }

  @HostListener('mouseleave')
  hideTooltip() {
    this.pointerOver = false;
    this.updateVisibility();
  }

  @HostListener('focusin')
  focusTooltip() {
    this.focused = true;
    this.updateVisibility();
  }

  @HostListener('focusout')
  blurTooltip() {
    this.focused = false;
    this.updateVisibility();
  }

  private updateTooltipText() {
    if (this.tooltipElement) {
      this.renderer.setProperty(this.tooltipElement, 'textContent', this.appTooltip);
    }
  }

  private updateVisibility() {
    if (this.tooltipElement) {
      this.renderer.setProperty(this.tooltipElement, 'hidden', !this.appTooltip || (!this.pointerOver && !this.focused));

      if (this.appTooltip && (this.pointerOver || this.focused)) {
        const hostRect = this.host.nativeElement.getBoundingClientRect();
        const tooltip = this.tooltipElement;
        const treeView = this.host.nativeElement.closest('.tree-view') as HTMLElement | null;
        const boundary = treeView?.getBoundingClientRect() ?? {
          left: 0,
          top: 0,
          right: this.document.documentElement.clientWidth,
          bottom: this.document.documentElement.clientHeight
        };
        const padding = 8;
        const initialLeft = hostRect.left + hostRect.width / 2;
        const initialTop = hostRect.top;

        this.renderer.setStyle(tooltip, 'max-height', `${Math.max(0, boundary.bottom - boundary.top - padding * 2)}px`);
        this.renderer.setStyle(tooltip, 'left', `${initialLeft}px`);
        this.renderer.setStyle(tooltip, 'top', `${initialTop}px`);

        const tooltipRect = tooltip.getBoundingClientRect();
        const minLeft = boundary.left + padding;
        const maxLeft = Math.max(minLeft, boundary.right - padding - tooltipRect.width);
        const minTop = boundary.top + padding;
        const maxTop = Math.max(minTop, boundary.bottom - padding - tooltipRect.height);
        const adjustedLeft = Math.min(Math.max(tooltipRect.left, minLeft), maxLeft);
        const adjustedTop = Math.min(Math.max(tooltipRect.top, minTop), maxTop);

        this.renderer.setStyle(tooltip, 'left', `${initialLeft + adjustedLeft - tooltipRect.left}px`);
        this.renderer.setStyle(tooltip, 'top', `${initialTop + adjustedTop - tooltipRect.top}px`);
      }
    }
  }
}
