import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FileChooserComponent } from './file-chooser.component';
import { FileUploadModule } from 'primeng/fileupload';
import { FileReaderService } from '../../services/file-reader.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

/**
 * Helper function for checking if a file extension is accepted or not
 * @param component the component under test
 * @param loadFileSpy the load file spy to check if it was called or not.
 * @param filename the filename to check if accepted
 * @param allowed boolean indicating if the filename should be accepted (true) or not (false)
 */
function checkFileExtensionAccepted(component: FileChooserComponent, loadFileSpy: jasmine.Spy, filename: string, allowed: boolean) {
  const testFiles: File[] = [new File([], filename)];
  component.loadFile(
    {
      files: testFiles
    });

  if (allowed) {
    expect(loadFileSpy.calls.count()).toBe(1, 'spy method was called once');
  } else {
    expect(loadFileSpy.calls.count()).toBe(0, 'spy method was not called');
  }
}

describe('FileChooserComponent', () => {
  let component: FileChooserComponent;
  let fixture: ComponentFixture<FileChooserComponent>;

  let fileReaderService: FileReaderService;
  let loadFileSpy: jasmine.Spy;
  let fileUploadComponent;
  let clearSpy: jasmine.Spy;

  beforeEach(async(() => {

    TestBed.configureTestingModule({
      declarations: [
        FileChooserComponent
      ],
      imports: [
        FileUploadModule,
        HttpClientTestingModule
      ]
    })
    .compileComponents();

    // fileReaderServiceSpy = TestBed.get(FileReaderService);
    fileReaderService = TestBed.inject(FileReaderService);
    loadFileSpy = spyOn(fileReaderService, 'loadFile');

    fileUploadComponent = {
      clear() {}
    };
    clearSpy = spyOn(fileUploadComponent, 'clear');

  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Valid Inputs', () => {
    it('JSON file extension accepted', () => {
      checkFileExtensionAccepted(component, loadFileSpy, 'input.json', true);
    });

    it('YAML file extension accepted, as a target', () => {
      checkFileExtensionAccepted(component, loadFileSpy, 'input.yaml', true);
    });

    it('YAML "yml" file extension accepted, as a target', () => {
      checkFileExtensionAccepted(component, loadFileSpy, 'input.yml', true);
    });

    it('Multiple files accepted', () => {
      const testFiles: File[] = [
        new File([], 'input.json'),
        new File([], 'input.yaml')
      ];
      component.loadFile(
        {
          files: testFiles
        }, fileUploadComponent);

      expect(loadFileSpy.calls.count()).toBe(2, 'spy method was called twice');

      expect(clearSpy.calls.count()).toBe(1, 'clear method on file upload component was called');
    });
  });

  describe('Invalid Inputs', () => {
    it('txt file extension rejected', () => {
      checkFileExtensionAccepted(component, loadFileSpy, 'input.txt', false);
    });
  });
});
