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
import { EMPTY, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CategorySet, getDefinedCategory } from '../category/category.js';
import { Coloring } from '../color/color.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { children } from '../payload/payload.js';
import { EmptyValue, StringValue } from '../value/value.js';
import { ValueMap } from '../value/value_map.js';
const SOURCE = 'table';
var Keys;
(function (Keys) {
    Keys["CELL"] = "table_cell";
    Keys["FORMATTED_CELL"] = "table_formatted_cell";
    Keys["ROW_HEIGHT_PX"] = "table_row_height_px";
    Keys["FONT_SIZE_PX"] = "table_font_size_px";
})(Keys || (Keys = {}));
/** Table rendering properties. */
export class TableRenderProperties {
    rowHeightPx = 0;
    fontSizePx = 0;
    constructor(vm) {
        if (vm.has(Keys.ROW_HEIGHT_PX)) {
            this.rowHeightPx = vm.expectNumber(Keys.ROW_HEIGHT_PX);
        }
        if (vm.has(Keys.FONT_SIZE_PX)) {
            this.fontSizePx = vm.expectNumber(Keys.FONT_SIZE_PX);
        }
    }
}
/** A table cell. */
export class Cell {
    column;
    properties;
    payloadsByType;
    unsubscribe = new Subject();
    highlighted = false;
    constructor(node, column, matchFn, onChange) {
        this.column = column;
        this.properties = node.properties;
        const c = children(node);
        if (c.structural.length > 0) {
            throw new ConfigurationError(`cell node children may only be payloads`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        this.payloadsByType = c.payload;
    }
    get value() {
        if (this.properties.has(Keys.FORMATTED_CELL)) {
            return new StringValue(this.properties.format(this.properties.expectString(Keys.FORMATTED_CELL)));
        }
        if (this.properties.has(Keys.CELL)) {
            return this.properties.get(Keys.CELL);
        }
        return new EmptyValue();
    }
    dispose() {
        this.unsubscribe.next();
        this.unsubscribe.complete();
    }
}
/** An empty table cell. */
export class EmptyCell extends Cell {
    constructor(column) {
        super({ properties: new ValueMap(), children: [] }, column, () => EMPTY, () => { });
    }
    get value() {
        return new EmptyValue();
    }
}
/** A table row. */
export class Row {
    properties;
    cellsByColumnID;
    payloadsByType;
    unsubscribe = new Subject();
    highlighted = false;
    constructor(node, columns, rowMatchFn, cellMatchFn, onChange) {
        this.properties = node.properties;
        const c = children(node);
        this.payloadsByType = c.payload;
        const cellsByColumnID = new Map();
        c.structural.forEach((child) => {
            const categorySet = new CategorySet(...columns.map(col => col.category));
            const cats = categorySet.getTaggedCategories(child.properties);
            if (cats.length === 0) {
                return;
            }
            if (cats.length > 1) {
                throw new ConfigurationError(`Cells may only belong to one column`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
            }
            const column = columns.find(col => col.category === cats[0]);
            const cell = new Cell(child, column, cellMatchFn, onChange);
            cellsByColumnID.set(column.category.id, cell);
            return cell;
        });
        this.cellsByColumnID = cellsByColumnID;
        if (rowMatchFn !== undefined) {
            rowMatchFn(this.properties)
                .pipe(takeUntil(this.unsubscribe), distinctUntilChanged())
                .subscribe((highlighted) => {
                this.highlighted = highlighted;
                onChange();
            });
        }
    }
    /**
     * Returns an array of cells for this row, given the provided columns.  If the
     * row is missing a column, an EmptyCell is returned for that column.  Only
     * cells associated with the provided columns are returned; the row may define
     * cells associated with other columns, but these will not be returned.
     */
    cells(columns) {
        return columns.map((column) => {
            const cell = this.cellsByColumnID.get(column.category.id);
            if (cell) {
                return cell;
            }
            return new EmptyCell(column);
        });
    }
    dispose() {
        this.unsubscribe.next();
        this.unsubscribe.complete();
    }
}
/** A Table Column Header */
export class Header {
    properties;
    category;
    constructor(node) {
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
    node;
    rowMatchFn;
    cellMatchFn;
    onChange;
    renderProperties;
    coloring;
    initialColumnOrder = new Array();
    columnsByID;
    rowNodes;
    columnsList = new Array();
    constructor(node, rowMatchFn, cellMatchFn, onChange) {
        this.node = node;
        this.rowMatchFn = rowMatchFn;
        this.cellMatchFn = cellMatchFn;
        this.onChange = onChange;
        this.renderProperties = new TableRenderProperties(node.properties);
        this.coloring = new Coloring(node.properties);
        const columnsByID = new Map();
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
    get rowCount() {
        return this.rowNodes.length;
    }
    /**
     * Retrieves the set of columns corresponding to the provided column IDs.  If
     * no column IDs are provided, all defined columns, in their definition order,
     * are returned.
     */
    columns(...columnIDs) {
        if (columnIDs.length === 0) {
            columnIDs = this.initialColumnOrder;
        }
        const ret = new Array();
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
    rowSlice(startIdx, endIdx) {
        if (!!endIdx && !!startIdx && endIdx < startIdx) {
            throw new ConfigurationError(`slice range [${startIdx}, ${endIdx}] is invalid`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.rowNodes.slice(startIdx, endIdx)
            .map((row) => new Row(row, this.columnsList, this.rowMatchFn, this.cellMatchFn, this.onChange));
    }
}
//# sourceMappingURL=table.js.map