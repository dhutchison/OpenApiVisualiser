import { TreeOrientationPipe } from './tree-orientation.pipe';

describe('TreeOrientationPipe', () => {

  let pipe: TreeOrientationPipe;

  beforeEach(() => {
    pipe = new TreeOrientationPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('Valid Inputs', () => {
    it('should return horizontal for true', () => {
      expect(pipe.transform(true)).toEqual('horizontal');
    });

    it('should return vertical for false', () => {
      expect(pipe.transform(false)).toEqual('vertical');
    });

  });
});
