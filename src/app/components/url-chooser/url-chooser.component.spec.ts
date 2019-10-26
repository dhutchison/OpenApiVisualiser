import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UrlChooserComponent } from './url-chooser.component';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FileReaderService } from 'src/app/services/file-reader.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('UrlChooserComponent', () => {
  let component: UrlChooserComponent;
  let fixture: ComponentFixture<UrlChooserComponent>;

  let fileReaderServiceSpy: jasmine.SpyObj<FileReaderService>;

  beforeEach(async(() => {
    const spy = jasmine.createSpyObj('FileReaderService', ['loadFileFromURL']);

    TestBed.configureTestingModule({
      declarations: [
        UrlChooserComponent
      ],
      imports: [
        FormsModule,
        HttpClientTestingModule,

        DialogModule
      ],
      providers: [
        { provide: FileReaderService, useValue: spy}
      ]
    })
    .compileComponents();

    fileReaderServiceSpy = TestBed.get(FileReaderService);
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UrlChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
