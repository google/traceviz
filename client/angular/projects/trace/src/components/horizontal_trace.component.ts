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

import {animate, style, transition, trigger} from '@angular/animations';
import {AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Directive, ElementRef, HostListener, Input, OnDestroy, ViewChild} from '@angular/core';
import {CategoryHierarchyYAxis, ContinuousXAxis, scaleFromAxis, xAxisRenderSettings} from '@google/traceviz-angular-axes';
import {AppCoreService, InteractionsDirective, ValueDirective} from '@google/traceviz-angular-core';
import {Coloring, ConfigurationError, DoubleValue, getLabel, renderCategoryHierarchyForHorizontalSpans, RenderedCategoryHierarchy, RenderedTraceEdge, RenderedTraceSpan, RenderedTraceSpans, renderHorizontalTraceSpans, Severity, StringValue, Timestamp, TimestampValue, Trace, Value, ValueMap} from '@google/traceviz-client-core';
import * as d3 from 'd3';
import {Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';

import {TraceProvider} from '../directives/trace_provider.directive';

const SOURCE = 'trace_component';

const DEFAULT_VERTICAL_RULE_COLOR = 'yellow';

enum Keys {
  VERTICAL_RULE_COLOR = 'vertical_rule_color',
  DETAIL_FORMAT = 'detail_format',

  // Watch keys
  CALLED_OUT_CATEGORY_ID = 'called_out_category_id',
  CATEGORY_ID = 'category_id_key',
  VERTICAL_RULE_POSITION = 'vertical_rule_position',

  // 'brush' actions on 'chart' update zoom bounds in 'chart's item keys.
  ZOOM_START = 'zoom_start',
  ZOOM_END = 'zoom_end',

}

enum Targets {
  SPAN = 'span',    // Trace spans.
  CHART = 'chart',  // The chart area.
  EDGE = 'edge',    // Trace edges.
}

enum Actions {
  CLICK = 'click',
  MOUSEOVER = 'mouseover',
  MOUSEOUT = 'mouseout',
  // A 'brush' (click-and-drag zoom or zoom reset) action.
  BRUSH = 'brush',
}

enum Watches {
  UPDATE_CALLED_OUT_CATEGORY = 'update_called_out_category',
  UPDATE_VERTICAL_RULE = 'update_vertical_rule',
}

enum Reactions {
  HIGHLIGHT = 'highlight',
}

const supportedActions = new Array<[string, string]>(
    [Targets.SPAN, Actions.MOUSEOVER],  // A span is moused over.
    [Targets.SPAN, Actions.MOUSEOUT],   // A span is moused out of.
    [Targets.SPAN, Actions.CLICK],      // A span is clicked.
    [Targets.CHART, Actions.BRUSH]      // The chart area is brushed to zoom.
);

const supportedReactions = new Array<[string, string]>(
    [Targets.EDGE, Reactions.HIGHLIGHT],  // A trace edge highlights.
    [Targets.SPAN, Reactions.HIGHLIGHT],  // A span or subspan highlights.
);

const supportedWatches = [
  Watches.UPDATE_CALLED_OUT_CATEGORY,
  Watches.UPDATE_VERTICAL_RULE,
];

const movementKeys = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown',
  'ArrowRight'
];
const upKeys = ['KeyW', 'ArrowUp'];
const downKeys = ['KeyS', 'ArrowDown'];
const rightKeys = ['KeyD', 'ArrowRight'];

@Directive({
  standalone: false,
  selector: 'vertical-rule-color',
})
export class VerticalRuleColorDirective {
  @ContentChild(ValueDirective) verticalRuleColorVal: ValueDirective|undefined;
  get(): StringValue {
    if (this.verticalRuleColorVal !== undefined) {
      const val = this.verticalRuleColorVal.get();
      if (val instanceof StringValue) {
        return val;
      }
    }
    throw new ConfigurationError('vertical-rule-color must wrap a string Value')
        .from(SOURCE)
        .at(Severity.ERROR);
  }
}

/**
 * Presents a view of trace data in which the x-axis is trace time and spans
 * extend horizontally, with trace categories on the y-axis.
 */
@Component({
  standalone: false,
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
          <g class="spans"></g>
          <g class="edges"></g>
          <g class="x-axis-marker"></g>
        </svg>
      </div>
      <div class="chart-grid-item">
      </div>
      <div class="chart-grid-item">
        <ng-content select="[id=chartBottom]"></ng-content>
      </div>
      <button class="reset-zoom-button" mat-raised-button (click)="resetZoom()">Reset Zoom</button>
      <div class="help-text-overlay" #helpTextOverlay>
        <span class="help-text" *ngIf="showOverlayInstructions" [@fadeInOut]>Alt + Scroll to zoom, Shift + Scroll to pan<br>WASD/Arrow Keys to zoom/pan</span>
      </div>
    </div>
  </div>
</div>
`,
  styleUrls: ['trace.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [   // :enter is alias to 'void => *'
        style({opacity:0}),
        animate(500, style({opacity:1}))
      ]),
      transition(':leave', [   // :leave is alias to '* => void'
        animate(500, style({opacity:0}))
      ])
    ])
  ]
})
export class HorizontalTraceComponent implements AfterContentInit,
                                                 AfterViewInit, OnDestroy {
  // The source of trace data.
  @ContentChild(TraceProvider) traceDirective: TraceProvider|undefined;
  @ContentChild(InteractionsDirective, {descendants: false})
  interactions: InteractionsDirective|undefined;
  @ContentChild(ContinuousXAxis) continuousXAxis: ContinuousXAxis|undefined;
  @ContentChild(CategoryHierarchyYAxis)
  categoryHierarchyYAxis: CategoryHierarchyYAxis|undefined;
  @ContentChild(VerticalRuleColorDirective)
  verticalRuleColorDir: VerticalRuleColorDirective|undefined;

  @ViewChild('chart', {static: true}) chart!: ElementRef;

  @ViewChild('loadingDiv', {static: true}) loadingDiv: ElementRef|undefined;
  @ViewChild('componentDiv') componentDiv!: ElementRef;
  @ViewChild('helpTextOverlay') helpTextOverlay!: ElementRef;

  @Input() maxFrameHeightPx = 20;
  @Input() transitionDurationMs = 500;

  readonly unsubscribe = new Subject<void>();
  private viewUnsubscribe = new Subject<void>();
  readonly redrawDebouncer = new Subject<void>();
  readonly hideHelpOverlayDebouncer = new Subject<void>();
  private trace: Trace<unknown>|undefined;
  tooltip = '';
  private verticalRuleColor = DEFAULT_VERTICAL_RULE_COLOR;

  private renderedSpans: RenderedTraceSpans|undefined;
  private renderedCategories: RenderedCategoryHierarchy|undefined;
  // The current width of the trace chart.  This is generally the width of
  // componentDiv less the width of the rendered category y-axis.
  private chartWidthPx = 0;
  private mouseXPosition: number|null = null;
  showOverlayInstructions = false;

  private xAxisMarkerVal: Date|number|undefined;

  constructor(
      private readonly appCoreService: AppCoreService,
      private readonly changeDetectorRef: ChangeDetectorRef) {}

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      if (this.verticalRuleColorDir !== undefined) {
        this.verticalRuleColorDir.get()
            .pipe(takeUntil(this.unsubscribe))
            .subscribe((verticalRuleColorVal) => {
              this.verticalRuleColor =
                  (verticalRuleColorVal as StringValue).val;
              this.redraw();
            });
      }
      if (this.traceDirective !== undefined) {
        // Display the loading spinner while data is loading.
        this.traceDirective.loading.pipe(takeUntil(this.unsubscribe))
            .subscribe((loading) => {
              if (this.loadingDiv !== undefined) {
                this.loadingDiv.nativeElement.style.display =
                    loading ? 'block' : 'none';
              }
            });
        // Upon new trace data, update the referenced trace and enqueue a
        // redraw.
        this.traceDirective.trace.pipe(takeUntil(this.unsubscribe))
            .subscribe((trace) => {
              if (!trace) {
                return;
              }
              this.trace = trace;
              // End all subscriptions for the previous view.
              this.viewUnsubscribe.next();
              this.viewUnsubscribe.complete();
              this.viewUnsubscribe = new Subject<void>();
              this.renderedSpans = undefined;
              this.renderedCategories = undefined;
              this.redrawDebouncer.next();
            });
      }
      // Debounce redraw requests.
      this.redrawDebouncer.pipe(takeUntil(this.unsubscribe), debounceTime(50))
          .subscribe(() => {
            try {
              this.redraw();
            } catch (err: unknown) {
              appCore.err(err);
            }
          });
      // Validate and register actions and watches.
      this.interactions?.get().checkForSupportedActions(supportedActions);
      this.interactions?.get().checkForSupportedReactions(supportedReactions);
      this.interactions?.get().checkForSupportedWatches(supportedWatches);
      const watchActions = new Map([
        [
          Watches.UPDATE_CALLED_OUT_CATEGORY,
          (vm: ValueMap) => {
            try {
              // When the called-out category changes, remove the existing
              // highlight band and, if a valid category is called-out, draw a
              // new band there.
              const chartArea = d3.select(this.chart.nativeElement);
              chartArea.select('.called-out-category-band')
                  .selectAll('rect')
                  .remove();
              if (this.renderedCategories === undefined) {
                return;
              }
              if (!vm.has(Keys.CALLED_OUT_CATEGORY_ID)) {
                throw new ConfigurationError(
                    `watch action '${
                        Watches.UPDATE_CALLED_OUT_CATEGORY}' requires '${
                        Keys.CALLED_OUT_CATEGORY_ID}' parameter`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
              }
              const calledOutCategoryVal = vm.get(Keys.CALLED_OUT_CATEGORY_ID);
              if (!vm.has(Keys.CATEGORY_ID)) {
                throw new ConfigurationError(
                    `watch action '${
                        Watches.UPDATE_CALLED_OUT_CATEGORY}' requires '${
                        Keys.CATEGORY_ID}' parameter`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
              }
              const categoryIDKey = vm.expectString(Keys.CATEGORY_ID);
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
        [
          Watches.UPDATE_VERTICAL_RULE,
          (vm: ValueMap) => {
            const markerVal = vm.get(Keys.VERTICAL_RULE_POSITION);
            if (markerVal instanceof TimestampValue) {
              this.xAxisMarkerVal = markerVal.val.toDate();
            } else if (markerVal instanceof DoubleValue) {
              this.xAxisMarkerVal = markerVal.val;
            } else {
              this.xAxisMarkerVal = undefined;
            }
            if (this.xAxisMarkerVal !== undefined) {
              try {
                this.redraw();
              } catch (err: unknown) {
                this.appCoreService.appCore.err(err);
              }
            }
          }
        ],
      ]);
      this.interactions?.get()
          .watchAll(watchActions, this.unsubscribe)
          .subscribe((err: unknown) => {
            this.appCoreService.appCore.err(err);
          });
      // Debounce redraw requests.
      this.hideHelpOverlayDebouncer
          .pipe(takeUntil(this.unsubscribe), debounceTime(1700))
          .subscribe(() => {
            this.showOverlayInstructions = false;
            this.changeDetectorRef.detectChanges();
          });
    });
  }

  ngAfterViewInit() {
    this.resize();
    const chartElement = this.chart.nativeElement;
    // Track mouse X position over component for zooming
    chartElement.addEventListener('mousemove', (event: MouseEvent) => {
      this.mouseXPosition = event.offsetX;
    });
    chartElement.addEventListener('mouseleave', (event: MouseEvent) => {
      this.mouseXPosition = null;
    });
    // Add mousewheel listener for zooming and panning
    chartElement.addEventListener('mousewheel', (event: WheelEvent) => {
      const direction = event.deltaY > 0 ? 1 : -1;
      if (event.altKey) {
        event.preventDefault();
        this.zoomChart(direction);
      } else if (event.shiftKey) {
        event.preventDefault();
        this.scrollChart(direction);
      } else {
        this.helpTextOverlay.nativeElement.style.position =
            event.offsetY > event.clientY - event.deltaY ? 'fixed' : 'absolute';
        this.showOverlayInstructions = true;
        this.changeDetectorRef.detectChanges();
        this.hideHelpOverlayDebouncer.next();
      }
    });
  }

  // Add keydown listener for zooming and panning
  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (this.mouseXPosition && movementKeys.includes(event.code)) {
      event.preventDefault();
      const direction =
          downKeys.includes(event.code) || rightKeys.includes(event.code) ? 1 :
                                                                            -1;
      if (upKeys.includes(event.code) || downKeys.includes(event.code)) {
        this.zoomChart(direction);
      } else {
        this.scrollChart(direction);
      }
    }
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  // Upon mousing over a span, show a tooltip with its details.
  handleSpanMouseover(data: RenderedTraceSpan) {
    try {
      this.interactions?.get().update(
          Targets.SPAN, Actions.MOUSEOVER, data.properties);
      this.tooltip = data.properties.format(
          data.properties.expectString(Keys.DETAIL_FORMAT));
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }

  // Upon mousing out of a span, clear the tooltip.
  handleSpanMouseout(data: RenderedTraceSpan) {
    try {
      this.interactions?.get().update(
          Targets.SPAN, Actions.MOUSEOUT, data.properties);
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
    try {
      if (!this.componentDiv || !this.trace) {
        return;
      }
      if (this.renderedCategories === undefined) {
        // Render the trace categories first, to get the width the category axis
        // will require.
        this.renderedCategories =
            renderCategoryHierarchyForHorizontalSpans(this.trace);
        // Compute the available chart width.
        // const widthPx = this.componentDiv.nativeElement.offsetWidth;
        // const categoryWidthPx = this.renderedCategories.widthPx;
      }
      const widthPx = this.componentDiv.nativeElement.offsetWidth;
      const categoryWidthPx = this.renderedCategories.widthPx;
      this.chartWidthPx = widthPx - categoryWidthPx;
      if (this.renderedSpans === undefined) {
        this.renderedSpans =
            renderHorizontalTraceSpans(this.trace, this.chartWidthPx);
        // Set up highlight-observation subscriptions for all spans and edges.
        const interactions = this.interactions?.get();
        if (interactions !== undefined) {
          for (const renderedSpan of this.renderedSpans.spans) {
            interactions
                .match(
                    Targets.SPAN, Reactions.HIGHLIGHT)(renderedSpan.properties)
                .pipe(takeUntil(this.viewUnsubscribe))
                .subscribe((match) => {
                  if (match != renderedSpan.highlighted) {
                    renderedSpan.highlighted = match;
                    this.redraw();
                  }
                });
          }
          for (const renderedEdge of this.renderedSpans.edges) {
            interactions
                .match(
                    Targets.EDGE, Reactions.HIGHLIGHT)(renderedEdge.properties)
                .pipe(takeUntil(this.viewUnsubscribe))
                .subscribe((match) => {
                  if (match != renderedEdge.highlighted) {
                    renderedEdge.highlighted = match;
                    this.redraw();
                  }
                });
          }
        }
      }
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
          .select('.spans')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', this.chartWidthPx)
          .attr('height', heightPx);
      chartArea.select('.edges')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', this.chartWidthPx)
          .attr('height', heightPx);
      this.chart.nativeElement.style.display = 'block';
      // If an x-axis marker was requested, and it's in range, render it.
      if (this.xAxisMarkerVal !== undefined) {
        const xScale = scaleFromAxis(this.trace.axis, 0, this.chartWidthPx);
        chartArea.select('.x-axis-marker').selectAll('*').remove();
        const pos = xScale(this.xAxisMarkerVal);
        if (pos >= 0 && pos <= this.chartWidthPx) {
          chartArea.select('.x-axis-marker')
              .append('line')
              .attr('x1', pos)
              .attr('y1', 0)
              .attr('x2', pos)
              .attr('y2', heightPx)
              .style('stroke-width', 1)
              .style('stroke', this.verticalRuleColor)
              .style('fill', 'none');
        }
      }
      const coloring = new Coloring(this.trace.properties);
      const primaryOrSecondary =
          (properties: ValueMap, highlighted: boolean) => {
            if (!highlighted) {
              return coloring.colors(properties).primary || '';
            }
            return coloring.colors(properties).secondary || '';
          };
      const strokeOrSecondary =
          (properties: ValueMap, highlighted: boolean) => {
            if (!highlighted) {
              return coloring.colors(properties).stroke || '';
            }
            return coloring.colors(properties).secondary || '';
          };

      // Create a bounding svg for each frame.  Add a colored rectangle and a
      // text to each.
      const nodes = chartArea.select('.spans')
                        .selectAll<SVGSVGElement, RenderedTraceSpan>('svg')
                        .data(this.renderedSpans.spans, d => d.renderID);
      // Remove any extra nodes.
      nodes.exit().remove();
      // Add any new nodes.  Each added node consists of a container SVG,
      // with a rectangle and text nested beneath it.
      const enteredNodes =
          nodes.enter()
              .append('svg')
              .on('mouseover',
                  (event: any, rs: RenderedTraceSpan) => {
                    const n = nodes.nodes();
                    const i = n.indexOf(event.target);
                    d3.select(n[i]).select('rect').attr('stroke', 'lime');
                    this.handleSpanMouseover(rs);
                  })
              .on('mouseout',
                  (event: any, rs: RenderedTraceSpan) => {
                    const n = nodes.nodes();
                    const i = n.indexOf(event.target);
                    rs = rs;
                    d3.select(n[i]).select('rect').attr('stroke', 'none');
                    this.handleSpanMouseout(rs);
                  })
              .on('click', (rs: RenderedTraceSpan) => {
                try {
                  this.interactions?.get().update(
                      Targets.SPAN, Actions.CLICK, rs.properties);
                } catch (err: unknown) {
                  this.appCoreService.appCore.err(err);
                }
              });
      enteredNodes.append('rect');
      enteredNodes.append('text');
      const mergedNodes =
          nodes.merge(enteredNodes)
              .attr('x', (rs: RenderedTraceSpan) => rs.x0Px)
              .attr('y', (rs: RenderedTraceSpan) => rs.y0Px)
              .attr(
                  'width',
                  (rs: RenderedTraceSpan) => rs.width === 0 ? 1 : rs.width)
              .attr('height', (rs: RenderedTraceSpan) => rs.height);
      mergedNodes.select('rect')
          .attr(
              'width', (rs: RenderedTraceSpan) => rs.width === 0 ? 1 : rs.width)
          .attr('height', (rs: RenderedTraceSpan) => rs.height)
          .attr('fill', (rs: RenderedTraceSpan) => {
            return primaryOrSecondary(rs.properties, rs.highlighted);
          });
      mergedNodes.select('text')
          .attr('dominant-baseline', 'hanging')
          .attr('y', (rs: RenderedTraceSpan) => 1)
          .attr(
              'fill',
              (rs: RenderedTraceSpan) => {
                return strokeOrSecondary(rs.properties, rs.highlighted);
              })
          .text((rs: RenderedTraceSpan) => getLabel(rs.properties));

      // Update all node svgs, rects, and texts with their new positions,
      // colors, and contents.  This version of d3 update uses a lambda
      // receiving a d3 selection; as d3 is untyped, this is `any` for now.
      mergedNodes.call(
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
      mergedNodes.call(
          // tslint:disable-next-line:no-any
          (update: any) => {
            update.select('rect')
                .transition()
                .duration(this.transitionDurationMs)
                .attr(
                    'width',
                    (rs: RenderedTraceSpan) => rs.width === 0 ? 1 : rs.width)
                .attr('height', (rs: RenderedTraceSpan) => rs.height)
                .attr('fill', (rs: RenderedTraceSpan) => {
                  return primaryOrSecondary(rs.properties, rs.highlighted);
                });
          });
      mergedNodes.call(
          // tslint:disable-next-line:no-any
          (update: any) => {
            update.select('text')
                .attr('dominant-baseline', 'hanging')
                .attr('y', (rs: RenderedTraceSpan) => 1)
                .attr(
                    'fill',
                    (rs: RenderedTraceSpan) => {
                      return strokeOrSecondary(rs.properties, rs.highlighted);
                    })
                .text((rs: RenderedTraceSpan) => getLabel(rs.properties));
          });

      // Add trace edges.
      const edges = chartArea.select('.edges')
                        .selectAll<SVGLineElement, RenderedTraceEdge>('line')
                        .data(this.renderedSpans.edges, d => d.renderID);
      edges.exit().remove();
      const enteredEdges = edges.enter().append('line');
      const mergedEdges =
          edges.merge(enteredEdges)
              .attr('x1', (re: RenderedTraceEdge) => re.x0Px)
              .attr('y1', (re: RenderedTraceEdge) => re.y0Px)
              .attr('x2', (re: RenderedTraceEdge) => re.x1Px)
              .attr('y2', (re: RenderedTraceEdge) => re.y1Px)
              .attr('stroke', (re: RenderedTraceEdge) => {
                return strokeOrSecondary(re.properties, re.highlighted);
              });
      mergedEdges.call(
          // tslint:disable-next-line:no-any
          (update: any) => {
            update.select('line')
                .transition()
                .duration(this.transitionDurationMs)
                .attr('x1', (re: RenderedTraceEdge) => re.x0Px)
                .attr('y1', (re: RenderedTraceEdge) => re.y0Px)
                .attr('x2', (re: RenderedTraceEdge) => re.x1Px)
                .attr('y2', (re: RenderedTraceEdge) => re.y1Px)
                .attr('stroke', (re: RenderedTraceEdge) => {
                  return strokeOrSecondary(re.properties, re.highlighted);
                });
          });

      // Handle x-axis zooming.
      const ht = this;
      const brush = d3.brushX()
                        .extent([[0, 0], [ht.chartWidthPx, heightPx]])
                        .on('end', (event: any) => {
                          ht.brush(event.selection, () => {
                            chartArea.select<SVGGElement>('.brush').call(
                                brush.move, null);
                          });
                        });
      chartArea.select<SVGGElement>('.brush').call(brush);
    } catch (err: any) {
      this.appCoreService.appCore.err(err);
    }
  }

  resetZoom() {
    this.brush(undefined, () => {});
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
          Targets.CHART, Actions.BRUSH, new ValueMap(new Map([
            [Keys.ZOOM_START, minValue],
            [Keys.ZOOM_END, maxValue],
          ])));
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }

  zoomChart(direction: number) {
    if (!this.mouseXPosition) {
      return;
    }
    const zoomPercentChange = direction * .2;
    const leftPercentChange =
        -1 * zoomPercentChange * this.mouseXPosition / this.chartWidthPx;
    const rightPercentChange = zoomPercentChange + leftPercentChange;
    const chartMin = leftPercentChange * this.chartWidthPx;
    const chartMax = this.chartWidthPx + rightPercentChange * this.chartWidthPx;
    this.moveChart(chartMin, chartMax);
  }

  scrollChart(direction: number) {
    const movementPx = direction * 200;
    const chartMin = 0 + movementPx;
    const chartMax = this.chartWidthPx + movementPx;
    this.moveChart(chartMin, chartMax);
  }

  moveChart(chartMin: number, chartMax: number) {
    if (!this.trace) {
      return;
    }
    const xScale = scaleFromAxis(this.trace.axis, 0, this.chartWidthPx);
    const zoomDomainMin = xScale.invert(chartMin);
    const zoomDomainMax = xScale.invert(chartMax);
    if (zoomDomainMin instanceof Date && zoomDomainMax instanceof Date) {
      const minTimestamp = Timestamp.fromDate(zoomDomainMin);
      const maxTimestamp = Timestamp.fromDate(zoomDomainMax);
      const minValue = new TimestampValue(minTimestamp);
      const maxValue = new TimestampValue(maxTimestamp);
      try {
        this.interactions?.get().update(
            Targets.CHART, Actions.BRUSH, new ValueMap(new Map([
              [Keys.ZOOM_START, minValue],
              [Keys.ZOOM_END, maxValue],
            ])));
      } catch (err: unknown) {
        this.appCoreService.appCore.err(err);
      }
    }
  }
}
