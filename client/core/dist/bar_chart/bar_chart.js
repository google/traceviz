/**
 * @fileoverview Types for working with bar charts.
 */
import { categoryProperties, getDefinedCategory } from '../category/category.js';
import { renderSettingsFromProperties as categoryRenderSettingsFromProperties } from '../category_axis/category_axis.js';
import { getAxis } from '../continuous_axis/continuous_axis.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
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
export var Keys;
(function (Keys) {
    // Data types
    Keys["DATA_TYPE"] = "bar_chart_data_type";
    // Bar datum keys
    Keys["BAR_LOWER_EXTENT"] = "bar_chart_bar_lower_extent";
    Keys["BAR_UPPER_EXTENT"] = "bar_chart_bar_upper_extent";
    Keys["BOX_PLOT_MIN"] = "bar_chart_box_plot_min";
    Keys["BOX_PLOT_Q1"] = "bar_chart_box_plot_q1";
    Keys["BOX_PLOT_Q2"] = "bar_chart_box_plot_q2";
    Keys["BOX_PLOT_Q3"] = "bar_chart_box_plot_q3";
    Keys["BOX_PLOT_MAX"] = "bar_chart_box_plot_max";
    // Rendering properties.
    Keys["BAR_WIDTH_CAT_PX"] = "bar_chart_bar_width_cat_px";
    Keys["BAR_PADDING_CAT_PX"] = "bar_chart_bar_padding_cat_px";
})(Keys || (Keys = {}));
/** The different data types renderable by a bar chart. */
export var DataType;
(function (DataType) {
    DataType["STACKED_BARS"] = "bar_chart_stacked_bars";
    DataType["BAR"] = "bar_chart_bar";
    DataType["BOX_PLOT"] = "bar_chart_box_plot";
})(DataType || (DataType = {}));
/** A bar chart, containing multiple categories each with its own data. */
export class BarChart {
    axis;
    properties;
    categories;
    constructor(node) {
        this.axis = getAxis(node.properties);
        this.properties = node.properties;
        this.categories =
            node.children.map((child) => new BarChartCategory(child));
    }
    renderSettings() {
        return {
            barWidthCatPx: this.properties.expectNumber(Keys.BAR_WIDTH_CAT_PX),
            barPaddingCatPx: this.properties.expectNumber(Keys.BAR_PADDING_CAT_PX),
            categoryRenderSettings: categoryRenderSettingsFromProperties(this.properties),
        };
    }
}
/** A category within a bar chart, containing bar data. */
export class BarChartCategory {
    category;
    properties;
    barData = [];
    constructor(node) {
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
                            throw new ConfigurationError(`bar chart stacked bars must have only bars as children`)
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
                    throw new ConfigurationError(`bar chart category children must all be bar chart data`)
                        .from(SOURCE)
                        .at(Severity.ERROR);
            }
            this.barData.push(child);
        }
    }
}
//# sourceMappingURL=bar_chart.js.map