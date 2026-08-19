import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SegmentedControlComponent, SegmentedControlOption } from './segmented-control.component';

describe('SegmentedControlComponent', () => {
  let component: SegmentedControlComponent;
  let fixture: ComponentFixture<SegmentedControlComponent>;

  const options: SegmentedControlOption[] = [
    {label: 'Tree', value: 'tree'},
    {label: 'List', value: 'list'},
    {label: 'Table', value: 'table'}
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentedControlComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentedControlComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'View mode');
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', 'tree');
    fixture.detectChanges();
  });

  it('renders a labelled radiogroup with the selected option', () => {
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]') as HTMLElement;
    const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;

    expect(group.getAttribute('aria-label')).toBe('View mode');
    expect(radios).toHaveSize(3);
    expect(radios[0].checked).toBeTrue();
    expect(radios[1].checked).toBeFalse();
    expect(radios[0].parentElement?.textContent).toContain('Tree');
  });

  it('emits a new value when an option is selected', () => {
    const valueChange = jasmine.createSpy('valueChange');
    component.valueChange.subscribe(valueChange);

    const listRadio = fixture.nativeElement.querySelectorAll('input[type="radio"]')[1] as HTMLInputElement;
    listRadio.click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith('list');
    expect(component.value).toBe('list');
    expect(listRadio.checked).toBeTrue();
  });

  it('supports vertical orientation and arrow-key navigation', () => {
    fixture.componentRef.setInput('orientation', 'vertical');
    fixture.detectChanges();

    const group = fixture.nativeElement.querySelector('[role="radiogroup"]') as HTMLElement;
    const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    radios[0].focus();
    radios[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    fixture.detectChanges();

    expect(group.getAttribute('aria-orientation')).toBe('vertical');
    expect(component.value).toBe('list');
    expect(document.activeElement).toBe(radios[1]);
  });

  it('uses horizontal arrow keys for horizontal orientation', () => {
    const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    radios[0].focus();
    radios[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    expect(component.value).toBe('tree');

    radios[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(component.value).toBe('list');
  });
});
