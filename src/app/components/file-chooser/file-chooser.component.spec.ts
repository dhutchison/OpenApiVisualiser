import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FileChooserComponent } from './file-chooser.component';
import { FileUploadModule } from 'primeng/fileupload';
import { FileReaderService } from '../../services/file-reader.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('FileChooserComponent', () => {
  let component: FileChooserComponent;
  let fixture: ComponentFixture<FileChooserComponent>;

  let fileReaderService: FileReaderService;
  let loadFileSpy: jasmine.Spy;
  let fileUploadComponent;
  let clearSpy: jasmine.Spy;

  beforeEach(waitForAsync(() => {

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
      clear: () => {}
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
      const testFiles: File[] = [new File([], 'input.txt')];
      component.loadFile(
        {
          files: testFiles
        });

      expect(loadFileSpy.calls.count()).toBe(0, 'spy method was not called');
    });
  });
});
