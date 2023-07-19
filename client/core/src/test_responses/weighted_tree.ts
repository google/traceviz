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

import {int, str, valueMap} from '../value/test_value.js';
import {node} from '../protocol/test_response.js';

/**
 * A response node containing a weighted tree, renderable as a flame chart.
 */
export const weightedTreeNode=node(
    valueMap({key: 'weighted_tree_frame_height_px', val: int(20)}),
    node(
        valueMap(
            {key: 'self_magnitude', val: int(1)},
            {key: 'label_format', val: str('$(name)')},
            {key: 'name', val: str('root 1')},
        ),
        node(
            valueMap(
                {key: 'self_magnitude', val: int(2)},
                {key: 'label_format', val: str('$(name)')},
                {key: 'name', val: str('a')},
            ),
            node(
                valueMap(
                    {key: 'self_magnitude', val: int(4)},
                    {key: 'label_format', val: str('$(name)')},
                    {key: 'name', val: str('c')},
                ),
            ),
            node(
                valueMap(
                    {key: 'self_magnitude', val: int(3)},
                    {key: 'label_format', val: str('$(name)')},
                    {key: 'name', val: str('b')},
                ),
            ),
        ),
    ),
    node(
        valueMap(
            {key: 'self_magnitude', val: int(4)},
            {key: 'label_format', val: str('$(name)')},
            {key: 'name', val: str('root 2')},
        ),
        node(
            valueMap(
                {key: 'self_magnitude', val: int(3)},
                {key: 'label_format', val: str('$(name)')},
                {key: 'name', val: str('x')},
            ),
            node(
                valueMap(
                    {key: 'self_magnitude', val: int(1)},
                    {key: 'label_format', val: str('$(name)')},
                    {key: 'name', val: str('z')},
                ),
            ),
        ),
        node(
            valueMap(
                {key: 'self_magnitude', val: int(2)},
                {key: 'label_format', val: str('$(name)')},
                {key: 'name', val: str('y')},
            ),
        ),
    ),
);
