import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'treeorientation'})
export class TreeOrientationEnumPipe implements PipeTransform {
    transform(value) {
        if (value) {
            return 'horizontal';
        }
        return 'vertical';
    }
}