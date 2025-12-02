import { Category } from '../category/category.js';
import { Coloring } from '../color/color.js';
import { MatchFn } from '../interactions/interactions.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { Value } from '../value/value.js';
import { ValueMap } from '../value/value_map.js';
/** Table rendering properties. */
export declare class TableRenderProperties {
    rowHeightPx: number;
    fontSizePx: number;
    constructor(vm: ValueMap);
}
/** A highlightable table item. */
export interface Highlightable {
    properties: ValueMap;
    highlighted: boolean;
}
/** A table cell. */
export declare class Cell implements Highlightable {
    readonly column: Header;
    readonly properties: ValueMap;
    readonly payloadsByType: ReadonlyMap<string, ResponseNode[]>;
    private readonly unsubscribe;
    highlighted: boolean;
    constructor(node: ResponseNode, column: Header, matchFn: MatchFn | undefined, onChange: () => void);
    get value(): Value;
    dispose(): void;
}
/** An empty table cell. */
export declare class EmptyCell extends Cell {
    constructor(column: Header);
    get value(): Value;
}
/** A table row. */
export declare class Row implements Highlightable {
    readonly properties: ValueMap;
    private readonly cellsByColumnID;
    readonly payloadsByType: ReadonlyMap<string, ResponseNode[]>;
    private readonly unsubscribe;
    highlighted: boolean;
    constructor(node: ResponseNode, columns: Header[], rowMatchFn: MatchFn | undefined, cellMatchFn: MatchFn | undefined, onChange: () => void);
    /**
     * Returns an array of cells for this row, given the provided columns.  If the
     * row is missing a column, an EmptyCell is returned for that column.  Only
     * cells associated with the provided columns are returned; the row may define
     * cells associated with other columns, but these will not be returned.
     */
    cells(columns: readonly Header[]): Cell[];
    dispose(): void;
}
/** A Table Column Header */
export declare class Header {
    readonly properties: ValueMap;
    readonly category: Category;
    constructor(node: ResponseNode);
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
export declare class CanonicalTable {
    private readonly node;
    private readonly rowMatchFn;
    private readonly cellMatchFn;
    private readonly onChange;
    readonly renderProperties: TableRenderProperties;
    readonly coloring: Coloring;
    private readonly initialColumnOrder;
    private readonly columnsByID;
    private readonly rowNodes;
    private readonly columnsList;
    constructor(node: ResponseNode, rowMatchFn: MatchFn | undefined, cellMatchFn: MatchFn | undefined, onChange: () => void);
    get rowCount(): number;
    /**
     * Retrieves the set of columns corresponding to the provided column IDs.  If
     * no column IDs are provided, all defined columns, in their definition order,
     * are returned.
     */
    columns(...columnIDs: string[]): Header[];
    rowSlice(startIdx?: number, endIdx?: number): Row[];
}
