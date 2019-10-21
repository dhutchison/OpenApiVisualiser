import { MarkdownifyPipe } from './markdownify.pipe';

describe('MarkdownifyPipe', () => {

  let pipe: MarkdownifyPipe;

  beforeEach(() => {
    pipe = new MarkdownifyPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('Unformated string is unchanged, except wrapped in p tags', () => {
    const input = 'This is a string withour any markdown formatting';
    const output = '<p>' + input + '</p>\n';
    expect(pipe.transform(input)).toEqual(output);
  });

  it('String with links is correctly formatted', () => {
    const input = 'and the [ISO 4217](http://en.wikipedia.org/wiki/ISO_4217) currency code';
    const output = '<p>and the <a href="http://en.wikipedia.org/wiki/ISO_4217">ISO 4217</a> currency code</p>\n';
    expect(pipe.transform(input)).toEqual(output);
  });

  it('Undefined value results in an empty string', () => {
    const input = undefined;
    const output = '';
    expect(pipe.transform(input)).toEqual(output);
  });
});
