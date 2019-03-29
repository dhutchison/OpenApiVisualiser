import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserPreferenceControllerService {

  horizontalView: boolean = true;

  constructor() { }
}
