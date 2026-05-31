import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserPreferenceControllerService {

  horizontalView = true;

  joinNodesWithNoLeaves = true;

  apiPathSortOrder: 'default' | 'asc' | 'desc' = 'default';

  constructor() { }
}
