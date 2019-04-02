import { TestBed, getTestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { FileReaderService } from './file-reader.service';

describe('FileReaderService', () => {
    let injector: TestBed;
    let service: FileReaderService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [FileReaderService]
      });
      injector = getTestBed();
      service = injector.get(FileReaderService);
      httpMock = injector.get(HttpTestingController);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    afterEach(() => {
      httpMock.verify();
    });
});
