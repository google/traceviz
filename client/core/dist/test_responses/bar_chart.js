/*
    Copyright 2023 Google Inc.
    Licensed under the Apache License, Version 2.0 (the 'License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        https://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { dbl, int, str, valueMap } from '../value/test_value.js';
import { node } from '../protocol/test_response.js';
/**
 * A response containing a stacked bar chart depicting fictional fruit
 * preferences by continent.
 */
export const stackedDoubleFruitsByContinent = node(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('popularity') }, { key: 'category_description', val: str('popularity') }, { key: 'axis_type', val: str('double') }, { key: 'axis_min', val: dbl(0) }, { key: 'axis_max', val: dbl(100) }, { key: 'bar_chart_bar_width_cat_px', val: int(20) }, { key: 'bar_chart_bar_padding_cat_px', val: int(1) }, { key: 'category_header_cat_px', val: int(0) }, { key: 'category_handle_val_px', val: int(5) }, { key: 'category_padding_cat_px', val: int(2) }, { key: 'category_margin_val_px', val: int(0) }, { key: 'category_min_width_cat_px', val: int(20) }, { key: 'category_base_width_val_px', val: int(100) }), node(valueMap({ key: 'category_defined_id', val: str('europe') }, { key: 'category_display_name', val: str('europe') }, { key: 'category_description', val: str('europe') }, { key: 'detail_format', val: str('detail_format') }), node(valueMap({
    key: 'bar_chart_data_type',
    val: str('bar_chart_stacked_bars')
}), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_bar') }, { key: 'bar_chart_bar_lower_extent', val: dbl(0) }, { key: 'bar_chart_bar_upper_extent', val: dbl(12) }, { key: 'primary_color', val: str('red') }, { key: 'label_format', val: str('apples') })), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_bar') }, { key: 'bar_chart_bar_lower_extent', val: dbl(12) }, { key: 'bar_chart_bar_upper_extent', val: dbl(18) }, { key: 'primary_color', val: str('orange') }, { key: 'label_format', val: str('oranges') })))), node(valueMap({ key: 'category_defined_id', val: str('asia') }, { key: 'category_display_name', val: str('asia') }, { key: 'category_description', val: str('asia') }, { key: 'detail_format', val: str('detail_format') }), node(valueMap({
    key: 'bar_chart_data_type',
    val: str('bar_chart_stacked_bars')
}), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_bar') }, { key: 'bar_chart_bar_lower_extent', val: dbl(0) }, { key: 'bar_chart_bar_upper_extent', val: dbl(8) }, { key: 'primary_color', val: str('red') }, { key: 'label_format', val: str('apples') })), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_bar') }, { key: 'bar_chart_bar_lower_extent', val: dbl(8) }, { key: 'bar_chart_bar_upper_extent', val: dbl(22) }, { key: 'primary_color', val: str('orange') }, { key: 'label_format', val: str('oranges') })))));
/**
 * A response containing a series of box plots depicting fictional fruit
 * preferences by continent.
 */
export const boxPlotDoubleFruitsByContinent = node(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('popularity') }, { key: 'category_description', val: str('popularity') }, { key: 'axis_type', val: str('double') }, { key: 'axis_min', val: dbl(0) }, { key: 'axis_max', val: dbl(100) }, { key: 'bar_chart_bar_width_cat_px', val: int(20) }, { key: 'bar_chart_bar_padding_cat_px', val: int(1) }, { key: 'category_header_cat_px', val: int(0) }, { key: 'category_handle_val_px', val: int(5) }, { key: 'category_padding_cat_px', val: int(2) }, { key: 'category_margin_val_px', val: int(0) }, { key: 'category_min_width_cat_px', val: int(20) }, { key: 'category_base_width_val_px', val: int(100) }), node(valueMap({ key: 'category_defined_id', val: str('europe') }, { key: 'category_display_name', val: str('europe') }, { key: 'category_description', val: str('europe') }), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_box_plot') }, { key: 'bar_chart_box_plot_min', val: dbl(3) }, { key: 'bar_chart_box_plot_q1', val: dbl(4) }, { key: 'bar_chart_box_plot_q2', val: dbl(5) }, { key: 'bar_chart_box_plot_q3', val: dbl(7) }, { key: 'bar_chart_box_plot_max', val: dbl(12) }, { key: 'primary_color', val: str('red') }, {
    key: 'label_format',
    val: str('% with apples as favorite fruit')
})), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_box_plot') }, { key: 'bar_chart_box_plot_min', val: dbl(0) }, { key: 'bar_chart_box_plot_q1', val: dbl(1) }, { key: 'bar_chart_box_plot_q2', val: dbl(3) }, { key: 'bar_chart_box_plot_q3', val: dbl(4) }, { key: 'bar_chart_box_plot_max', val: dbl(7) }, { key: 'primary_color', val: str('orange') }, {
    key: 'label_format',
    val: str('% with oranges as favorite fruit')
}))), node(valueMap({ key: 'category_defined_id', val: str('asia') }, { key: 'category_display_name', val: str('asia') }, { key: 'category_description', val: str('asia') }), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_box_plot') }, { key: 'bar_chart_box_plot_min', val: dbl(2) }, { key: 'bar_chart_box_plot_q1', val: dbl(4) }, { key: 'bar_chart_box_plot_q2', val: dbl(5) }, { key: 'bar_chart_box_plot_q3', val: dbl(6) }, { key: 'bar_chart_box_plot_max', val: dbl(9) }, { key: 'primary_color', val: str('red') }, {
    key: 'label_format',
    val: str('% with apples as favorite fruit')
})), node(valueMap({ key: 'bar_chart_data_type', val: str('bar_chart_box_plot') }, { key: 'bar_chart_box_plot_min', val: dbl(1) }, { key: 'bar_chart_box_plot_q1', val: dbl(3) }, { key: 'bar_chart_box_plot_q2', val: dbl(6) }, { key: 'bar_chart_box_plot_q3', val: dbl(10) }, { key: 'bar_chart_box_plot_max', val: dbl(14) }, { key: 'primary_color', val: str('orange') }, {
    key: 'label_format',
    val: str('% with oranges as favorite fruit')
}))));
//# sourceMappingURL=bar_chart.js.map