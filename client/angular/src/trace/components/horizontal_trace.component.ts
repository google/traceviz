/** @fileoverview A component visualizing trace data. */

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

import {AfterContentInit, AfterViewInit, ChangeDetectionStrategy, Component, ContentChild, ElementRef, HostListener, Input, OnDestroy, ViewChild} from '@angular/core';
import * as d3 from 'd3';  // from //third_party/javascript/typings/d3:bundle
import {Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';
import {ContinuousXAxis, scaleFromAxis, TraceCategoryHierarchyYAxis, xAxisRenderSettings} from 'traceviz-angular-axes';
import {AppCoreService, InteractionsDirective} from 'traceviz-angular-core';
import {Coloring, ConfigurationError, getLabel, renderCategoryHierarchyForHorizontalSpans, RenderedTraceCategoryHierarchy, RenderedTraceEdge, RenderedTraceSpan, RenderedTraceSpans, renderHorizontalTraceSpans, Severity, Timestamp, TimestampValue, Trace, Value, ValueMap} from 'traceviz-client-core';

import {TraceProvider} from '../directives/trace_provider.directive';

const SOURCE = 'trace_component';

enum Keys {
  DETAIL_FORMAT = 'detail_format',
}

const SPAN = 'span';    // Trace spans.
const CHART = 'chart';  // The chart area.

const ACTION_CLICK = 'click';
const ACTION_MOUSEOVER = 'mouseover';
const ACTION_MOUSEOUT = 'mouseout';
// A 'brush' (click-and-drag zoom or zoom reset) action.
const ACTION_BRUSH = 'brush';

const UPDATE_CALLED_OUT_CATEGORY = 'update_called_out_category';

const enum WatchKey {
  CALLED_OUT_CATEGORY_ID = 'called_out_category_id',
  CATEGORY_ID_KEY = 'category_id_key',
}

// 'brush' actions on 'chart' update zoom bounds in 'chart's item keys.
const ZOOM_START_KEY = 'zoom_start';
const ZOOM_END_KEY = 'zoom_end';

const supportedActions = new Array<[string, string]>(
    [SPAN, ACTION_MOUSEOVER],  // A span is moused over.
    [SPAN, ACTION_MOUSEOUT],   // A span is moused out of.
    [SPAN, ACTION_CLICK],      // A span is clicked.
    [CHART, ACTION_BRUSH]      // The chart area is brushed to zoom.
);

/**
 * Presents a view of trace data in which the x-axis is trace time and spans
 * extend horizontally, with trace categories on the y-axis.
 */
@Component({
  selector: 'horizontal-trace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div #loadingDiv>
  <mat-progress-bar mode="indeterminate"></mat-progress-bar>
</div>
<ng-content select="help"></ng-content>
<div class="content">
  <hovercard [visible]="tooltip !== ''">{{tooltip}}</hovercard>
  <div class="content" #componentDiv (window:resize)="resize()">
    <div class="chart-grid">
      <div class="chart-grid-item">
        <ng-content select="[id=chartLeft]"></ng-content>
      </div>
      <div class="chart-grid-item">
        <svg #chart>
          <g class="brush"></g>
          <g class="called-out-category-band"></g>
          <g class="chart-area"></g>
        </svg>
      </div>
      <div class="chart-grid-item">
      </div>
      <div class="chart-grid-item">
        <ng-content select="[id=chartBottom]"></ng-content>
      </div>
    </div>
  </div>
</div>
`,
  styleUrls: ['trace.css'],
})
export class HorizontalTraceComponent implements AfterContentInit,
                                                 AfterViewInit, OnDestroy {
  // The source of trace data.
  @ContentChild(TraceProvider) traceDirective: TraceProvider|undefined;
  @ContentChild(InteractionsDirective, {descendants: false})
  interactions: InteractionsDirective|undefined;
  @ContentChild(ContinuousXAxis) continuousXAxis: ContinuousXAxis|undefined;
  @ContentChild(TraceCategoryHierarchyYAxis)
  categoryHierarchyYAxis: TraceCategoryHierarchyYAxis|undefined;

  @ViewChild('chart', {static: true}) chart!: ElementRef;

  @ViewChild('loadingDiv', {static: true}) loadingDiv: ElementRef|undefined;
  @ViewChild('componentDiv') componentDiv!: ElementRef;

  @Input() maxFrameHeightPx = 20;
  @Input() transitionDurationMs = 500;

  readonly unsubscribe = new Subject<void>();
  readonly redrawDebouncer = new Subject<void>();
  private trace: Trace|undefined;
  tooltip = '';

  private renderedSpans: RenderedTraceSpans|undefined;
  private renderedCategories: RenderedTraceCategoryHierarchy|undefined;
  // The current width of the trace chart.  This is generally the width of
  // componentDiv less the width of the rendered category y-axis.
  private chartWidthPx = 0;

  constructor(private readonly appCoreService: AppCoreService) {}

  ngAfterContentInit() {
    if (this.traceDirective !== undefined) {
      // Display the loading spinner while data is loading.
      this.traceDirective.loading.pipe(takeUntil(this.unsubscribe))
          .subscribe((loading) => {
            if (this.loadingDiv !== undefined) {
              this.loadingDiv.nativeElement.style.display =
                  loading ? 'block' : 'none';
            }
          });
      // Upon new trace data, update the referenced trace and enqueue a redraw.
      this.traceDirective.trace.pipe(takeUntil(this.unsubscribe))
          .subscribe((trace) => {
            if (!trace) {
              return;
            }
            this.trace = trace;
            this.redrawDebouncer.next();
          });
    }
    // Debounce redraw requests.
    this.redrawDebouncer.pipe(takeUntil(this.unsubscribe), debounceTime(50))
        .subscribe(() => {
          try {
            this.redraw();
          } catch (err: unknown) {
            this.appCoreService.appCore.err(err);
          }
        });
    // Validate and register actions and watches.
    this.interactions?.get().checkForSupportedActions(supportedActions);
    this.interactions?.get().checkForSupportedReactions([]);
    this.interactions?.get().checkForSupportedWatches(
        [UPDATE_CALLED_OUT_CATEGORY]);
    const watchActions = new Map([
      [
        UPDATE_CALLED_OUT_CATEGORY,
        (vm: ValueMap) => {
          try {
            // When the called-out category changes, remove the existing
            // highlight band and, if a valid category is called-out, draw a new
            // band there.
            const chartArea = d3.select(this.chart.nativeElement);
            chartArea.select('.called-out-category-band')
                .selectAll('rect')
                .remove();
            if (this.renderedCategories === undefined) {
              return;
            }
            if (!vm.has(WatchKey.CALLED_OUT_CATEGORY_ID)) {
              throw new ConfigurationError(
                  `watch action '${UPDATE_CALLED_OUT_CATEGORY}' requires '${
                      WatchKey.CALLED_OUT_CATEGORY_ID}' parameter`)
                  .from(SOURCE)
                  .at(Severity.ERROR);
            }
            const calledOutCategoryVal =
                vm.get(WatchKey.CALLED_OUT_CATEGORY_ID);
            if (!vm.has(WatchKey.CATEGORY_ID_KEY)) {
              throw new ConfigurationError(
                  `watch action '${UPDATE_CALLED_OUT_CATEGORY}' requires '${
                      WatchKey.CATEGORY_ID_KEY}' parameter`)
                  .from(SOURCE)
                  .at(Severity.ERROR);
            }
            const categoryIDKey = vm.expectString(WatchKey.CATEGORY_ID_KEY);
            for (const renderedCategoryRoot
                     of this.renderedCategories.rootCategories) {
              for (const renderedCategory of renderedCategoryRoot.flatten()) {
                if (renderedCategory.properties.has(categoryIDKey)) {
                  if (calledOutCategoryVal.compare(
                          renderedCategory.properties.get(categoryIDKey)) ===
                      0) {
                    chartArea.select('.called-out-category-band')
                        .append('rect')
                        .attr('x', 0)
                        .attr('y', renderedCategory.y0Px)
                        .attr('width', this.chartWidthPx)
                        .attr('height', renderedCategory.height)
                        .attr('fill', '#aaa');
                    break;
                  }
                }
              }
            }
          } catch (err: unknown) {
            this.appCoreService.appCore.err(err);
          }
        },
      ],
    ]);
    this.interactions?.get()
        .watchAll(watchActions, this.unsubscribe)
        .subscribe((err: unknown) => {
          this.appCoreService.appCore.err(err);
        });
  }

  ngAfterViewInit() {
    this.resize();
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  // Upon mousing over a span, show a tooltip with its details.
  handleSpanMouseover(data: RenderedTraceSpan) {
    try {
      this.interactions?.get().update(SPAN, ACTION_MOUSEOVER, data.properties);
      this.tooltip = data.properties.format(
          data.properties.expectString(Keys.DETAIL_FORMAT));
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }

  // Upon mousing out of a span, clear the tooltip.
  handleSpanMouseout(data: RenderedTraceSpan) {
    try {
      this.interactions?.get().update(SPAN, ACTION_MOUSEOUT, data.properties);
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
    this.tooltip = '';
  }

  // Upon viewport resize, enqueue a redraw.
  @HostListener('window:resize')
  resize() {
    if (!this.componentDiv) {
      return;
    }
    this.redrawDebouncer.next();
  }

  redraw() {
    if (!this.componentDiv || !this.trace) {
      return;
    }
    // Expect render settings from the trace.
    const widthPx = this.componentDiv.nativeElement.offsetWidth;
    // Render the trace categories first, to get the width the category axis
    // will require.
    this.renderedCategories =
        renderCategoryHierarchyForHorizontalSpans(this.trace);
    // Compute the available chart width.
    const categoryWidthPx = this.renderedCategories.widthPx;
    this.chartWidthPx = widthPx - categoryWidthPx;
    this.renderedSpans =
        renderHorizontalTraceSpans(this.trace, this.chartWidthPx);
    // The required height is the largest lower-edge offset of all rendered
    // spans.
    const heightPx = this.renderedCategories.heightPx;
    const chartArea = d3.select(this.chart.nativeElement);
    this.chart.nativeElement.style.display = 'none';
    if (this.categoryHierarchyYAxis) {
      this.categoryHierarchyYAxis.render(this.renderedCategories);
    }
    if (this.continuousXAxis) {
      const xAxisSettings = xAxisRenderSettings(this.trace.properties);
      this.continuousXAxis.render(
          this.trace.axis, this.chartWidthPx, xAxisSettings);
    }
    // Size the chart area according to the computed dimensions.
    chartArea.attr('width', this.chartWidthPx)
        .attr('height', heightPx)
        .select('.chart-area')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', this.chartWidthPx)
        .attr('height', heightPx);
    this.chart.nativeElement.style.display = 'block';

    const coloring = new Coloring(this.trace.properties);

    // Create a bounding svg for each frame.  Add a colored rectangle and a
    // text to each.
    const nodes = chartArea.select('.chart-area')
                      .selectAll('svg')
                      .data(this.renderedSpans.spans);
    // Remove any extra nodes.
    nodes.exit().remove();
    // Add any new nodes.  Each added node consists of a container SVG,
    // with a rectangle and text nested beneath it.
    const enteredNodes =
        nodes.enter()
            .append('svg')
            .attr('x', (rs: RenderedTraceSpan) => rs.x0Px)
            .attr('y', (rs: RenderedTraceSpan) => rs.y0Px)
            .attr(
                'width',
                (rs: RenderedTraceSpan) => rs.width === 0 ? 1 : rs.width)
            .attr('height', (rs: RenderedTraceSpan) => rs.height)
            .on('mouseover',
                (event: any, d: RenderedTraceSpan) => {
                  this.handleSpanMouseover(d);
                })
            .on('mouseout',
                (event: any, d: RenderedTraceSpan) => {
                  this.handleSpanMouseout(d);
                })
            .on('click', (rs: RenderedTraceSpan) => {
              try {
                this.interactions?.get().update(
                    SPAN, ACTION_CLICK, rs.properties);
              } catch (err: unknown) {
                this.appCoreService.appCore.err(err);
              }
            });
    enteredNodes.append('rect')
        .attr('width', (rs: RenderedTraceSpan) => rs.width === 0 ? 1 : rs.width)
        .attr('height', (rs: RenderedTraceSpan) => rs.height)
        .attr(
            'fill',
            (rs: RenderedTraceSpan) =>
                coloring.colors(rs.properties).primary || '');
    enteredNodes.append('text')
        .attr('dominant-baseline', 'hanging')
        .attr('y', (rs: RenderedTraceSpan) => 1)
        .attr(
            'fill',
            (rs: RenderedTraceSpan) =>
                coloring.colors(rs.properties).stroke || '')
        .text((rs: RenderedTraceSpan) => getLabel(rs.properties));
    // Update all node svgs, rects, and texts with their new positions, colors,
    // and contents.  This version of d3 update uses a lambda receiving a d3
    // selection; as d3 is untyped, this is `any` for now.
    nodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.transition()
              .duration(this.transitionDurationMs)
              .attr('x', (rs: RenderedTraceSpan) => rs.x0Px)
              .attr('y', (rs: RenderedTraceSpan) => rs.y0Px)
              .attr(
                  'width',
                  (rs: RenderedTraceSpan) => rs.width === 0 ? 1 : rs.width)
              .attr('height', (rs: RenderedTraceSpan) => rs.height);
        });
    nodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.select('rect')
              .transition()
              .duration(this.transitionDurationMs)
              .attr(
                  'width',
                  (rs: RenderedTraceSpan) => rs.width === 0 ? 1 : rs.width)
              .attr('height', (rs: RenderedTraceSpan) => rs.height)
              .attr(
                  'fill',
                  (rs: RenderedTraceSpan) =>
                      coloring.colors(rs.properties).primary);
        });
    nodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.select('text')
              .attr('dominant-baseline', 'hanging')
              .attr('y', (rs: RenderedTraceSpan) => 1)
              .attr(
                  'fill',
                  (rs: RenderedTraceSpan) =>
                      coloring.colors(rs.properties).stroke)
              .text((rs: RenderedTraceSpan) => getLabel(rs.properties));
        });
    chartArea.select('.chart-area').selectAll('line').remove();
    // Add trace edges.
    const edges = chartArea.select('.chart-area')
                      .selectAll('line')
                      .data(this.renderedSpans.edges);
    edges.enter()
        .append('line')
        .attr('x1', (re: RenderedTraceEdge) => re.x0Px)
        .attr('y1', (re: RenderedTraceEdge) => re.y0Px)
        .attr('x2', (re: RenderedTraceEdge) => re.x1Px)
        .attr('y2', (re: RenderedTraceEdge) => re.y1Px)
        .attr(
            'stroke',
            (re: RenderedTraceEdge) =>
                coloring.colors(re.properties).stroke || '');
    // Handle x-axis zooming.
    const ht = this;
    const brush =
        d3.brushX()
            .extent([[0, 0], [ht.chartWidthPx, heightPx]])
            .on('end', (event: any) => {
              ht.brush(event.selection, () => {
                chartArea.select<SVGGElement>('.brush').call(brush.move, null);
              });
            });
    chartArea.select<SVGGElement>('.brush').call(brush);
  }

  brush(extent: [number, number]|undefined, clearBrush: () => void) {
    if (!this.trace) {
      return;
    }
    const xScale = scaleFromAxis(this.trace.axis, 0, this.chartWidthPx);
    let minValue: Value|undefined;
    let maxValue: Value|undefined;
    if (!extent) {
      // If there is no extent (e.g., on double-click), reset the zoom.
      minValue = new TimestampValue(new Timestamp(0, 0));
      maxValue = new TimestampValue(new Timestamp(0, 0));
    } else {
      const zoomDomainMin = xScale.invert(extent[0]);
      const zoomDomainMax = xScale.invert(extent[1]);
      if (zoomDomainMin instanceof Date && zoomDomainMax instanceof Date) {
        minValue = new TimestampValue(Timestamp.fromDate(zoomDomainMin));
        maxValue = new TimestampValue(Timestamp.fromDate(zoomDomainMax));
      }
      clearBrush();
    }
    if (!minValue || !maxValue) {
      throw new ConfigurationError(`x-axis extents should both be Timestamps`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    try {
      this.interactions?.get().update(
          CHART, ACTION_BRUSH, new ValueMap(new Map([
            [ZOOM_START_KEY, minValue],
            [ZOOM_END_KEY, maxValue],
          ])));
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }
}
