import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppDialogComponent } from './app-dialog.component';

describe('AppDialogComponent', () => {
  let component: AppDialogComponent;
  let fixture: ComponentFixture<AppDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AppDialogComponent);
    component = fixture.componentInstance;
    component.title = 'Example dialog';
  });

  it('starts closed', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
  });

  it('opens as an accessible modal and focuses its close control', () => {
    component.description = 'An example dialog description.';
    component.size = 'large';
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

    expect(dialog.open).toBeTrue();
    expect(dialog.getAttribute('aria-labelledby')).toMatch(/^app-dialog-title-/);
    expect(dialog.getAttribute('aria-describedby')).toMatch(/^app-dialog-description-/);
    expect(dialog.classList).toContain('app-dialog--large');
    expect(document.activeElement).toBe(dialog.querySelector('[data-dialog-close]'));
  });

  it('closes from the close control and restores focus to the previous element', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const closeButton = dialog.querySelector('[data-dialog-close]') as HTMLButtonElement;
    const openChangeSpy = spyOn(component.openChange, 'emit').and.callThrough();

    closeButton.click();
    fixture.detectChanges();

    expect(component.open).toBeFalse();
    expect(dialog.open).toBeFalse();
    expect(openChangeSpy).toHaveBeenCalledWith(false);
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });

  it('closes when the Escape key or backdrop is used', () => {
    component.open = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

    dialog.dispatchEvent(new Event('cancel', {bubbles: false, cancelable: true}));
    fixture.detectChanges();
    expect(component.open).toBeFalse();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    dialog.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    fixture.detectChanges();
    expect(component.open).toBeFalse();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    dialog.close();
    expect(component.open).toBeFalse();
  });
});
