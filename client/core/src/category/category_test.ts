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

import {node} from '../protocol/test_response.js';
import {str, strs, valueMap} from '../value/test_value.js';

import {Category, CategorySet, getDefinedCategory} from './category.js';

describe('categories test', () => {
  it('handles category sets', () => {
    const response = node(
        valueMap(),
        node(
            valueMap(),  // category definitions
            node(valueMap(
                {key: 'category_defined_id', val: str('cars')},
                {key: 'category_display_name', val: str('Cars')},
                {key: 'category_description', val: str('Personal vehicles')},
                )),
            node(valueMap(
                {key: 'category_defined_id', val: str('trucks')},
                {key: 'category_display_name', val: str('Trucks')},
                {key: 'category_description', val: str('Work vehicles')},
                )),
            node(valueMap(
                {key: 'category_defined_id', val: str('buses')},
                {key: 'category_display_name', val: str('Buses')},
                {
                  key: 'category_description',
                  val: str('Public transportation')
                },
                )),
            ),
        node(valueMap(
            {key: 'name', val: str('sedan')},
            {key: 'category_ids', val: strs('cars')},
            )),
        node(valueMap(
            {key: 'name', val: str('van')},
            {key: 'category_ids', val: strs('cars', 'trucks')},
            )),
        node(valueMap(
            {key: 'name', val: str('shuttle')},
            {key: 'category_ids', val: strs('buses')},
            )),
    );
    const cats = new Array<Category>();
    for (const categoryDefinition of response.children[0].children) {
      cats.push(getDefinedCategory(categoryDefinition.properties)!);
    }
    const catSet = new CategorySet(...cats);
    expect(catSet.getTaggedCategories(response.children[1].properties)
               .map(cat => cat.id))
        .toEqual(['cars']);
    expect(catSet.getTaggedCategories(response.children[2].properties)
               .map(cat => cat.id))
        .toEqual(['cars', 'trucks']);
    expect(catSet.getTaggedCategories(response.children[3].properties)
               .map(cat => cat.id))
        .toEqual(['buses']);
  });
  it('handles nested categories', () => {
    const response = node(
        valueMap(
            {key: 'category_defined_id', val: str('vehicles')},
            {key: 'category_display_name', val: str('Vehicles')},
            {key: 'category_description', val: str('Modes of transportation')}),
        node(
            valueMap(
                {key: 'category_defined_id', val: str('road_vehicles')},
                {key: 'category_display_name', val: str('Road Vehicles')}, {
                  key: 'category_description',
                  val: str('Land vehicles for road use')
                }),
            node(
                valueMap(
                    {key: 'category_defined_id', val: str('cars')},
                    {key: 'category_display_name', val: str('Cars')}, {
                      key: 'category_description',
                      val: str('Personal transport vehicles')
                    }),
                ),
            ));
    expect(getDefinedCategory(response.properties)).toEqual({
      id: 'vehicles',
      displayName: 'Vehicles',
      description: 'Modes of transportation',
    });
    expect(getDefinedCategory(response.children[0].properties)).toEqual({
      id: 'road_vehicles',
      displayName: 'Road Vehicles',
      description: 'Land vehicles for road use',
    });
    expect(getDefinedCategory(response.children[0].children[0].properties))
        .toEqual({
          id: 'cars',
          displayName: 'Cars',
          description: 'Personal transport vehicles',
        });
  });
});
