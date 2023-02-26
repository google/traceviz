import 'jasmine';

import {Timestamp} from './timestamp';
import {Duration} from '../duration/duration';

describe('timestamp test', () => {
  it('converts to a Date', () => {
    const t = new Timestamp(123456789, 0); // Thu Nov 29 1973 13:33:09 GMT-0800
    expect(t.toDate()).toEqual(new Date(1973, 10, 29, 13, 33, 9, 0));
  });

  it('adds a duration', () => {
    const t = new Timestamp(0, 0);
    expect(t.add(new Duration(1000000))).toEqual(new Timestamp(0, 1000000));
  });
});
