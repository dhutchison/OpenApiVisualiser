import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UrlChooserComponent } from './url-chooser.component';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FileReaderService } from 'src/app/services/file-reader.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('UrlChooserComponent', () => {
  let component: UrlChooserComponent;
  let fixture: ComponentFixture<UrlChooserComponent>;

  let fileReaderService: FileReaderService;
  let loadFileFromURLSpy: jasmine.Spy;

  beforeEach(async(() => {

    TestBed.configureTestingModule({
      declarations: [
        UrlChooserComponent
      ],
      imports: [
        FormsModule,
        HttpClientTestingModule,

        DialogModule
      ]
    })
    .compileComponents();

    fileReaderService = TestBed.get(FileReaderService);
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

    expect(component.display).toBeTruthy();
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
