/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
*/

import 'jasmine';

import { ConfigurationError, Severity } from './errors.js';

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
