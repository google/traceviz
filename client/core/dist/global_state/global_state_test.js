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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { str } from '../value/test_value.js';
import { StringValue } from '../value/value.js';
import { GlobalState } from './global_state.js';
describe('global state test', () => {
    it('sets, gets, and complains as expected', () => {
        const gs = new GlobalState();
        // Subscribe to gs, updating keysAdded with each update.
        let keysAdded = [];
        const unsubscribe = new Subject();
        gs.pipe(takeUntil(unsubscribe)).subscribe((keys) => {
            keysAdded = keys;
        });
        expect(keysAdded).toEqual([]);
        expect(() => gs.get('count')).toThrow();
        // Set a global value, expect an update.
        const sv = str('howdy');
        gs.set('greetings', sv);
        expect(keysAdded).toEqual(['greetings']);
        // Adding the same key a second time should fail.
        expect(() => {
            gs.set('greetings', str('oops'));
        }).toThrow();
        // Ensure that the Value fetched with 'get' is the same as that originally
        // set.
        const got = gs.get('greetings');
        expect(got instanceof StringValue).toBeTrue();
        const gotSv = got;
        expect(gotSv.val).toEqual('howdy');
        sv.val = 'welcome';
        expect(gotSv.val).toEqual('welcome');
        unsubscribe.next();
        unsubscribe.complete();
    });
});
//# sourceMappingURL=global_state_test.js.map