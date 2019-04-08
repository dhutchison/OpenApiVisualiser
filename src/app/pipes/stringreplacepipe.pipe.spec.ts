import { StringReplacePipe } from './stringreplacepipe.pipe';

describe('StringreplacepipePipe', () => {

  let pipe: StringReplacePipe;

  beforeEach(() => {
    pipe = new StringReplacePipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('replace works as expected', () => {
    expect(pipe.transform('/my/path/to/convert')).toEqual('_my_path_to_convert');
  });
});
