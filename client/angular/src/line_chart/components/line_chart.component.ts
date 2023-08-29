/**
 * @fileoverview A component visualizing two dimensional data (specifically,
 * XYChart data) as a line chart.  The X and Y axis domains may be defined as
 * either double or as timestamp.  Series are rendered in order, so the last
 * series defined in the response is rendered on top.
 *
 * Series may be colored by color spaces defined in the data series' properties.
 *
 * LineChart supports a 'brush' action on the 'chart' target, triggered by
 * clicking and dragging a horizontal region of the chart to zoom into that
 * region (or double-clicking within the chart if the chart is already
 * zoomed-in). The 'brush' 'chart' target has two properties: `zoom_start` and
 * `zoom_end`, representing the lowest and highest extents of the zoomed
 * x-domain.
 *
 * LineChart also supports an `update_x_axis_marker` watch type.  This watch
 * expects a single `x_axis_marker_position` value, representing the point along
 * the x-domain where a callout marker should be drawn.
 */

import {AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import * as d3 from 'd3';
import {Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';
import {axisValue, ContinuousXAxis, ContinuousYAxis, scaleFromAxis, xAxisRenderSettings, yAxisRenderSettings} from 'traceviz-angular-axes';
import {AppCoreService, DataSeriesQueryDirective, InteractionsDirective} from 'traceviz-angular-core';
import {AppCore, Coloring, ConfigurationError, DataSeriesQuery, DoubleValue, Interactions, Point, ResponseNode, Series, Severity, Timestamp, TimestampValue, Value, ValueMap, XYChart as XYChartData} from 'traceviz-client-core';

const SOURCE = 'line_chart';

const CHART = 'chart';  // The entire chart area.

// A 'brush' (click-and-drag zoom or zoom reset) action.
const ACTION_BRUSH = 'brush';
// 'brush' actions on 'chart' update zoom bounds in 'chart's item keys.
const ZOOM_START_KEY = 'zoom_start';
const ZOOM_END_KEY = 'zoom_end';

const WATCH_TYPE_UPDATE_X_AXIS_MARKER = 'update_x_axis_marker';
const X_AXIS_MARKER_POSITION_KEY = 'x_axis_marker_position';

const supportedActions = new Array<[string, string]>(
    [CHART, ACTION_BRUSH]  // The chart area is brushed to zoom
);

const supportedWatches = [WATCH_TYPE_UPDATE_X_AXIS_MARKER];

/** A component displaying overtime two dimensional (xy chart) data. */
@Component({
  selector: 'line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'line_chart.component.html',
  styleUrls: ['line_chart.component.css'],
})
export class LineChart implements AfterContentInit, AfterViewInit, OnDestroy {
  @ContentChild(DataSeriesQueryDirective)
  dataSeries: DataSeriesQueryDirective|undefined;
  @ContentChild(InteractionsDirective, {descendants: false})
  interactionsDir: InteractionsDirective|undefined;
  @ContentChild(ContinuousXAxis) continuousXAxis: ContinuousXAxis|undefined;
  @ContentChild(ContinuousYAxis) continuousYAxis: ContinuousYAxis|undefined;

  @ViewChild('svg', {static: true}) svg!: ElementRef;
  @ViewChild('componentDiv') componentDiv!: ElementRef;
  @ViewChild('xAxis') xAxisElement!: ElementRef;
  @ViewChild('yAxisDiv') yAxisElement!: ElementRef;
  @ViewChild('loadingDiv', {static: true}) loadingDiv!: ElementRef;

  @Input() svgMargin = 4;

  loading = false;
  readonly redrawDebouncer = new Subject<void>();
  private readonly unsubscribe = new Subject<void>();
  private readonly markerUnsubscribe = new Subject<void>();
  private interactions: Interactions|undefined;
  private dataSeriesQuery: DataSeriesQuery|undefined;
  private xAxisMarkerVal: Date|number|undefined;
  chartData: XYChartData|undefined;

  constructor(
      private readonly appCoreService: AppCoreService,
      readonly ref: ChangeDetectorRef) {}

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore: AppCore) => {
      this.interactions = this.interactionsDir?.get();
      try {
        this.interactions?.checkForSupportedActions(supportedActions);
        this.interactions?.checkForSupportedReactions([]);
        this.interactions?.checkForSupportedWatches(supportedWatches);
        this.dataSeriesQuery = this.dataSeries?.dataSeriesQuery;
      } catch (err: unknown) {
        appCore.err(err);
      }
      // Publish loading status.
      this.dataSeriesQuery?.loading.pipe(takeUntil(this.unsubscribe))
          .subscribe((loading: boolean) => {
            this.loading = loading;
            if (this.loadingDiv !== undefined) {
              this.loadingDiv.nativeElement.style.display =
                  loading ? 'flex' : 'none';
            }
            // Force change detection.
            this.ref.detectChanges();
          });
      this.dataSeriesQuery?.response.pipe(takeUntil(this.unsubscribe))
          .subscribe((response: ResponseNode) => {
            try {
              this.chartData = XYChartData.fromNode(response);
            } catch (err: unknown) {
              appCore.err(err);
            }
            this.redrawDebouncer.next();
          });
      this.interactions?.watch(
          WATCH_TYPE_UPDATE_X_AXIS_MARKER, (vm: ValueMap) => {
            const markerVal = vm.get(X_AXIS_MARKER_POSITION_KEY);
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
                appCore.err(err);
              }
            }
          }, this.unsubscribe);
    });
    this.redrawDebouncer.pipe(takeUntil(this.unsubscribe), debounceTime(50))
        .subscribe(() => {
          try {
            this.redraw();
          } catch (err: unknown) {
            this.appCoreService.appCore.err(err);
          }
        });
  }

  ngAfterViewInit() {
    this.resize();
  }

  // Upon resize, update the SVG's dimensions and queue a redraw.
  resize() {
    if (!this.componentDiv) {
      return;
    }
    this.redrawDebouncer.next();
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
    this.markerUnsubscribe.next();
    this.markerUnsubscribe.complete();
  }

  redraw() {
    if (!this.componentDiv || !this.chartData) {
      return;
    }
    const xAxisData = this.chartData.xAxis;
    const yAxisData = this.chartData.yAxis;
    if (yAxisData.min === undefined || yAxisData.max === undefined ||
        xAxisData.min === undefined || xAxisData.max === undefined) {
      return;
    }
    const heightPx = this.componentDiv.nativeElement.offsetHeight;
    const widthPx = this.componentDiv.nativeElement.offsetWidth;

    // Figure out how much width the y-axis wants, and how much height the
    // x-axis wants.  Draw those axes, then use those values to compute the
    // available area for the main chart.
    let xAxisHeightPx = 0;
    let yAxisWidthPx = 0;
    const bottomAxisSettings = xAxisRenderSettings(this.chartData.properties);
    const leftAxisSettings = yAxisRenderSettings(this.chartData.properties);
    if (this.continuousXAxis) {
      xAxisHeightPx = bottomAxisSettings.axisDepthPx();
    }
    if (this.continuousYAxis) {
      yAxisWidthPx = leftAxisSettings.axisDepthPx();
    }
    const chartWidthPx = widthPx - yAxisWidthPx;
    const chartHeightPx = heightPx - xAxisHeightPx;
    if (this.continuousXAxis) {
      this.continuousXAxis.render(xAxisData, chartWidthPx, bottomAxisSettings);
    }
    if (this.continuousYAxis) {
      this.continuousYAxis.render(yAxisData, chartHeightPx, leftAxisSettings);
    }
    const yScale = scaleFromAxis(
        yAxisData, chartHeightPx - this.svgMargin, this.svgMargin);
    const xScale =
        scaleFromAxis(xAxisData, this.svgMargin, chartWidthPx - this.svgMargin);
    const svg = d3.select(this.svg.nativeElement);
    svg.attr('width', chartWidthPx)
        .attr('height', chartHeightPx)
        .select('.chart-area')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidthPx)
        .attr('height', chartHeightPx)
        .attr('fill-opacity', 0.6);

    // If an x-axis marker was requested, and it's in range, render it.
    if (this.xAxisMarkerVal !== undefined) {
      svg.select('.x-axis-marker').selectAll('*').remove();
      const pos = xScale(this.xAxisMarkerVal);
      if (pos >= 0 && pos <= chartWidthPx) {
        svg.select('.x-axis-marker')
            .append('line')
            .attr('x1', pos)
            .attr('y1', 0)
            .attr('x2', pos)
            .attr('y2', chartHeightPx)
            .style('stroke-width', 1)
            .style('stroke', 'yellow')
            .style('fill', 'none');
      }
    }
    // Render the data series.
    const coloring = new Coloring(this.chartData.properties);
    svg.select('.chart-area').selectAll('*').remove();
    svg.select('.chart-area')
        .selectAll('.line')
        .data(this.chartData.series)
        .enter()
        .append('path')
        .attr(
            'stroke',
            (s: Series) => {
              return coloring.colors(s.properties).primary || '';
            })
        .style('stroke-width', 1)
        .style('fill', 'none')
        .attr('d', (s: Series) => {
          return d3.line<Point>()
              .curve(d3.curveLinear)
              .x((p: Point) => xScale(axisValue(
                     xAxisData.value(p.properties, xAxisData.category.id))))
              .y((p: Point) => yScale(axisValue(yAxisData.value(
                     p.properties, yAxisData.category.id))))(s.points);
        });
    // Handle x-axis zooming.
    const lc = this;
    const brush =
        d3.brushX()
            .extent([[0, 0], [chartWidthPx, chartHeightPx]])
            .on('end', (event) => {
              try {
                const extent = event.selection;
                let minValue: Value|undefined;
                let maxValue: Value|undefined;
                if (!extent) {
                  minValue = new TimestampValue(new Timestamp(0, 0));
                  maxValue = new TimestampValue(new Timestamp(0, 0));
                } else {
                  const zoomDomainMin = xScale.invert(extent[0]);
                  const zoomDomainMax = xScale.invert(extent[1]);
                  if (zoomDomainMin instanceof Date &&
                      zoomDomainMax instanceof Date) {
                    minValue =
                        new TimestampValue(Timestamp.fromDate(zoomDomainMin));
                    maxValue =
                        new TimestampValue(Timestamp.fromDate(zoomDomainMax));
                  } else if (
                      (typeof zoomDomainMin === 'number') &&
                      (typeof zoomDomainMax === 'number')) {
                    minValue = new DoubleValue(zoomDomainMin);
                    maxValue = new DoubleValue(zoomDomainMax);
                  }
                }
                if (!minValue || !maxValue) {
                  throw new ConfigurationError(
                      `x-axis extents should either both be numbers, or both be Timestamps`)
                      .from(SOURCE)
                      .at(Severity.ERROR);
                }
                lc.interactions?.update(
                    // Reset the zoomed range
                    CHART, ACTION_BRUSH, new ValueMap(new Map([
                      [ZOOM_START_KEY, minValue],
                      [ZOOM_END_KEY, maxValue],
                    ])));
              } catch (err: unknown) {
                this.appCoreService.appCore.err(err);
              }
            });
    svg.select('.chart-area').append('g').attr('class', 'brush').call(brush);
  }
}
