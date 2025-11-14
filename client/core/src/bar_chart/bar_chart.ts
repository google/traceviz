/**
 * @fileoverview Types for working with bar charts.
 */

import {Category, categoryProperties, getDefinedCategory} from '../category/category';
import {RenderSettings as CategoryRenderSettings, renderSettingsFromProperties as categoryRenderSettingsFromProperties} from '../category_axis/category_axis';
import {Axis, getAxis} from '../continuous_axis/continuous_axis';
import {ConfigurationError, Severity} from '../errors/errors';
import {ResponseNode} from '../protocol/response_interface';
import {ValueMap} from '../value/value_map';

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

const SOURCE = 'bar_chart';

export enum Keys {
  // Data types
  DATA_TYPE = 'bar_chart_data_type',

  // Bar datum keys
  BAR_LOWER_EXTENT = 'bar_chart_bar_lower_extent',
  BAR_UPPER_EXTENT = 'bar_chart_bar_upper_extent',
  BOX_PLOT_MIN = 'bar_chart_box_plot_min',
  BOX_PLOT_Q1 = 'bar_chart_box_plot_q1',
  BOX_PLOT_Q2 = 'bar_chart_box_plot_q2',
  BOX_PLOT_Q3 = 'bar_chart_box_plot_q3',
  BOX_PLOT_MAX = 'bar_chart_box_plot_max',

  // Rendering properties.
  BAR_WIDTH_CAT_PX = 'bar_chart_bar_width_cat_px',
  BAR_PADDING_CAT_PX = 'bar_chart_bar_padding_cat_px',
}

/** The different data types renderable by a bar chart. */
export enum DataType {
  STACKED_BARS = 'bar_chart_stacked_bars',
  BAR = 'bar_chart_bar',
  BOX_PLOT = 'bar_chart_box_plot',
}

/**
 * A collection of settings for rendering bar charts.  A bar chart is rendered
 * on a two-dimensional plane, with one axis, the 'value axis', showing value
 * extents, and the other, the 'category axis', showing the category lanes in
 * which bars are rendered.
 * These settings are defined as extents, in units of pixels, along
 * these two axes, so are suffixed 'ValPx' for a pixel extent along the value
 * axis, or 'CatPx' for a pixel extent along the category axis.
 */
export interface RenderSettings {
  // The width of a bar along the category axis.  if x is the value axis, this
  // is the default height of a bar.
  barWidthCatPx: number;
  // The padding between adjacent bars along the category axis.  If x is the
  // value axis, this is the vertical spacing between bars.
  barPaddingCatPx: number;
  categoryRenderSettings: CategoryRenderSettings;
}

/** A bar chart, containing multiple categories each with its own data. */
export class BarChart {
  readonly axis: Axis<unknown>;
  readonly properties: ValueMap;
  readonly categories: BarChartCategory[];

  constructor(node: ResponseNode) {
    this.axis = getAxis(node.properties);
    this.properties = node.properties;
    this.categories =
        node.children.map((child: ResponseNode) => new BarChartCategory(child));
  }

  renderSettings(): RenderSettings {
    return {
      barWidthCatPx: this.properties.expectNumber(Keys.BAR_WIDTH_CAT_PX),
      barPaddingCatPx: this.properties.expectNumber(Keys.BAR_PADDING_CAT_PX),
      categoryRenderSettings:
          categoryRenderSettingsFromProperties(this.properties),
    };
  }
}

/** A category within a bar chart, containing bar data. */
export class BarChartCategory {
  readonly category: Category;
  readonly properties: ValueMap;
  readonly barData: ResponseNode[] = [];

  constructor(node: ResponseNode) {
    const category = getDefinedCategory(node.properties);
    if (category === undefined) {
      throw new ConfigurationError(`expected a bar chart category but got none`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    this.category = category;
    this.properties = node.properties.without(...categoryProperties);
    for (const child of node.children) {
      const dataType = child.properties.expectString(Keys.DATA_TYPE);
      switch (dataType) {
        case DataType.STACKED_BARS:
          for (const grandchild of child.children) {
            if (grandchild.properties.expectString(Keys.DATA_TYPE) !==
                DataType.BAR) {
              throw new ConfigurationError(
                  `bar chart stacked bars must have only bars as children`)
                  .from(SOURCE)
                  .at(Severity.ERROR);
            }
          }
          break;
        case DataType.BAR:
          break;
        case DataType.BOX_PLOT:
          break;
        default:
          throw new ConfigurationError(
              `bar chart category children must all be bar chart data`)
              .from(SOURCE)
              .at(Severity.ERROR);
      }
      this.barData.push(child);
    }
  }
}
