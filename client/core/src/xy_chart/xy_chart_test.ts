import 'jasmine';

import {node} from '../protocol/test_response.js';
import {dbl, str, strs, ts, valueMap} from '../value/test_value.js';
import {Coloring} from '../color/color.js';
import {Duration} from '../duration/duration.js';
import {Timestamp} from '../timestamp/timestamp.js';
import {XYChart} from './xy_chart.js';

function sec(sec: number): Timestamp {
  return new Timestamp(sec, 0);
}

function prettyPrintPointValue(val: Timestamp | Duration | number): string {
  if (val instanceof Timestamp) {
    return val.toDate().toString();
  }
  if (val instanceof Duration) {
    return val.toString();
  }
  return `${val}`;
}

function prettyPrint(chart: XYChart): string {
  const ret = new Array<string>();
  ret.push(`X Domain: [${prettyPrintPointValue(chart.xAxis.min)}, ${prettyPrintPointValue(
    chart.xAxis.max)}] (${chart.xAxis.category.displayName})`);
  ret.push(`Y Domain: [${prettyPrintPointValue(chart.yAxis.min)}, ${prettyPrintPointValue(
    chart.yAxis.max)}] (${chart.yAxis.category.displayName})`);
  const coloring = new Coloring(chart.properties);
  for (const series of chart.series) {
    const cat = series.category;
    const cols = coloring.colors(series.properties);
    ret.push(`  Category ${cat.id}: '${cat.displayName}' (${cat.description}, ${cols.primary})`);
    for (const point of series.points) {
      ret.push(`    (${prettyPrintPointValue(chart.xAxis.pointValue(point.properties))}, ${prettyPrintPointValue(chart.yAxis.pointValue(point.properties))})`);
      if (point.properties.has('story')) {
        ret.push(`      -> "${point.properties.expectString('story')}"`);
      }
    }
  }
  return ret.join(`\n`);
}

describe('xy chart test', () => {
  it('gets xy chart', () => {
    const chart = new XYChart(node(
      valueMap(
        {key: 'color_space_things', val: strs('blue')},
        {key: 'color_space_stuff', val: strs('red')},
      ),
      node(
        // axis definitions
        valueMap(),
        node(
          // x axis
          valueMap(
            {key: 'category_defined_id', val: str('x_axis')},
            {key: 'category_display_name', val: str('time from start')},
            {key: 'category_description', val: str('Time from start')},
            {key: 'axis_type', val: str('timestamp')},
            {key: 'axis_min', val: ts(sec(0))},
            {key: 'axis_max', val: ts(sec(100))},
          ),
        ),
        node(
          // y axis
          valueMap(
            {key: 'category_defined_id', val: str('y_axis')},
            {
              key: 'category_display_name',
              val: str('events per second')
            },
            {
              key: 'category_description',
              val: str('Events per second')
            },
            {key: 'axis_type', val: str('double')},
            {key: 'axis_min', val: dbl(0)},
            {key: 'axis_max', val: dbl(3)},
          ),
        ),
      ),
      node(
        // series definition
        valueMap(
          {key: 'category_defined_id', val: str('things')},
          {key: 'category_display_name', val: str('Remembered Things')},
          {key: 'category_description', val: str('Things we remembered')},
          {key: 'primary_color_space', val: str('color_space_things')},
          {key: 'primary_color_space_value', val: dbl(1)},
        ),
        node(valueMap(
          {key: 'x_axis', val: ts(sec(0))},
          {key: 'y_axis', val: dbl(3)},
          {key: 'story', val: str('We started out so well...')},
        )),
        node(valueMap(
          {key: 'x_axis', val: ts(sec(10))},
          {key: 'y_axis', val: dbl(2)},
        )),
        node(valueMap(
          {key: 'x_axis', val: ts(sec(20))},
          {key: 'y_axis', val: dbl(1)},
        )),
      ),
      node(
        valueMap(
          {key: 'category_defined_id', val: str('stuff')},
          {key: 'category_display_name', val: str('Forgotten Stuff')},
          {key: 'category_description', val: str('Stuff we forgot')},
          {key: 'primary_color_space', val: str('color_space_stuff')},
          {key: 'primary_color_space_value', val: dbl(1)},
        ),
        node(valueMap(
          {key: 'x_axis', val: ts(sec(80))},
          {key: 'y_axis', val: dbl(1)},
        )),
        node(valueMap(
          {key: 'x_axis', val: ts(sec(90))},
          {key: 'y_axis', val: dbl(2)},
        )),
        node(valueMap(
          {key: 'x_axis', val: ts(sec(100))},
          {key: 'y_axis', val: dbl(3)},
          {key: 'story', val: str('But it all ended so badly...')},
        )),
      ),
    ));
    expect(prettyPrint(chart))
      .toEqual(`X Domain: [${sec(0).toDate().toString()}, ${sec(100).toDate().toString()}] (time from start)
Y Domain: [0, 3] (events per second)
  Category things: 'Remembered Things' (Things we remembered, rgb(0, 0, 255))
    (${sec(0).toDate().toString()}, 3)
      -> "We started out so well..."
    (${sec(10).toDate().toString()}, 2)
    (${sec(20).toDate().toString()}, 1)
  Category stuff: 'Forgotten Stuff' (Stuff we forgot, rgb(255, 0, 0))
    (${sec(80).toDate().toString()}, 1)
    (${sec(90).toDate().toString()}, 2)
    (${sec(100).toDate().toString()}, 3)
      -> "But it all ended so badly..."`);
  });
});
