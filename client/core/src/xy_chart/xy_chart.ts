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

/** @fileoverview Tools for working with two-dimensional series data.  See
 *  ../../../../server/go/xy_chart/xy_chart.go for more detail.
 */

import { Category, getDefinedCategory, categoryProperties } from '../category/category.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
import { DurationAxis, getAxis, NumberAxis, TimestampAxis } from '../continuous_axis/continuous_axis.js';

const SOURCE = 'xy_chart';

/** Represents a single datapoint within a series in an XY chart. */
export class Point {
  readonly properties: ValueMap;

  constructor(node: ResponseNode) {
    this.properties = node.properties;
  }
}

/** A series within an XY chart. */
export class Series {
  readonly category: Category;
  readonly points: ReadonlyArray<Point>;
  readonly properties: ValueMap;

  constructor(private readonly node: ResponseNode) {
    const cat = getDefinedCategory(node.properties);
    if (!cat) {
      throw new ConfigurationError(`each Series must define a category`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    this.category = cat;
    const points = new Array<Point>();
    for (const child of this.node.children) {
      points.push(new Point(child));
    }
    this.points = points;
    this.properties = this.node.properties.without(...categoryProperties);
  }
}

/** An XY chart. */
export class XYChart {
  readonly xAxis: TimestampAxis | DurationAxis | NumberAxis;
  readonly yAxis: TimestampAxis | DurationAxis | NumberAxis;
  readonly series: ReadonlyArray<Series>;
  readonly properties: ValueMap;

  constructor(node: ResponseNode) {
    if (node.children.length < 1) {
      throw new ConfigurationError(`xy-chart defines no axes`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    const axisGroup = node.children[0];
    if (axisGroup.children.length !== 2) {
      throw new ConfigurationError(
        `xy-chart defines ${axisGroup.children.length} axes; expected exactly 2`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    this.xAxis = getAxis(axisGroup.children[0].properties);
    this.yAxis = getAxis(axisGroup.children[1].properties);
    const series = new Array<Series>();
    for (const child of node.children.slice(1)) {
      series.push(new Series(child));
    }
    this.series = series;
    this.properties = node.properties;
  }
}
