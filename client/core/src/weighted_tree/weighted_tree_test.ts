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

import { int, str, valueMap } from "../value/test_value.js";
import { node } from "../protocol/test_response.js";
import { weightedTreeNode } from '../test_responses/weighted_tree.js';
import { ValueMap } from '../value/value_map.js';
import { Tree } from './weighted_tree.js';

function name(name: string): ValueMap {
    return valueMap(
        { key: 'label_format', val: str('$(name)') },
        { key: 'name', val: str(name) },
    );
}

describe('tree test', () => {
    it('gets tree', () => {
        const tree = new Tree(weightedTreeNode);
        expect(tree).toEqual(jasmine.objectContaining({
            roots: [
                jasmine.objectContaining({
                    properties: name('root 1'),
                    totalWeight: 10,
                    children: [
                        jasmine.objectContaining({
                            properties: name('a'),
                            totalWeight: 9,
                            children: [
                                jasmine.objectContaining({
                                    properties: name('c'),
                                    totalWeight: 4,
                                }),
                                jasmine.objectContaining({
                                    properties: name('b'),
                                    totalWeight: 3,
                                }),
                            ],
                        }),
                    ],
                }),
                jasmine.objectContaining({
                    properties: name('root 2'),
                    totalWeight: 10,
                    children: [
                        jasmine.objectContaining({
                            properties: name('x'),
                            totalWeight: 4,
                            children: [
                                jasmine.objectContaining({
                                    properties: name('z'),
                                    totalWeight: 1,
                                    payloads: new Map([
                                        [
                                            'stuffing',
                                            [
                                                node(
                                                    valueMap(
                                                        { key: 'weighted_tree_datum_type', val: int(1) },
                                                        {
                                                            key: 'weighted_tree_payload_type',
                                                            val: str('stuffing')
                                                        },
                                                        { key: 'count', val: int(3) },
                                                    ),
                                                ),
                                            ],
                                        ],
                                    ]),
                                }),
                            ],
                        }),
                        jasmine.objectContaining({
                            properties: name('y'),
                            totalWeight: 2,
                        }),
                    ],
                }),
            ],
        }));
    });
});