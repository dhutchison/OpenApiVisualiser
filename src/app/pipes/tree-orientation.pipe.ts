import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'treeOrientation'
})
export class TreeOrientationPipe implements PipeTransform {

  transform(value: boolean): string {
    if (value) {
      return 'horizontal';
    }
    return 'vertical';
  }

}
