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

import {Component, ElementRef, forwardRef, ViewChild} from '@angular/core';
import * as d3 from 'd3';  // from //third_party/javascript/typings/d3:bundle
import {Duration, DurationAxis, NumberAxis, Timestamp, TimestampAxis, ValueMap} from 'traceviz-client-core';

enum Keys {
  X_AXIS_RENDER_LABEL_HEIGHT_PX = 'x_axis_render_label_height_px',
  X_AXIS_RENDER_MARKERS_HEIGHT_PX = 'x_axis_render_markers_height_px',
  Y_AXIS_RENDER_LABEL_WIDTH_PX = 'y_axis_render_label_width_px',
  Y_AXIS_RENDER_MARKERS_WIDTH_PX = 'y_axis_render_markers_width_px',
}

/**
 * A collection of settings for rendering continuous axes.  An axis bundles
 * 'axis markings', the lines, hashes, and labels representing the axis itself,
 * and an 'axis label'.  It is rendered along an edge of a chart; a horizontal
 * axis is rendered along the top and/or bottom of a chart, and a vertical along
 * the left and/or right side of a chart.
 *
 * An axis is rendered within a rectangle.  One side of this rectangle
 * represents the axis' domain -- for an x-axis, the top and bottom sides, along
 * whose extents the axis' domain is projected.  The other side of this
 * rectangle, the 'depth' of the axis orthogonal to the domain side, is only
 * used to provide space in which to render the axis markings and label.
 *
 * These settings are generally defined as extents, in units of pixels, along
 * these two sides, so are suffixed 'AxisPx' for a pixel extent along the
 * axis' domain side, or 'DepthPx' for a pixel extent along the non-domain side.
 */
export class ContinuousAxisRenderSettings {
  // The width of the axis markers along its depth side.
  axisMarkersDepthPx: number;
  // The width of the axis label along its depth side.
  axisLabelDepthPx: number;

  constructor() {
    this.axisMarkersDepthPx = 0;
    this.axisLabelDepthPx = 0;
  }

  axisDepthPx(): number {
    return this.axisMarkersDepthPx + this.axisLabelDepthPx;
  }
}

/**
 * Returns the x-axis ContinuousAxisRenderSettings defined in the provided
 * properties.   
 */
export function xAxisRenderSettings(properties: ValueMap): ContinuousAxisRenderSettings {
  const ret = new ContinuousAxisRenderSettings();
  ret.axisMarkersDepthPx = properties.expectNumber(Keys.X_AXIS_RENDER_MARKERS_HEIGHT_PX);
  ret.axisLabelDepthPx = properties.expectNumber(Keys.X_AXIS_RENDER_LABEL_HEIGHT_PX);
  return ret;
}

/**
 * Returns the y-axis ContinuousAxisRenderSettings defined in the provided
 * properties.   
 */
export function yAxisRenderSettings(properties: ValueMap): ContinuousAxisRenderSettings {
  const ret = new ContinuousAxisRenderSettings();
  ret.axisMarkersDepthPx = properties.expectNumber(Keys.Y_AXIS_RENDER_MARKERS_WIDTH_PX);
  ret.axisLabelDepthPx = properties.expectNumber(Keys.Y_AXIS_RENDER_LABEL_WIDTH_PX);
  return ret;
}
/**
 * Converts TraceViz axis data types (Timestamp, Duration, number) to native
 * JS/d3 data types (Date, number).
 */
export function axisValue(val: Timestamp|Duration|number): Date|number {
  if (val instanceof Timestamp) {
    return val.toDate();
  }
  if (val instanceof Duration) {
    return val.nanos;
  }
  return val;
}

/**
 * Returns a d3 scale from the provided axis, across the provided range.
 */
export function scaleFromAxis(
    axis: TimestampAxis|DurationAxis|NumberAxis, rangeLowPx: number,
    rangeHighPx: number) {
  return (axis instanceof TimestampAxis) ?
      d3.scaleTime()
          .domain([
            axisValue(axis.min),
            axisValue(axis.max),
          ])
          .range([rangeLowPx, rangeHighPx]) :
      d3.scaleLinear()
          .domain([
            axisValue(axis.min),
            axisValue(axis.max),
          ])
          .range([rangeLowPx, rangeHighPx]);
}

/** A base class for components displaying continuous Y axes. */
export abstract class ContinuousYAxis {
  abstract render(
      axis: TimestampAxis|DurationAxis|NumberAxis, heightPx: number,
      renderSettings: ContinuousAxisRenderSettings): void;
}

/**
 * A standard continuous Y axis, rendered so that markings face the right.
 */
@Component({
  selector: 'standard-continuous-y-axis',
  styles: [`
    :host {
      display: flex;
    }
    svg {
      display: block;
    }
    `],
  template: `
    <svg #svg>
      <g class="y-axis"></g>
      <g class="y-axis-label"></g>
    </svg>
  `,
  providers: [{
    provide: ContinuousYAxis,
    useExisting: forwardRef(() => StandardContinuousYAxis)
  }],
})
export class StandardContinuousYAxis extends ContinuousYAxis {
  @ViewChild('svg', {static: true}) svg!: ElementRef;
   override render(
      axis: TimestampAxis|DurationAxis|NumberAxis, heightPx: number,
      renderSettings: ContinuousAxisRenderSettings) {
    const yAxisArea = d3.select(this.svg.nativeElement);
    yAxisArea.attr('height', heightPx)
        .attr('width', renderSettings.axisDepthPx());
    const yScale = scaleFromAxis(axis, heightPx, 0);
    const yAxis = d3.axisLeft(yScale);

    // Render the axes and axis labels.
    yAxisArea.select<SVGGElement>('.y-axis')
        .attr(
            'transform',
            `translate(${
                renderSettings.axisMarkersDepthPx +
                renderSettings.axisLabelDepthPx}, 0)`)
        .call(yAxis);
    yAxisArea.select('.y-axis-label').selectAll('*').remove();
    yAxisArea.select('.y-axis-label')
        .append('text')
        // rotating by -90 means (x, y) <- (-y, x).  I think.
        .attr('x', -heightPx / 2)
        .attr('y', renderSettings.axisLabelDepthPx)
        .attr('transform', 'rotate(-90)')
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', 'white')
        .attr('font-family', 'sans-serif')
        .text(axis.category.displayName);
  }
}

/** A base class for components displaying continuous X axes. */
export abstract class ContinuousXAxis {
  abstract render(
      axis: TimestampAxis|DurationAxis|NumberAxis, heightPx: number,
      renderSettings: ContinuousAxisRenderSettings): void;
}

/**
 * A continuous X axis, rendered so that markings face up.
 */
@Component({
  selector: 'standard-continuous-x-axis',
  styles: [`
    :host {
      display: flex;
    }
    svg {
      display: block;
    }
    `],
  template: `
    <svg #svg>
      <g class="x-axis"></g>
      <g class="x-axis-label"></g>
    </svg>
  `,
  providers: [{
    provide: ContinuousXAxis,
    useExisting: forwardRef(() => StandardContinuousXAxis)
  }],
})
export class StandardContinuousXAxis extends ContinuousXAxis {
  @ViewChild('svg', {static: true}) svg!: ElementRef;
  override render(
      axis: TimestampAxis|DurationAxis|NumberAxis, widthPx: number,
      renderSettings: ContinuousAxisRenderSettings) {
    const xAxisArea = d3.select(this.svg.nativeElement);
    xAxisArea.attr('width', widthPx)
        .attr('height', renderSettings.axisDepthPx());
    const xScale = scaleFromAxis(axis, 0, widthPx);
    const xAxis = d3.axisBottom(xScale);

    // Render the axes and axis labels.
    xAxisArea.select<SVGGElement>('.x-axis').call(xAxis);
    xAxisArea.select('.x-axis-label').selectAll('*').remove();
    xAxisArea.select('.x-axis-label')
        .append('text')
        .attr('x', widthPx / 2)
        .attr(
            'y',
            renderSettings.axisMarkersDepthPx + renderSettings.axisLabelDepthPx)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', 'white')
        .attr('font-family', 'sans-serif')
        .text(axis.category.displayName);
  }
}
