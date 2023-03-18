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

import { ValueMapDirective } from './value.directive';
import { keyedValue, value, intLit, intsLit, intSetLit, globalRef, localRef, strLit, strsLit, strSetLit } from './test_value';
import { str, strs, strSet, int, ints, intSet } from 'traceviz-client-core';
import { ValueMap, IntegerValue, StringValue, Value } from 'traceviz-client-core';
import { testAppCoreService } from '../app_core_service/test_app_core_service';

describe('value directives test', () => {
  it('creates string Value from literal', () => {
    const val = value(strLit('hello'));
    expect(val.get(undefined)).toEqual(str('hello'));
  });

  it('creates string list Value from literal', () => {
    const val = value(strsLit('hello', 'goodbye'));
    expect(val.get(undefined))
      .toEqual(strs('hello', 'goodbye'));
  });

  it('creates string set Value from literal', () => {
    const val = value(strSetLit('a', 'b', 'c'));
    expect(val.get(undefined)).toEqual(strSet('a', 'b', 'c'));
  });

  it('creates int Value from literal', () => {
    const val = value(intLit(100));
    expect(val.get(undefined)).toEqual(int(100));
  });

  it('creates int list Value from literal', () => {
    const val = value(intsLit(100, 200));
    expect(val.get(undefined)).toEqual(ints(100, 200));
  });

  it('creates int set Value from literal', () => {
    const val = value(intSetLit(300, 100, 200));
    expect(val.get(undefined)).toEqual(intSet(100, 200, 300));
  });

  it('references local Values properly', () => {
    const localVal = str('hello');
    const localState = new ValueMap(new Map([
      ['greeting', localVal],
    ]));
    const val = value(localRef('greeting'));
    const gotVal = val.get(localState) as StringValue;
    // Expect the value we got from the wrapper to have 'hello'.
    expect(gotVal.val).toEqual('hello');
    // Expect a change to the local value to reflect in the got value.
    localVal.val = 'goodbye';
    expect(gotVal.val).toEqual('goodbye');
    // Expect a change to the got value to reflect in the local value.
    gotVal.val = 'hello again';
    expect(localVal.val).toEqual('hello again');
  });

  it('references global Values properly', () => {
    const appCoreService = testAppCoreService();
    const globalVal = int(3);
    appCoreService.appCore.globalState.set('weight', globalVal);

    const val = value(globalRef(appCoreService, 'weight'));
    const gotVal = val.get(undefined) as IntegerValue;
    // Expect the value we got from the wrapper to have 'hello'.
    expect(gotVal.val).toEqual(3);
    // Expect a change to the local value to reflect in the got value.
    globalVal.val = 1;
    expect(gotVal.val).toEqual(1);
    // Expect a change to the got value to reflect in the local value.
    gotVal.val = 2;
    expect(globalVal.val).toEqual(2);
  });

  it('builds a value map', () => {
    const valueMap = new ValueMapDirective();
    valueMap.valueWrappers.reset([
      keyedValue('weight', intLit(100)),
      keyedValue('greetings', strLit('hello')),
    ]);
    expect(valueMap.getValueMap()).toEqual(new ValueMap(new Map<string, Value>([
      ['weight', int(100)],
      ['greetings', str('hello')],
    ])));
  });

  it('throws on a GlobalRef without a GlobalState', () => {
    const appCoreService = testAppCoreService();
    expect(() => {
      const val = value(globalRef(appCoreService, 'missing'));
    }).toThrow();
  });
});
