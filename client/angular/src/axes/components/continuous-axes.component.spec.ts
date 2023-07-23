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

import {HttpClientModule} from '@angular/common/http';
import {BrowserModule} from '@angular/platform-browser';
import {getAxis, Timestamp, str, dbl, int, ts, valueMap} from 'traceviz-client-core';
import {DirectivesModule as ValuesDirectivesModule} from 'traceviz-angular-core';

import {AxesModule} from './axes_module';
import {StandardContinuousXAxis, StandardContinuousYAxis, xAxisRenderSettings, yAxisRenderSettings} from './continuous_axes';

function sec(sec: number): Timestamp {
  return new Timestamp(sec, 0);
}

describe('category axis test', () => {
  beforeEach(() => {
    setupModule({
      imports: [
        AxesModule,
        BrowserModule,
        HttpClientModule,
        ValuesDirectivesModule,
      ],
    });
  });

  it('shows standard x-axis', () => {
    bootstrapTemplate<StandardContinuousXAxis>(`
      <standard-continuous-x-axis></standard-continuous-x-axis>`);
    const xa = getAxis(
        valueMap(
            {key: 'category_defined_id', val: str('x_axis')},
            {key: 'category_display_name', val: str('time from start')},
            {key: 'category_description', val: str('Time from start')},
            {key: 'axis_type', val: str('timestamp')},
            {key: 'axis_min', val: ts(sec(0))},
            {key: 'axis_max', val: ts(sec(100))},
            ),
    );
    const xac = getDebugEl('standard-continuous-x-axis').componentInstance;
    const rs = xAxisRenderSettings(valueMap(
        {key: 'x_axis_render_label_height_px', val: int(10)},
        {key: 'x_axis_render_markers_height_px', val: int(20)},
        ));
    xac.render(xa, 30, rs);
    flush();
    // Expect the proper axis label
    const xAxisLabel = xac.svg.nativeElement.querySelector('.x-axis-label');
    expect(xAxisLabel.textContent).toEqual('time from start');
    // Expect the x axis to have something in it.
    const xAxis = xac.svg.nativeElement.querySelector('.x-axis');
    const xTicks = [...xAxis.querySelectorAll('.tick').values()].map(
        (tick: HTMLElement) => tick.querySelector('text')!.textContent);
    expect(xTicks).toBeDefined();
    expect(xTicks.length).toBeGreaterThan(0);
  });

  it('shows standard y-axis', () => {
    bootstrapTemplate<StandardContinuousYAxis>(`
      <standard-continuous-y-axis></standard-continuous-y-axis>`);
    const ya = getAxis(
        valueMap(
            {key: 'category_defined_id', val: str('y_axis')},
            {key: 'category_display_name', val: str('things/sec')},
            {key: 'category_description', val: str('how many things each second')},
            {key: 'axis_type', val: str('double')},
            {key: 'axis_min', val: dbl(0)},
            {key: 'axis_max', val: dbl(100)},
            ),
    );
    const yac = getDebugEl('standard-continuous-y-axis').componentInstance;
    const rs = yAxisRenderSettings(valueMap(
        {key: 'y_axis_render_label_width_px', val: int(10)},
        {key: 'y_axis_render_markers_width_px', val: int(20)},
        ));
    yac.render(ya, 30, rs);
    flush();
    // Expect the proper axis label
    const yAxisLabel = yac.svg.nativeElement.querySelector('.y-axis-label');
    expect(yAxisLabel.textContent).toEqual('things/sec');
    // Expect the x axis to have something in it.
    const yAxis = yac.svg.nativeElement.querySelector('.y-axis');
    const yTicks = [...yAxis.querySelectorAll('.tick').values()].map(
        (tick: HTMLElement) => tick.querySelector('text')!.textContent);
    expect(yTicks).toBeDefined();
    expect(yTicks.length).toBeGreaterThan(0);
  });
});