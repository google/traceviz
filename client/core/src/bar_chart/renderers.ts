/**
 * @fileoverview A collection of types for rendering bar charts and their
 * categories.
 */

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

import {RenderedCategory, RenderedCategoryHierarchy} from '../category_axis/category_axis.js';
import {ConfigurationError, Severity} from '../errors/errors.js';
import {ValueMap} from '../value/value_map.js';

import {BarChart, DataType, Keys} from './bar_chart.js';

const SOURCE = 'bar_chart.renderers';

abstract class RenderedRect {
  constructor(
      readonly x0Px: number, readonly y0Px: number, readonly x1Px: number,
      readonly y1Px: number) {}

  abstract get properties(): ValueMap;

  get width(): number {
    return this.x1Px - this.x0Px;
  }

  get height(): number {
    return this.y1Px - this.y0Px;
  }
}

/** A stacked bars element rendered for display. */
export class RenderedStackedBars {
  constructor(readonly bars: RenderedBar[]) {}
}

/** A bar element rendered for display. */
export class RenderedBar extends RenderedRect {
  constructor(
      private readonly propertiesInternal: ValueMap, x0Px: number, y0Px: number,
      x1Px: number, y1Px: number) {
    super(x0Px, y0Px, x1Px, y1Px);
  }

  get properties(): ValueMap {
    return this.propertiesInternal;
  }
}

/** A box plot element rendered for display. */
export class RenderedBoxPlot {
  constructor(
      // Minimum to lower quartile.  For a horizontal box plot, usually rendered
      // as a vertical line from (x0,y0) to (x0, y1), then a horizontal line
      // from (x0, yM) to (x1, yM), where yM is the midpoint of y0 and y1.
      readonly q0ToQ1: RenderedBar,
      // Lower quartile to median.  For a horizontal box plot, usually rendered
      // as a rectangle from (x0, y0) to (x1, y1).  The median is a vertical
      // line from (x1, y0) to (x1, y1).
      readonly q1ToQ2: RenderedBar,
      // Median to upper quartile.  For a horizontal box plot, usually rendered
      // as a rectangle from (x0, y0) to (x1, y1).  The median is a vertical
      // line from (x0, y0) to (x0, y1).
      readonly q2ToQ3: RenderedBar,
      // Upper quartile to maximum.  For a horizontal box plot, usually rendered
      // as a horizontal line from (x0, yM) to (x1, yM), where yM is the
      // midpoint of y0 and y1, then a vertical line from (x1, y0) to (x1, y1).
      readonly q3ToQ4: RenderedBar) {}
}

/**
 * A rendered bar chart in which the y-axis shows categories and the x-axis
 * shows values.  It construes 'CatPx' in the render settings as the vertical
 * dimension, and 'ValPx' the horizontal.
 */
export class RenderedHorizontalBarChart {
  // This chart's categories, rendered into a category pane.
  readonly categoryHierarchy: RenderedCategoryHierarchy|undefined;
  // This chart's data, rendered into a chart pane.
  readonly data: Array<RenderedStackedBars|RenderedBar|RenderedBoxPlot> = [];
  // The width of the category pane, in pixels.
  readonly categoryWidthPx: number;
  // The height of both the category pane and the chart pane, in pixels.
  readonly chartHeightPx: number;
  // The width of the chart pane, in pixels.
  readonly chartWidthPx: number;

  constructor(barChart: BarChart, readonly barChartWidthPx: number) {
    const categories: RenderedCategory[] = [];
    const rs = barChart.renderSettings();
    this.categoryWidthPx = rs.categoryRenderSettings.categoryBaseWidthValPx;
    this.chartWidthPx = barChartWidthPx - this.categoryWidthPx;
    let categoryYOffset = 0;
    for (const cat of barChart.categories) {
      let yOffsetFromStartOfCategory = 0;
      for (const barData of cat.barData) {
        const dataType = barData.properties.expectString(Keys.DATA_TYPE);
        const y0 = categoryYOffset + yOffsetFromStartOfCategory;
        const y1 = y0 + rs.barWidthCatPx;
        switch (dataType) {
          case DataType.STACKED_BARS: {
            const bars: RenderedBar[] = [];
            for (const child of barData.children) {
              bars.push(new RenderedBar(
                  child.properties,
                  barChart.axis.valueToDomainFraction(
                      child.properties, Keys.BAR_LOWER_EXTENT) *
                      this.chartWidthPx,
                  y0,
                  barChart.axis.valueToDomainFraction(
                      child.properties, Keys.BAR_UPPER_EXTENT) *
                      this.chartWidthPx,
                  y1));
            }
            this.data.push(new RenderedStackedBars(bars));
            break;
          }
          case DataType.BAR: {
            this.data.push(new RenderedBar(
                barData.properties,
                barChart.axis.valueToDomainFraction(
                    barData.properties, Keys.BAR_LOWER_EXTENT) *
                    this.chartWidthPx,
                y0,
                barChart.axis.valueToDomainFraction(
                    barData.properties, Keys.BAR_UPPER_EXTENT) *
                    this.chartWidthPx,
                y1));
            break;
          }
          case DataType.BOX_PLOT: {
            const quantileKeys = [
              Keys.BOX_PLOT_MIN, Keys.BOX_PLOT_Q1, Keys.BOX_PLOT_Q2,
              Keys.BOX_PLOT_Q3, Keys.BOX_PLOT_MAX
            ];
            const addQuantileFrom = (quantileFrom: number) => new RenderedBar(
                barData.properties,
                barChart.axis.valueToDomainFraction(
                    barData.properties, quantileKeys[quantileFrom]) *
                    this.chartWidthPx,
                y0,
                barChart.axis.valueToDomainFraction(
                    barData.properties, quantileKeys[quantileFrom + 1]) *
                    this.chartWidthPx,
                y1);
            this.data.push(new RenderedBoxPlot(
                addQuantileFrom(0), addQuantileFrom(1), addQuantileFrom(2),
                addQuantileFrom(3)));
            break;
          }
          default:
            throw new ConfigurationError(
                `unsupported bar chart data type '${dataType}'`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        yOffsetFromStartOfCategory += rs.barPaddingCatPx + rs.barPaddingCatPx;
      }
      // If this category has any data, remove the last bar padding.
      if (yOffsetFromStartOfCategory > 0) {
        yOffsetFromStartOfCategory -= rs.barPaddingCatPx;
      }
      const categoryHeight = Math.max(
          rs.categoryRenderSettings.categoryMinWidthCatPx,
          yOffsetFromStartOfCategory);
      categories.push(new RenderedCategory(
          cat.category, cat.properties, rs.categoryRenderSettings, 0,
          categoryYOffset, rs.categoryRenderSettings.categoryBaseWidthValPx,
          categoryYOffset + categoryHeight));
      categoryYOffset +=
          categoryHeight + rs.categoryRenderSettings.categoryPaddingCatPx;
    }
    // If the chart has any categories, remove the last category padding.
    if (categoryYOffset > 0) {
      categoryYOffset -= rs.categoryRenderSettings.categoryPaddingCatPx;
    }
    this.chartHeightPx = categoryYOffset;
    this.categoryHierarchy =
        new RenderedCategoryHierarchy(barChart.properties, categories);
  }
}