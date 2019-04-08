import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceSlash'
})
export class StringReplacePipe implements PipeTransform {

  transform(value: string): string {
    // having to convert this to string to ensure that can call replace()
    return value.replace(/\//g, '_');
  }

}
