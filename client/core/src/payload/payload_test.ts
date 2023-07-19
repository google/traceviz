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

import {node} from '../protocol/test_response.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {children} from './payload.js';
import {int, str, valueMap} from '../value/test_value.js';

describe('payload test', () => {
  it('extracts payloads and children', () => {
    const n=node(
      valueMap(),
      node(valueMap(
        {key: 'index', val: int(1)},
      )),
      node(valueMap(
        {key: 'payload_type', val: str('detail')},
        {key: 'name', val: str('egg')},
      )),
      node(valueMap(
        {key: 'index', val: int(2)},
      )),
      node(valueMap(
        {key: 'payload_type', val: str('stats')},
        {key: 'mean', val: int(4)},
      )),
      node(valueMap(
        {key: 'payload_type', val: str('detail')},
        {key: 'color', val: str('brown')},
      )),
      node(valueMap(
        {key: 'index', val: int(3)},
      )),
    );
    expect(children(n)).toEqual({
      structural: [
        node(valueMap(
          {key: 'index', val: int(1)},
        )),
        node(valueMap(
          {key: 'index', val: int(2)},
        )),
        node(valueMap(
          {key: 'index', val: int(3)},
        )),
      ],
      payload: new Map<string, ResponseNode[]>([
        [
          'detail',
          [
            node(valueMap(
              {key: 'payload_type', val: str('detail')},
              {key: 'name', val: str('egg')},
            )),
            node(valueMap(
              {key: 'payload_type', val: str('detail')},
              {key: 'color', val: str('brown')},
            )),
          ],
        ],
        [
          'stats',
          [
            node(valueMap(
              {key: 'payload_type', val: str('stats')},
              {key: 'mean', val: int(4)},
            )),
          ]
        ]
      ]),
    });
  });
});
