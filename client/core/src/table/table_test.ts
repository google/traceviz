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

import { int, str, strs, valueMap } from "../value/test_value.js";
import { node } from "../protocol/test_response.js";
import { CanonicalTable, Cell, Header, Row } from "./table.js";
import { ResponseNode } from "../protocol/response_interface.js";

describe('columns test', () => {
  const nameColumn = node(valueMap(
      {key: 'category_defined_id', val: str('name')},
      {key: 'category_display_name', val: str('Name')}, {
        key: 'category_description',
        val: str('Give this name to order this scoop!')
      }));

  const colorColumn = node(valueMap(
      {key: 'category_defined_id', val: str('color')},
      {key: 'category_display_name', val: str('Color')},
      {key: 'category_description', val: str('How will you recognize it?')}));

  const flavorColumn = node(valueMap(
      {key: 'category_defined_id', val: str('flavor')},
      {key: 'category_display_name', val: str('Flavor')},
      {key: 'category_description', val: str('What will it taste like?')}));

  const labelColumn = node(valueMap(
      {key: 'category_defined_id', val: str('label')},
      {key: 'category_display_name', val: str('Label')},
      {key: 'category_description', val: str('This ice cream\'s label')}));

  const vanillaRow = node(
      valueMap(),
      node(valueMap(
          {key: 'category_ids', val: strs('name')},
          {key: 'table_cell', val: str('vanilla')})),
      node(valueMap(
          {key: 'category_ids', val: strs('color')},
          {key: 'table_cell', val: str('white')})),
      node(valueMap(
          {key: 'category_ids', val: strs('flavor')},
          {key: 'table_cell', val: str('vanilla-y')})),
      node(valueMap(
          {key: 'category_ids', val: strs('label')},
          {key: 'name', val: str('vanilla')}, {key: 'color', val: str('white')},
          {key: 'table_formatted_cell', val: str('$(name) ($(color))')})),
      node(valueMap(
          {key: 'payload_type', val: str('info box')},
          {
            key: 'label',
            val: str('Vanilla is derived from the seed pod of an orchid!')
          },
          )),
  );

  const chocolateRow = node(
      valueMap(),
      node(valueMap(
          {key: 'category_ids', val: strs('name')},
          {key: 'table_cell', val: str('chocolate')})),
      node(valueMap(
          {key: 'payload_type', val: str('info box')},
          {
            key: 'label',
            val: str(
                `'The name 'chocolate' comes from the Nahuatl, possibly as 'cacahuatl', meaning 'cocoa water'`)
          },
          )),
      node(valueMap(
          {key: 'category_ids', val: strs('color')},
          {key: 'table_cell', val: str('brown')})),
      node(valueMap(
          {key: 'category_ids', val: strs('flavor')},
          {key: 'table_cell', val: str('chocolatey')})),
      node(valueMap(
          {key: 'category_ids', val: strs('label')},
          {key: 'name', val: str('chocolate')},
          {key: 'color', val: str('brown')},
          {key: 'table_formatted_cell', val: str('$(name) ($(color))')})),
  );

  const strawberryRow = node(
      valueMap(),
      node(valueMap(
          {key: 'category_ids', val: strs('name')},
          {key: 'table_cell', val: str('strawberry')})),
      node(valueMap(
          {key: 'category_ids', val: strs('color')},
          {key: 'table_cell', val: str('pink')})),
      node(valueMap(
          {key: 'category_ids', val: strs('flavor')},
          {key: 'table_cell', val: str('berrylicious')})),
      node(valueMap(
          {key: 'category_ids', val: strs('label')},
          {key: 'name', val: str('strawberry')},
          {key: 'color', val: str('pink')},
          {key: 'table_formatted_cell', val: str('$(name) ($(color))')})),
  );

  it('throws on no columns', () => {
    expect(
        () => new CanonicalTable(
            node(valueMap(), vanillaRow, chocolateRow, strawberryRow),
            undefined, undefined, () => {}))
        .toThrow();
  });

  it('gets render properties', () => {
    const table = new CanonicalTable(
        node(
            valueMap(
                {key: 'table_row_height_px', val: int(12)},
                {key: 'table_font_size_px', val: int(8)},
                ),
            node(
                valueMap(),
                nameColumn,
                ),
            ),
        undefined, undefined, () => {});
    expect(table.renderProperties.rowHeightPx).toEqual(12);
    expect(table.renderProperties.fontSizePx).toEqual(8);
  });

  it('gets rows and columns', () => {
    const table = new CanonicalTable(
        node(
            valueMap(),
            node(
                // column definitions
                valueMap(),
                nameColumn,
                colorColumn,
                flavorColumn,
                labelColumn,
                ),
            vanillaRow, chocolateRow, strawberryRow),
        undefined, undefined, () => {});
    expect(table.columns().map(c => c.category.id)).toEqual([
      'name', 'color', 'flavor', 'label'
    ]);

    const cs = [
      new Header(nameColumn),
      new Header(colorColumn),
      new Header(flavorColumn),
      new Header(labelColumn),
    ];
    expect(table.rowSlice()).toEqual([
      new Row(vanillaRow, cs, undefined, undefined, () => {}),
      new Row(chocolateRow, cs, undefined, undefined, () => {}),
      new Row(strawberryRow, cs, undefined, undefined, () => {})
    ]);
    const thisRow = new Row(strawberryRow, cs, undefined, undefined, () => {});
    expect(thisRow.cells(table.columns()).map((cell: Cell) => cell.value))
        .toEqual([
          str('strawberry'), str('pink'), str('berrylicious'),
          str('strawberry (pink)')
        ]);
    expect(thisRow.cells(table.columns('label', 'flavor'))
               .map((cell: Cell) => cell.value))
        .toEqual([str('strawberry (pink)'), str('berrylicious')]);
    // Expect to find the row payload in vanilla.
    expect(table.rowSlice()
               .map(row => {
                 const infoBoxPayload = row.payloadsByType.get('info box');
                 if (infoBoxPayload === undefined) {
                   return [''];
                 }
                 return infoBoxPayload
                     .filter(
                         (payloadNode: ResponseNode) =>
                             payloadNode.properties.has('label'))
                     .map(
                         (payloadNode: ResponseNode) =>
                             payloadNode.properties.expectString('label'));
               })
               .reduce(
                   (prev, next) => {
                     prev.push(...next);
                     return prev;
                   },
                   new Array<string>()))
        .toEqual([
          'Vanilla is derived from the seed pod of an orchid!',
          `'The name 'chocolate' comes from the Nahuatl, possibly as 'cacahuatl', meaning 'cocoa water'`,
          ''
        ]);
  });
});
