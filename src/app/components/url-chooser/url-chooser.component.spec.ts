import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UrlChooserComponent } from './url-chooser.component';
import { FileReaderService } from '../../services/file-reader.service';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('UrlChooserComponent', () => {
  let component: UrlChooserComponent;
  let fixture: ComponentFixture<UrlChooserComponent>;

  let fileReaderService: FileReaderService;
  let loadFileFromURLSpy: jasmine.Spy;

  beforeEach(waitForAsync(() => {

    TestBed.configureTestingModule({
      imports: [
        UrlChooserComponent
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fileReaderService = TestBed.inject(FileReaderService);
    loadFileFromURLSpy = spyOn(fileReaderService, 'loadFileFromURL');
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UrlChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set dialog to be shown', () => {
    component.showDialog();
    fixture.detectChanges(false);

    expect(component.display).toBeTruthy();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.querySelector('h2')?.textContent).toContain('Import from URL');
  });

  it('should import from url', () => {
    component.url = 'https://google.com';
    component.import();

    /* Check call to import from url occurs */
    expect(loadFileFromURLSpy.calls.count()).toBe(1);

    /* Check state is reset back */
    expect(component.url).toBeUndefined();
    expect(component.display).toBeFalsy();

  });
});
