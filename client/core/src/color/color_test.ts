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

import {Coloring} from './color.js';
import {dbl, strs, str, valueMap} from '../value/test_value.js';

describe('color test', () => {
  it('colors', () => {
    const definitions = valueMap(
        {key: 'color_space_winners', val: strs('goldenrod', 'silver', 'gold')},
        {key: 'color_space_bandw', val: strs('#ffffff', '#000000')},
        {key: 'ratatouille', val: strs('darkmagenta', 'crimson')},
    );
    const coloring = new Coloring(definitions);
    expect(coloring.colors(valueMap(
               {key: 'primary_color', val: str('black')},
               {key: 'secondary_color_space', val: str('color_space_winners')},
               {key: 'secondary_color_space_value', val: dbl(0.5)},
               {key: 'stroke_color', val: str('white')},
               )))
        .toEqual({
          primary: 'black',
          secondary: 'rgb(192, 192, 192)',
          stroke: 'white',
        });
    expect(coloring.colors(valueMap(
               {key: 'primary_color_space', val: str('color_space_bandw')},
               {key: 'primary_color_space_value', val: dbl(0.5)},
               {key: 'secondary_color', val: str('green')},
               )))
        .toEqual({
          primary: 'rgb(128, 128, 128)',
          secondary: 'green',
          stroke: undefined,
        });
    // 'ratatouille' is not a valid color space.
    expect(() => {
      coloring.colors(valueMap(
        {key: 'primary_color_space', val: str('rataouille')},
        {key: 'primary_color_value', val: dbl(0.5)}));
    }).toThrow();
    // If we don't say, we don't say.
    expect(coloring.colors(valueMap())).toEqual({
      primary: undefined,
      secondary: undefined,
      stroke: undefined,
  });
  });
});
