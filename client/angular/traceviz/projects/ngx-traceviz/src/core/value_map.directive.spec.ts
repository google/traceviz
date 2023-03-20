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

import { ValueMapDirective } from './value_map.directive';
import { keyedValue, intLit, strLit } from './test_value';
import { str, int } from 'traceviz-client-core';
import { ValueMap, Value } from 'traceviz-client-core';
import { testAppCoreService } from '../app_core_service/test_app_core_service';

describe('value map directives test', () => {
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
});
