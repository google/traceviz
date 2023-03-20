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

/** @fileoverview Tools for working with tabular data. */

import { Category, CategorySet, getDefinedCategory } from '../category/category.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { HighlightableItem } from '../highlightable_item/highlightable_item.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { EmptyValue, StringValue, Value } from '../value/value.js';
import { ValueMap } from '../value/value_map.js';

const SOURCE = 'table';

enum Keys {
  CELL = 'table_cell',
  FORMATTED_CELL = 'table_formatted_cell',
  PAYLOAD = 'table_payload',
}

/** A table cell. */
export class Cell extends HighlightableItem {
  readonly payloadsByType: ReadonlyMap<string, ResponseNode>;
  constructor(node: ResponseNode, readonly column: Header) {
    super(node);
    const payloadsByType = new Map<string, ResponseNode>();
    for (const child of node.children) {
      if (child.properties.has(Keys.PAYLOAD)) {
        payloadsByType.set(child.properties.expectString(Keys.PAYLOAD), child);
      } else {
        throw new ConfigurationError(`cell node children may only be payloads`).from(SOURCE).at(Severity.ERROR);
      }
    }
    this.payloadsByType = payloadsByType;
  }

  get value(): Value {
    if (this.properties.has(Keys.FORMATTED_CELL)) {
      return new StringValue(this.properties.format(
        this.properties.expectString(Keys.FORMATTED_CELL)));
    }
    if (this.properties.has(Keys.CELL)) {
      return this.properties.get(Keys.CELL);
    }
    return new EmptyValue();
  }
}

/** An empty table cell. */
export class EmptyCell extends Cell {
  constructor(column: Header) {
    super({ properties: new ValueMap(), children: [] }, column);
  }

  override get value(): Value {
    return new EmptyValue();
  }
}

/** A table row. */
export class Row extends HighlightableItem {
  private readonly cellsByColumnID: ReadonlyMap<string, Cell>;
  readonly payloadsByType: ReadonlyMap<string, ResponseNode>;

  constructor(node: ResponseNode, columns: Header[]) {
    const cellsByColumnID = new Map<string, Cell>();
    const payloadsByType = new Map<string, ResponseNode>();
    super(node, (child: ResponseNode) => {
      if (child.properties.has(Keys.PAYLOAD)) {
        payloadsByType.set(child.properties.expectString(Keys.PAYLOAD), child);
        return undefined;
      } else {
        const categorySet =
          new CategorySet(...columns.map(col => col.category));
        const cats = categorySet.getTaggedCategories(child.properties);
        if (cats.length === 0) {
          return;
        }
        if (cats.length > 1) {
          throw new ConfigurationError(`Cells may only belong to one column`).from(SOURCE).at(Severity.ERROR);
        }
        const column = columns.find(col => col.category === cats[0])!;
        const cell = new Cell(child, column);
        cellsByColumnID.set(column.category.id, cell);
        return cell;
      }
    });
    this.cellsByColumnID = cellsByColumnID;
    this.payloadsByType = payloadsByType;
  }

  /**
   * Returns an array of cells for this row, given the provided columns.  If the
   * row is missing a column, an EmptyCell is returned for that column.  Only
   * cells associated with the provided columns are returned; the row may define
   * cells associated with other columns, but these will not be returned.
   */
  cells(columns: readonly Header[]): Cell[] {
    return columns.map((column: Header): Cell => {
      const cell = this.cellsByColumnID.get(column.category.id);
      if (cell) {
        return cell;
      }
      return new EmptyCell(column);
    });
  }
}

/** A Table Column Header */
export class Header {
  readonly properties: ValueMap;
  readonly category: Category;

  constructor(node: ResponseNode) {
    this.properties = node.properties;
    const category = getDefinedCategory(this.properties);
    if (!category) {
      throw new ConfigurationError(`Expected a column definition but got none!`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    this.category = category;
  }
}

/**
 * A canonical table, arranged as a hierarchy of ResponseNodes:
 *
 *   * table
 *     * repeated Columns
 *     * repeated Rows
 *       * repeated Cells
 *
 * Each Column's properties must include Keys.COLUMN, which identifies the
 * string column ID, as well as a string display name and description.  Each
 * Cell must also include Keys.COLUMN, specifying the ID of the column to which
 * it belongs, and either Keys.CELL or Keys.FORMATTED_CELL,
 * specifying the display value of the cell; the latter is formatted before
 * displaying.  Each Row has zero or more Cell children, representing the cells
 * in that row.
 */
export class CanonicalTable {
  private readonly initialColumnOrder = new Array<string>();
  private readonly columnsByID: ReadonlyMap<string, Header>;
  private readonly rowNodes: ResponseNode[];
  private readonly columnsList = new Array<Header>();

  constructor(private readonly node: ResponseNode) {
    const columnsByID = new Map<string, Header>();
    if (this.node.children.length > 0) {
      for (const columnNode of this.node.children[0].children) {
        const col = new Header(columnNode);
        columnsByID.set(col.category.id, col);
        this.initialColumnOrder.push(col.category.id);
        this.columnsList.push(col);
      }
    }
    this.columnsByID = columnsByID;
    this.rowNodes = this.node.children.slice(1);
  }

  get rowCount(): number {
    return this.rowNodes.length;
  }

  /**
   * Retrieves the set of columns corresponding to the provided column IDs.  If
   * no column IDs are provided, all defined columns, in their definition order,
   * are returned.
   */
  columns(...columnIDs: string[]): Header[] {
    if (columnIDs.length === 0) {
      columnIDs = this.initialColumnOrder;
    }
    const ret = new Array<Header>();
    for (const columnID of columnIDs) {
      const col = this.columnsByID.get(columnID);
      if (!col) {
        throw new ConfigurationError(`unknown column ID ${columnID}`)
          .from(SOURCE)
          .at(Severity.ERROR);
      }
      ret.push(col);
    }
    return ret;
  }

  rowSlice(startIdx?: number, endIdx?: number): Row[] {
    if (!!endIdx && !!startIdx && endIdx < startIdx) {
      throw new ConfigurationError(
        `slice range [${startIdx}, ${endIdx}] is invalid`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    return this.rowNodes.slice(startIdx, endIdx)
      .map((row: ResponseNode) => new Row(row, this.columnsList));
  }
}
