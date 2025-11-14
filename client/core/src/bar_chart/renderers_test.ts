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

import 'jasmine';

import {RenderedCategory, RenderedCategoryHierarchy} from '../category_axis/category_axis.js';
import {boxPlotDoubleFruitsByContinent, stackedDoubleFruitsByContinent} from '../test_responses/bar_chart.js';

import {BarChart} from './bar_chart.js';
import {RenderedBar, RenderedBoxPlot, RenderedHorizontalBarChart, RenderedStackedBars} from './renderers.js';

function prettyprintCategory(rc: RenderedCategory, indent = ''): string[] {
  return [
    `${indent}Cat ${rc.category.id}`,
    `${indent}  x0:${rc.x0Px} y0:${rc.y0Px} x1:${rc.x1Px} y1:${rc.y1Px}`,
  ];
}

function prettyprintCategoryHierarchy(
    rch: RenderedCategoryHierarchy, indent = ''): string[] {
  const ret = [
    `${indent}Categories:`,
  ];
  for (const category of rch.categories) {
    ret.push(...prettyprintCategory(category, indent + '  '))
  }
  return ret;
}

function prettyprintData(
    data: RenderedStackedBars|RenderedBar|RenderedBoxPlot,
    indent = ''): string[] {
  const ret: string[] = [];
  if (data instanceof RenderedStackedBars) {
    ret.push(`${indent}Stacked bars`);
    for (const child of data.bars) {
      ret.push(...prettyprintData(child, indent + '  '));
    }
  }
  if (data instanceof RenderedBar) {
    ret.push(
        `${indent}Bar '${data.properties.expectString('label_format')}'`,
        `${indent}  x0:${data.x0Px} y0:${data.y0Px} x1:${data.x1Px} y1:${
            data.y1Px}`,
    );
  }
  if (data instanceof RenderedBoxPlot) {
    ret.push(`${indent}Box plot`);
    ret.push(...prettyprintData(data.q0ToQ1, indent + '  '));
    ret.push(...prettyprintData(data.q1ToQ2, indent + '  '));
    ret.push(...prettyprintData(data.q2ToQ3, indent + '  '));
    ret.push(...prettyprintData(data.q3ToQ4, indent + '  '));
  }
  return ret;
}

function prettyprintBarChart(
    rbc: RenderedHorizontalBarChart, indent = ''): string[] {
  const ret = [
    `${indent}Bar chart`,
    `${indent}  category chart ${rbc.categoryWidthPx}w x ${rbc.chartHeightPx}h`,
    `${indent}  data chart ${rbc.chartWidthPx}w x ${rbc.chartHeightPx}h`,
  ];
  ret.push(
      ...prettyprintCategoryHierarchy(rbc.categoryHierarchy!, indent + '  '));
  for (const data of rbc.data) {
    ret.push(...prettyprintData(data, indent + '  '));
  }
  return ret;
}

describe('Renderers', () => {
  it('renders a horizontal stacked bar chart', () => {
    const bc = new BarChart(stackedDoubleFruitsByContinent);
    const rbc = new RenderedHorizontalBarChart(bc, 300);
    expect(prettyprintBarChart(rbc).join('\n')).toEqual(`Bar chart
  category chart 100w x 42h
  data chart 200w x 42h
  Categories:
    Cat europe
      x0:0 y0:0 x1:100 y1:20
    Cat asia
      x0:0 y0:22 x1:100 y1:42
  Stacked bars
    Bar 'apples'
      x0:0 y0:0 x1:24 y1:20
    Bar 'oranges'
      x0:24 y0:0 x1:36 y1:20
  Stacked bars
    Bar 'apples'
      x0:0 y0:22 x1:16 y1:42
    Bar 'oranges'
      x0:16 y0:22 x1:44 y1:42`);
  });

  it('renders a horizontal box plot bar chart', () => {
    const bc = new BarChart(boxPlotDoubleFruitsByContinent);
    const rbc = new RenderedHorizontalBarChart(bc, 300);
    expect(prettyprintBarChart(rbc).join('\n')).toEqual(`Bar chart
  category chart 100w x 42h
  data chart 200w x 42h
  Categories:
    Cat europe
      x0:0 y0:0 x1:100 y1:20
    Cat asia
      x0:0 y0:22 x1:100 y1:42
  Box plot
    Bar '% with apples as favorite fruit'
      x0:6 y0:0 x1:8 y1:20
    Bar '% with apples as favorite fruit'
      x0:8 y0:0 x1:10 y1:20
    Bar '% with apples as favorite fruit'
      x0:10 y0:0 x1:14.000000000000002 y1:20
    Bar '% with apples as favorite fruit'
      x0:14.000000000000002 y0:0 x1:24 y1:20
  Box plot
    Bar '% with oranges as favorite fruit'
      x0:0 y0:2 x1:2 y1:22
    Bar '% with oranges as favorite fruit'
      x0:2 y0:2 x1:6 y1:22
    Bar '% with oranges as favorite fruit'
      x0:6 y0:2 x1:8 y1:22
    Bar '% with oranges as favorite fruit'
      x0:8 y0:2 x1:14.000000000000002 y1:22
  Box plot
    Bar '% with apples as favorite fruit'
      x0:4 y0:22 x1:8 y1:42
    Bar '% with apples as favorite fruit'
      x0:8 y0:22 x1:10 y1:42
    Bar '% with apples as favorite fruit'
      x0:10 y0:22 x1:12 y1:42
    Bar '% with apples as favorite fruit'
      x0:12 y0:22 x1:18 y1:42
  Box plot
    Bar '% with oranges as favorite fruit'
      x0:2 y0:24 x1:6 y1:44
    Bar '% with oranges as favorite fruit'
      x0:6 y0:24 x1:12 y1:44
    Bar '% with oranges as favorite fruit'
      x0:12 y0:24 x1:20 y1:44
    Bar '% with oranges as favorite fruit'
      x0:20 y0:24 x1:28.000000000000004 y1:44`);
  });
});