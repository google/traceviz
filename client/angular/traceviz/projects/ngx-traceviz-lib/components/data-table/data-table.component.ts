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

import { AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Sort, SortDirection } from '@angular/material/sort';
import { DataSeriesQueryDirective } from '../../src/core/data_series_query.directive';
import { InteractionsDirective } from '../../src/core/interactions.directive';
import { MatPaginator } from '@angular/material/paginator';
import { CanonicalTable, Coloring, ConfigurationError, DataSeriesQuery, Interactions, Severity, TableCell, TableHeader, TableRow, ValueMap, getLabel } from 'traceviz-client-core';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AppCoreService } from '../../src/app_core_service/app_core.service';

const SOURCE = 'data-table';

// Valid interactions targets
const ROW = 'row';
const COLUMN = 'column';

// Valid action types
const CLICK = 'click';
const SHIFTCLICK = 'shift-click';
const MOUSEOVER = 'mouseover';
const MOUSEOUT = 'mouseout';

// Valid reaction types
const HIGHLIGHT = 'highlight';

// Valid watch types
const SORT_ROWS = 'sort_rows';

// Sort watch keys
const SORT_DIRECTION = 'direction';
const SORT_COLUMN = 'column';

// Valid sort directions
const SORT_ASC = 'asc';
const SORT_DESC = 'desc';
const SORT_NONE = '';

const supportedActions = new Array<[string, string]>(
  [ROW, CLICK],
  [ROW, SHIFTCLICK],
  [ROW, MOUSEOVER],
  [ROW, MOUSEOUT],
  [COLUMN, CLICK],
);

const supportedReactions = new Array<[string, string]>(
  [ROW, HIGHLIGHT],
);

const supportedWatches = [SORT_ROWS];

@Component({
  selector: 'data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @ContentChild(DataSeriesQueryDirective) dataSeriesQueryDir: DataSeriesQueryDirective | undefined;
  @ContentChild(InteractionsDirective) interactionsDir: InteractionsDirective | undefined;
  @ContentChild(MatPaginator) paginator: MatPaginator | undefined;

  @ViewChild('componentDiv') componentDiv!: ElementRef;
  @ViewChild('loadingDiv') loadingDiv!: ElementRef;

  loading = false;

  // Ends all subscriptions in the component.
  private unsubscribe = new Subject<void>();
  // Ends subscriptions from the last data series.
  private newSeries = new Subject<void>();
  private table: CanonicalTable | undefined;
  columns: TableHeader[] = [];
  rows: TableRow[] = [];

  // Fields available after ngAfterContentInit.
  private interactions: Interactions | undefined;
  dataSeriesQuery: DataSeriesQuery | undefined;
  sort: Sort = { active: '', direction: '' };

  constructor(private readonly appCoreService: AppCoreService,
    private readonly ref: ChangeDetectorRef) {
  }

  ngAfterContentInit(): void {
    this.appCoreService.appCore.onPublish((appCore) => {
      if (this.dataSeriesQueryDir === undefined) {
        appCore.err(new ConfigurationError(`data-table is missing required 'data-series' child.`)
          .from(SOURCE)
          .at(Severity.ERROR));
        return;
      }
      this.dataSeriesQuery = this.dataSeriesQueryDir.dataSeriesQuery;
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
      this.interactions?.watch(SORT_ROWS, (vm) => {
        this.sortRowsWatch(vm);
      })

      // Publish loading status.
      this.dataSeriesQuery?.loading
        .pipe(takeUntil(this.unsubscribe))
        .subscribe((loading) => {
          this.loading = loading;
          this.ref.detectChanges();
        });

      // Handle new data series.
      this.dataSeriesQuery?.response
        .pipe(takeUntil(this.unsubscribe))
        .subscribe((response) => {
          this.newSeries.next();
          try {
            this.table = new CanonicalTable(response);
            this.columns = this.table?.columns();
            if (this.paginator !== undefined) {
              this.paginator.pageIndex = 0;
              this.paginator.length = this.table ? this.table.rowCount : 0;
            }
            this.updateRows();
          } catch (err: unknown) {
            appCore.err(err);
          }
        });
    })
  }

  ngAfterViewInit(): void {
    this.redraw();
  }

  ngOnDestroy(): void {
    this.newSeries.next();
    this.newSeries.complete();
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  sortRowsWatch(values: ValueMap) {
    try {
      const sortDirection = values.expectString(SORT_DIRECTION);
      if (![SORT_ASC, SORT_DESC, SORT_NONE].includes(sortDirection)) {
        throw new ConfigurationError(`Unsupported sort direction '${sortDirection}': must be '${SORT_ASC}', '${SORT_DESC}', or '${SORT_NONE}'.`)
          .from(SOURCE)
          .at(Severity.ERROR);
      }
      const sortColumn = values.expectString(SORT_COLUMN);
      this.sort.direction = sortDirection as SortDirection;
      this.sort.active = sortColumn;
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }

  doSort(sort: Sort) {
    const column = this.columns.find((col => col.category.id === sort.active));
    if (column !== undefined) {
      this.interactions?.update(COLUMN, CLICK, column.properties);
      this.sort = sort;
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
    const matchFn = this.interactions?.match(ROW, HIGHLIGHT);
    if (matchFn !== undefined) {
      for (const row of this.rows) {
        matchFn(row.properties).pipe(
          takeUntil(this.newSeries),
          distinctUntilChanged(),
        )
          .subscribe((highlighted) => {
            row.highlighted = highlighted;
            this.ref.detectChanges();
          });
      }
    }
    this.ref.detectChanges();
  }

  rowClick(row: TableRow, shiftDepressed: boolean) {
    if (!shiftDepressed) {
      this.interactions?.update(ROW, CLICK, row.properties);
    } else {
      this.interactions?.update(ROW, SHIFTCLICK, row.properties);
    }
  }

  rowMouseover(row: TableRow) {
    this.interactions?.update(ROW, MOUSEOVER, row.properties);
  }

  rowMouseout(row: TableRow) {
    this.interactions?.update(ROW, MOUSEOUT, row.properties);
  }

  rowCells(row: TableRow): TableCell[] {
    return row.cells(this.columns);
  }

  itemStyle(...items: (TableRow | TableCell)[]): { [klass: string]: string } {
    const style: { [klass: string]: string; } = {};
    if (this.table === undefined) {
      return style;
    }
    try {
      const colorings = items.map((item) => this.table!.coloring.colors(item.properties));
      let bgColor: string | undefined;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item instanceof TableRow &&
          item.highlighted &&
          colorings[i].secondary !== undefined) {
          bgColor = colorings[i].secondary;
          break;
        }
      }
      if (bgColor === undefined) {
        for (let i = 0; i < items.length; i++) {
          if (colorings[i].primary !== undefined) {
            bgColor = colorings[i].primary;
            break;
          }
        }
      }
      if (bgColor !== undefined) {
        style['background-color'] = bgColor;
      }
      for (let i = 0; i < items.length; i++) {
        if (colorings[i].stroke !== undefined) {
          style['color'] = colorings[i].stroke!;
          break;
        }
      }
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
    return style;
  }

  cellLabel(cell: TableCell): string {
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
      const height = ne.offsetHeight;
      ne.children[0].style.display = 'table';
      const rows = Math.floor(height / (this.rowHeightPx + 2));
      // Save one row for the header and one for the footer.
      this.paginator.pageSize = rows - 2;
    }
    // And update the rows.
    this.updateRows();
  };
}
