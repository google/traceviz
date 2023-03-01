import 'jasmine';

import {ConfigurationError, Severity} from './errors';

describe('errors test', () => {
  it('converts to string', () => {
    expect(new ConfigurationError('oops')
               .at(Severity.ERROR)
               .from('here')
               .toString())
        .toEqual('[ERROR] (here) oops');

    // When no source is provided, none is printed.
    expect(new ConfigurationError('oops 2').at(Severity.WARNING).toString())
        .toEqual('[WARNING] oops 2');

    // When no severity is provided, WARNING is used.
    expect(new ConfigurationError('oops 3').toString())
        .toEqual('[WARNING] oops 3');
  });
});
