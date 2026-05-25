import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StringReplacePipe } from './stringreplacepipe.pipe';
import { TreeOrientationPipe } from './tree-orientation.pipe';
import { MarkdownifyPipe } from './markdownify.pipe';

@NgModule({
  imports: [
    CommonModule,
    MarkdownifyPipe,
    StringReplacePipe,
    TreeOrientationPipe
  ],
  exports: [
    MarkdownifyPipe,
    StringReplacePipe,
    TreeOrientationPipe
  ]
})
export class PipesModule { }
