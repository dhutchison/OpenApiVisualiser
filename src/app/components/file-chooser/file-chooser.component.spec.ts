import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FileChooserComponent } from './file-chooser.component';
import { FileReaderService } from '../../services/file-reader.service';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('FileChooserComponent', () => {
  let component: FileChooserComponent;
  let fixture: ComponentFixture<FileChooserComponent>;

  let fileReaderService: FileReaderService;
  let loadFileSpy: jasmine.Spy;

  beforeEach(waitForAsync(() => {

    TestBed.configureTestingModule({
      imports: [
        FileChooserComponent
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    // fileReaderServiceSpy = TestBed.get(FileReaderService);
    fileReaderService = TestBed.inject(FileReaderService);
    loadFileSpy = spyOn(fileReaderService, 'loadFile');

  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a native multi-file picker', () => {
    const input = fixture.nativeElement.querySelector('#file-input') as HTMLInputElement;
    const label = fixture.nativeElement.querySelector('label[for="file-input"]') as HTMLLabelElement;

    expect(input.type).toBe('file');
    expect(input.multiple).toBeTrue();
    expect(label.textContent).toContain('Import File(s)');
  });

  describe('Valid Inputs', () => {
    it('JSON file extension accepted', () => {

      const testFiles: File[] = [new File([], 'input.json')];
      component.loadFile(
        {
          files: testFiles
        });

      expect(loadFileSpy.calls.count()).toBe(1, 'spy method was called once');
    });

    it('YAML file extension accepted, as a target', () => {
      const testFiles: File[] = [new File([], 'input.yaml')];
      component.loadFile(
        {
          target: {
            files: testFiles
          }
        });

      expect(loadFileSpy.calls.count()).toBe(1, 'spy method was called once');
    });

    it('YAML "yml" file extension accepted, as a target', () => {
      const testFiles: File[] = [new File([], 'input.yml')];
      component.loadFile(
        {
          target: {
            files: testFiles
          }
        });

      expect(loadFileSpy.calls.count()).toBe(1, 'spy method was called once');
    });

    it('Multiple files accepted', () => {
      const testFiles: File[] = [
        new File([], 'input.json'),
        new File([], 'input.yaml')
      ];
      component.loadFile({files: testFiles});

      expect(loadFileSpy.calls.count()).toBe(2, 'spy method was called twice');
    });
  });

  describe('Invalid Inputs', () => {
    it('txt file extension rejected', () => {
      const testFiles: File[] = [new File([], 'input.txt')];
      component.loadFile(
        {
          files: testFiles
        });

      expect(loadFileSpy.calls.count()).toBe(0, 'spy method was not called');
    });
  });
});
