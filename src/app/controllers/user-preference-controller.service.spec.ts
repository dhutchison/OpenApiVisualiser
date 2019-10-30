import { TestBed } from '@angular/core/testing';

import { UserPreferenceControllerService } from './user-preference-controller.service';

describe('UserPreferenceControllerService', () => {

  let service: UserPreferenceControllerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.get(UserPreferenceControllerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('Default value should be set', () => {
    expect(service.horizontalView).toBeTruthy();
  });

  it('Value should change', () => {
    service.horizontalView = false;
    expect(service.horizontalView).toBeFalsy();
  });


});
