import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FileChooserComponent } from './file-chooser.component';
import { FileReaderService } from '../../services/file-reader.service';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('FileChooserComponent', () => {
  let component: FileChooserComponent;
  let fixture: ComponentFixture<FileChooserComponent>;

  let fileReaderService: FileReaderService;
  let loadFilesSpy: jasmine.Spy;

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
    loadFilesSpy = spyOn(fileReaderService, 'loadFiles');

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
    expect(input.accept).toBe('.yaml,.yml,.json');
    expect(label.textContent).toContain('Import File(s)');
  });

  describe('Valid Inputs', () => {
    it('JSON file extension accepted', () => {

      const testFiles: File[] = [new File([], 'input.json')];
      component.loadFile(
        {
          files: testFiles
        });

      expect(loadFilesSpy.calls.count()).toBe(1);
      expect(loadFilesSpy.calls.mostRecent().args[0]).toEqual(testFiles);
    });

    it('YAML file extension accepted, as a target', () => {
      const testFiles: File[] = [new File([], 'input.yaml')];
      component.loadFile(
        {
          target: {
            files: testFiles
          }
        });

      expect(loadFilesSpy.calls.count()).toBe(1);
      expect(loadFilesSpy.calls.mostRecent().args[0]).toEqual(testFiles);
    });

    it('YAML "yml" file extension accepted, as a target', () => {
      const testFiles: File[] = [new File([], 'input.yml')];
      component.loadFile(
        {
          target: {
            files: testFiles
          }
        });

      expect(loadFilesSpy.calls.count()).toBe(1);
      expect(loadFilesSpy.calls.mostRecent().args[0]).toEqual(testFiles);
    });

    it('Multiple files accepted', () => {
      const testFiles: File[] = [
        new File([], 'input.json'),
        new File([], 'input.yaml')
      ];
      component.loadFile({files: testFiles});

      expect(loadFilesSpy.calls.count()).toBe(1);
      expect(loadFilesSpy.calls.mostRecent().args[0]).toEqual(testFiles);
    });
  });

  describe('Invalid Inputs', () => {
    it('txt file extension rejected', () => {
      spyOn(globalThis, 'alert');
      const testFiles: File[] = [new File([], 'input.txt')];
      component.loadFile(
        {
          files: testFiles
        });

      expect(loadFilesSpy.calls.count()).toBe(0, 'spy method was not called');
      expect(globalThis.alert).toHaveBeenCalled();
    });

    it('processes supported files when a selection also contains an unsupported file', () => {
      spyOn(globalThis, 'alert');
      const testFiles: File[] = [
        new File([], 'input.txt'),
        new File([], 'input.json')
      ];

      component.loadFile({files: testFiles});

      expect(loadFilesSpy.calls.count()).toBe(1);
      expect(loadFilesSpy.calls.mostRecent().args[0]).toEqual([testFiles[1]]);
      expect(globalThis.alert).toHaveBeenCalledWith(
        'You are trying to upload an unsupported file extension (input.txt). Please choose either a .yaml, .yml, or .json file.'
      );
    });

    it('clears the native input after every selection', () => {
      const input = fixture.nativeElement.querySelector('#file-input') as HTMLInputElement;
      const testFiles: File[] = [new File([], 'input.json')];

      component.loadFile({target: input, files: testFiles});

      expect(input.value).toBe('');
    });
  });
});
