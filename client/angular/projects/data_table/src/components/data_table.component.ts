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

/**
 * @fileoverview A basic TraceViz table view, consuming tabular data as defined
 * at ../../../../server/go/table/table.go
 */

import {AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, ElementRef, Inject, InjectionToken, Input, OnDestroy, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {Sort} from '@angular/material/sort';
import {AppCoreService, DataSeriesDirective, InteractionsDirective} from '@google/traceviz-angular-core';
import {AppCore, CanonicalTable, Cell, ConfigurationError, DataSeriesQuery, getLabel, getStyles, Header, Interactions, ResponseNode, Row, Severity, StringValue} from '@google/traceviz-client-core';
import * as d3 from 'd3';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

const SOURCE = 'data-table';

// Valid interactions targets
const ROW = 'rows';
const COLUMN = 'columns';
const TABLE = 'table';

// Valid action types
const CLICK = 'click';
const SHIFTCLICK = 'shift-click';
const MOUSEOVER = 'mouseover';
const MOUSEOUT = 'mouseout';

// Valid reaction types
const HIGHLIGHT = 'highlight';
const REDRAW = 'redraw';

// Valid watch types
const UPDATE_SORT_DIRECTION = 'update_sort_direction';
const UPDATE_SORT_COLUMN = 'update_sort_column';

// Sort watch keys
const SORT_DIRECTION = 'sort_direction';
const SORT_COLUMN = 'sort_column';

// Valid sort directions
const SORT_ASC = 'asc';
const SORT_DESC = 'desc';
const SORT_NONE = '';

const WINDOW = new InjectionToken<Window>('window', {factory: () => window});

const supportedActions = new Array<[string, string]>(
    [ROW, CLICK],
    [ROW, SHIFTCLICK],
    [ROW, MOUSEOVER],
    [ROW, MOUSEOUT],
    [COLUMN, CLICK],
);

const supportedReactions =
    new Array<[string, string]>([ROW, HIGHLIGHT], [TABLE, REDRAW]);

const supportedWatches = [UPDATE_SORT_DIRECTION, UPDATE_SORT_COLUMN];

/** An interactive table. */
@Component({
  standalone: false,
  selector: 'data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'data_table.component.html',
  styleUrls: ['data_table.component.css']
})
export class DataTable implements AfterContentInit, AfterViewInit, OnDestroy {
  @ContentChild(DataSeriesDirective, {descendants: false})
  dataSeriesQueryDir: DataSeriesDirective|undefined;
  @ContentChild(InteractionsDirective, {descendants: false})
  interactionsDir: InteractionsDirective|undefined;
  @ContentChild(MatPaginator) paginator: MatPaginator|undefined;

  @ViewChild('componentDiv') componentDiv!: ElementRef;
  @ViewChild('loadingDiv') loadingDiv!: ElementRef;

  // dataInput can be set if a <data-series> child is not provided, representing
  // the table's static data. The ResponseNode's data needs to have the same
  // tabular format as the one expected from a <data-series>.
  @Input('data') dataInput?: ResponseNode;

  @Input() heightAdjustmentRatio = 1.0;
  @Input() redrawAfterViewInitDelay = 0;

  loading = false;

  // Ends all subscriptions in the component.
  private readonly unsubscribe = new Subject<void>();
  // Ends subscriptions from the last data series.
  private readonly newSeries = new Subject<void>();
  private table: CanonicalTable|undefined;
  columns: Header[] = [];
  rows: Row[] = [];

  // Fields available after ngAfterContentInit.
  private interactions: Interactions|undefined;
  dataSeriesQuery: DataSeriesQuery|undefined;
  sort: Sort = {active: '', direction: ''};

  constructor(
      private readonly appCoreService: AppCoreService,
      private readonly ref: ChangeDetectorRef,
      @Inject(WINDOW) private readonly window: Window,
  ) {}

  ngAfterContentInit(): void {
    this.appCoreService.appCore.onPublish((appCore) => {
      if (this.dataSeriesQueryDir !== undefined &&
          this.dataInput !== undefined) {
        appCore.err(
            new ConfigurationError(
                'data-table cannot specify both a <data-series> child and the "data" property')
                .from(SOURCE)
                .at(Severity.ERROR));
        return;
      }

      if (this.paginator !== undefined) {
        // Per https://github.com/angular/components/issues/15781, the
        // paginator's tooltips stick past hover.  Hide them.
        this.paginator._intl.nextPageLabel = '';
        this.paginator._intl.previousPageLabel = '';
        this.paginator._intl.firstPageLabel = '';
        this.paginator._intl.lastPageLabel = '';
        this.paginator.page.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
          this.redraw();
        });
      }

      // Ensure the user-specified interactions are supported.
      this.interactions = this.interactionsDir?.get();
      try {
        this.interactions?.checkForSupportedActions(supportedActions);
        this.interactions?.checkForSupportedReactions(supportedReactions);
        this.interactions?.checkForSupportedWatches(supportedWatches);
      } catch (err) {
        appCore.err(err);
      }
      // Set up watches
      this.interactions?.watch(UPDATE_SORT_DIRECTION, (vm) => {
        const sortDirectionVal = vm.get(SORT_DIRECTION);
        if (sortDirectionVal instanceof StringValue) {
          if (sortDirectionVal.val === 'asc' ||
              sortDirectionVal.val === 'desc' || sortDirectionVal.val === '') {
            this.sort.direction = sortDirectionVal.val;
          } else {
            this.appCoreService.appCore.err(
                new ConfigurationError(
                    `${SORT_DIRECTION} on the ${
                        UPDATE_SORT_DIRECTION} watch can only be 'asc', 'desc', or ''`)
                    .from(SOURCE)
                    .at(Severity.ERROR));
          }
        } else {
          this.appCoreService.appCore.err(
              new ConfigurationError(
                  `${SORT_DIRECTION} on the ${
                      UPDATE_SORT_DIRECTION} watch only supports string contents`)
                  .from(SOURCE)
                  .at(Severity.ERROR));
        }
      }, this.unsubscribe);
      this.interactions?.watch(UPDATE_SORT_COLUMN, (vm) => {
        const sortColumnVal = vm.get(SORT_COLUMN);
        if (sortColumnVal instanceof StringValue) {
          this.sort.active = sortColumnVal.val;
        } else {
          this.appCoreService.appCore.err(
              new ConfigurationError(
                  `${SORT_COLUMN} on the ${
                      UPDATE_SORT_COLUMN} watch only supports string contents`)
                  .from(SOURCE)
                  .at(Severity.ERROR));
        }
      }, this.unsubscribe);
      // Set up redraw on a redraw signal
      this.interactions?.match(TABLE, REDRAW)(undefined)
          .pipe(takeUntil(this.unsubscribe))
          .subscribe((changed: boolean) => {
            if (changed) {
              this.window.requestAnimationFrame(() => {
                this.redraw();
              });
            }
          });

      this.dataSeriesQuery = this.dataSeriesQueryDir?.dataSeriesQuery;
      if (this.dataSeriesQuery) {
        // Publish loading status.
        this.dataSeriesQuery.loading.pipe(takeUntil(this.unsubscribe))
            .subscribe((loading) => {
              this.loading = loading;
              this.ref.detectChanges();
            });

        // Handle new data series.
        this.dataSeriesQuery.response.pipe(takeUntil(this.unsubscribe))
            .subscribe((response) => {
              this.updateData(response, appCore);
            });
      } else if (this.dataInput) {
        // If static data was passed in, render it.
        this.updateData(this.dataInput, appCore);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.redraw();
    }, this.redrawAfterViewInitDelay);
  }

  ngOnDestroy(): void {
    this.newSeries.next();
    this.newSeries.complete();
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  doSort(sort: Sort) {
    const column = this.columns.find((col => col.category.id === sort.active));
    if (column !== undefined) {
      this.interactions?.update(COLUMN, CLICK, column.properties);
      this.sort = sort;
    }
  }


  // updateData renders data.
  private updateData(data: ResponseNode, appCore: AppCore): void {
    this.newSeries.next();
    try {
      this.table = new CanonicalTable(
          data, this.interactions?.match(ROW, HIGHLIGHT), undefined, () => {
            this.ref.detectChanges();
          });
      this.columns = this.table?.columns();
      if (this.paginator !== undefined) {
        this.paginator.pageIndex = 0;
        this.paginator.length = this.table ? this.table.rowCount : 0;
      }
      this.updateRows();
    } catch (err: unknown) {
      appCore.err(err);
    }
  }

  updateRows() {
    if (this.table === undefined) {
      return;
    }
    let start = 0;
    let end = this.table.rowCount;
    if (this.paginator !== undefined) {
      start = this.paginator.pageSize * this.paginator.pageIndex;
      end = start + this.paginator.pageSize;
    }
    this.rows = this.table.rowSlice(start, end);
    this.ref.detectChanges();
  }

  sortTable(sort: Sort) {
    const column = this.columns.find((col) => col.category.id === sort.active);
    if (column) {
      const properties = column.properties.with(
          ['sort_direction', new StringValue(sort.direction)]);
      this.interactions?.update(COLUMN, CLICK, properties);
      this.sort = sort;
    }
  }

  rowClick(row: Row, shiftDepressed: boolean) {
    if (!shiftDepressed) {
      this.interactions?.update(ROW, CLICK, row.properties);
    } else {
      this.interactions?.update(ROW, SHIFTCLICK, row.properties);
    }
  }

  rowMouseover(row: Row) {
    this.interactions?.update(ROW, MOUSEOVER, row.properties);
  }

  rowMouseout(row: Row) {
    this.interactions?.update(ROW, MOUSEOUT, row.properties);
  }

  rowCells(row: Row): Cell[] {
    return row.cells(this.columns);
  }

  rowStyle(row: Row): {[klass: string]: string} {
    const style: {[klass: string]: string;} = {};
    if (!this.table) {
      return style;
    }
    try {
      const rowColors = this.table.coloring.colors(row.properties);
      if (row.highlighted) {
        if (rowColors.primary) {
          const d3Color = d3.color(rowColors.primary);
          if (d3Color) {
            style['background-color'] = d3Color.brighter(2).toString();
          }
        } else if (rowColors.secondary) {
          style['background-color'] = rowColors.secondary;
        }
      } else if (rowColors.primary) {
        style['background-color'] = rowColors.primary;
      }
      if (rowColors.stroke) {
        style['color'] = rowColors.stroke;
      }
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
    return style;
  }

  cellStyle(cell: Cell, column: number, row: Row): {[klass: string]: string} {
    const style = this.rowStyle(row);
    if (!this.table) {
      return {};
    }
    const cellStyle = getStyles(cell.properties);
    for (const key in cellStyle) {
      style[key] = cellStyle[key];
    }
    try {
      const cellColors = this.table!.coloring.colors(cell.properties);
      if (cellColors.primary) {
        style['background-color'] = cellColors.primary;
      }
      if (cellColors.stroke) {
        style['color'] = cellColors.stroke;
      }
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
    return style;
  }

  cellLabel(cell: Cell): string {
    return getLabel(cell.properties);
  }

  get rowHeightPx(): number {
    if (this.table !== undefined) {
      return this.table.renderProperties.rowHeightPx;
    }
    return 20;
  }

  get fontSizePx(): number {
    if (this.table !== undefined) {
      return this.table.renderProperties.fontSizePx;
    }
    return this.rowHeightPx * .66;
  }

  redraw() {
    // Compute the page size.
    if (this.componentDiv !== undefined && this.paginator !== undefined) {
      const ne = this.componentDiv.nativeElement;
      // Hide the table to find the available height
      ne.children[0].style.display = 'none';
      const height = ne.offsetHeight * this.heightAdjustmentRatio;
      ne.children[0].style.display = 'table';
      // Account for 2px border spacing on each row.
      const rows = Math.floor(height / (this.rowHeightPx + 2));
      // Save one row for the header.
      this.paginator.pageSize = rows - 1;
    }
    // And update the rows.
    this.updateRows();
  }
}
