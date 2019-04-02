import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FileChooserComponent } from './file-chooser.component';
import { FileUploadModule } from 'primeng/fileupload';
import { FileReaderService } from 'src/app/services/file-reader.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('FileChooserComponent', () => {
  let component: FileChooserComponent;
  let fixture: ComponentFixture<FileChooserComponent>;

  let fileReaderServiceSpy: jasmine.SpyObj<FileReaderService>;

  beforeEach(async(() => {
    const spy = jasmine.createSpyObj('FileReaderService', ['loadFile']);
    TestBed.configureTestingModule({
      declarations: [
        FileChooserComponent
      ],
      imports: [
        FileUploadModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: FileReaderService, useValue: spy }
      ]
    })
    .compileComponents();

    fileReaderServiceSpy = TestBed.get(FileReaderService);
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
