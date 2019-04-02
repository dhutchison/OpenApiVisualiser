import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InputSourceComponent } from './input-source.component';
import { FileChooserComponent } from './file-chooser/file-chooser.component';
import { UrlChooserComponent } from './url-chooser/url-chooser.component';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FileReaderService } from 'src/app/services/file-reader.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InputSourceComponent', () => {
  let component: InputSourceComponent;
  let fixture: ComponentFixture<InputSourceComponent>;

  let fileReaderServiceSpy: jasmine.SpyObj<FileReaderService>;

  beforeEach(async(() => {
    const spy = jasmine.createSpyObj('FileReaderService', ['loadFileFromURL']);
    TestBed.configureTestingModule({
      declarations: [
        InputSourceComponent,

        FileChooserComponent,
        UrlChooserComponent
      ],
      imports: [
        FormsModule,
        HttpClientTestingModule,

        DialogModule,
        FileUploadModule
      ],
      providers: [
        { provide: FileReaderService, useValue: spy}
      ]
    })
    .compileComponents();

    fileReaderServiceSpy = TestBed.get(FileReaderService);
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InputSourceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
