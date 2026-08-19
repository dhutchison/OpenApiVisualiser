import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ExportComponent, FILE_SAVER } from './export.component';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FileReaderService } from '../../services/file-reader.service';

describe('ExportComponent', () => {
  let component: ExportComponent;
  let fixture: ComponentFixture<ExportComponent>;
  let fileReaderService: FileReaderService;
  let saveFileSpy: jasmine.Spy;

  beforeEach(waitForAsync(() => {
    saveFileSpy = jasmine.createSpy('saveFile');
    TestBed.configureTestingModule({
      imports: [
        ExportComponent,
        FormsModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: FILE_SAVER, useValue: saveFileSpy}
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportComponent);
    component = fixture.componentInstance;
    fileReaderService = TestBed.inject(FileReaderService);
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

  it('enables export only when one API definition is loaded', () => {
    expect(component.buttonEnabled).toBeFalse();

    component.apiDefinitions = [{info: {title: 'Test API'}} as any];
    expect(component.buttonEnabled).toBeTrue();

    component.apiDefinitions.push({info: {title: 'Second API'}} as any);
    expect(component.buttonEnabled).toBeFalse();
  });

  it('exports YAML and JSON files with the API title and payload', async () => {
    const api = {
      openapi: '3.1.0',
      info: {title: 'Test API', version: '1.0.0'},
      paths: {}
    } as any;
    component.apiDefinitions = [api];

    component.exportFormat = 1;
    component.export();
    expect(saveFileSpy).toHaveBeenCalledWith(jasmine.any(File));
    expect((saveFileSpy.calls.mostRecent().args[0] as File).name).toBe('Test API.yaml');
    const yamlFile = saveFileSpy.calls.mostRecent().args[0] as File;
    expect(yamlFile.type).toBe('text/plain');
    expect(await yamlFile.text()).toContain('openapi: 3.1.0');

    component.display = true;
    component.exportFormat = 2;
    component.export();
    expect(saveFileSpy.calls.count()).toBe(2);
    const jsonFile = saveFileSpy.calls.mostRecent().args[0] as File;
    expect(jsonFile.name).toBe('Test API.json');
    expect(jsonFile.type).toBe('application/json');
    expect(JSON.parse(await jsonFile.text())).toEqual(api);
    expect(component.display).toBeFalse();
  });

  it('does not export without exactly one API or with an unknown format', () => {
    component.display = true;

    component.export();
    expect(saveFileSpy).not.toHaveBeenCalled();
    expect(component.display).toBeFalse();

    component.apiDefinitions = [{info: {title: 'Test API'}} as any];
    component.display = true;
    component.exportFormat = 999;
    component.export();

    expect(saveFileSpy).not.toHaveBeenCalled();
    expect(component.display).toBeFalse();
  });

  it('resets export state when files are reset and when the dialog opens', () => {
    component.apiDefinitions = [{info: {title: 'Test API'}} as any];
    component.exportFormat = 2;
    component.showDialog();
    expect(component.exportFormat).toBe(1);
    expect(component.display).toBeTrue();

    fileReaderService.resetFiles.next();
    expect(component.apiDefinitions).toEqual([]);
  });
});
