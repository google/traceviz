import 'jasmine';

import {Duration} from './duration';

function dur(nanos: number): Duration {
  return new Duration(nanos);
}

describe('duration test', () => {

  it('compares', () => {
    expect(dur(100).cmp(dur(200))).toBeLessThan(0);
    expect(dur(100).cmp(dur(100))).toEqual(0);
    expect(dur(200).cmp(dur(100))).toBeGreaterThan(0);
  });
  it('formats as string', () => {
    expect(new Duration(500).toString()).toEqual('500ns');
    expect(new Duration(-500).toString()).toEqual('-500ns');
    expect(new Duration(5000).toString()).toEqual('5.000μs');
    expect(new Duration(-5000).toString()).toEqual('-5.000μs');
    expect(new Duration(50000000).toString()).toEqual('50.000ms');
    expect(new Duration(-50000000).toString()).toEqual('-50.000ms');
    expect(new Duration(3000000000).toString()).toEqual('3.000s');
    expect(new Duration(-3000000000).toString()).toEqual('-3.000s');
    expect(new Duration(180000000000).toString()).toEqual('3.000m');
    expect(new Duration(-180000000000).toString()).toEqual('-3.000m');
    expect(new Duration(12600000000000).toString()).toEqual('3.500h');
    expect(new Duration(-12600000000000).toString()).toEqual('-3.500h');
  });
});
