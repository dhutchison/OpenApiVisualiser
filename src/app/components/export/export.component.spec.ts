import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ExportComponent } from './export.component';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ExportComponent', () => {
  let component: ExportComponent;
  let fixture: ComponentFixture<ExportComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ExportComponent,
        FormsModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close the export dialog', () => {
    component.apiDefinitions = [{ info: { title: 'Test API' } } as any];
    component.showDialog();
    fixture.detectChanges(false);

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.querySelector('h2')?.textContent).toContain('Export');

    component.display = true;
    component.export();
    expect(component.display).toBeFalse();
  });
});
