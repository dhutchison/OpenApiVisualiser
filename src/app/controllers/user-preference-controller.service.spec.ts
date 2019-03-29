import { TestBed } from '@angular/core/testing';

import { UserPreferenceControllerService } from './user-preference-controller.service';

describe('UserPreferenceControllerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: UserPreferenceControllerService = TestBed.get(UserPreferenceControllerService);
    expect(service).toBeTruthy();
  });
});
