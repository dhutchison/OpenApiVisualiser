import { Pipe, PipeTransform } from '@angular/core';
import { Parser, HtmlRenderer } from 'commonmark';

/**
 * Pipe implementation which converts a Markdown (commonmark) formatted string into HTML.
 */
@Pipe({
  name: 'markdownify'
})
export class MarkdownifyPipe implements PipeTransform {

  transform(value: string, args?: any): string {
    /* Parse the description in to the AST */
    const parser = new Parser({smart: true});
    const parsedValue = parser.parse(value);

    /* Render the description */
    const renderer = new HtmlRenderer();
    const renderedValue = renderer.render(parsedValue);

    return renderedValue;
  }

}
