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

import { DurationAxis, getAxis, NumberAxis, TimestampAxis, unionAxes } from './continuous_axis.js';
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { dbl, dur, str, ts, valueMap } from '../value/test_value.js';

function sec(sec: number): Timestamp {
  return new Timestamp(sec, 0);
}

function d(nanos: number): Duration {
  return new Duration(nanos);
}

describe('axis test', () => {
  it('defines timestamp axes and gets points', () => {
    const axis = getAxis(valueMap(
        {key: 'category_defined_id', val: str('x_axis')},
        {key: 'category_display_name', val: str('time from start')},
        {key: 'category_description', val: str('Time from start')},
        {key: 'axis_type', val: str('timestamp')},
        {key: 'axis_min', val: ts(sec(0))},
        {key: 'axis_max', val: ts(sec(100))},
        ));
    expect(axis).toBeInstanceOf(TimestampAxis);
    const tsAxis = axis as TimestampAxis;
    expect(tsAxis.contains(sec(50))).toBeTrue();
    expect(tsAxis.contains(sec(150))).toBeFalse();
    expect(tsAxis.pointValue(valueMap(
               {key: 'x_axis', val: ts(sec(50))},
               )))
        .toEqual(sec(50));
    expect(() => {
      tsAxis.pointValue(valueMap(
          {key: 'missing field', val: ts(sec(50))},
          ));
    }).toThrow();
    expect(tsAxis.atOffset(d(50 * 1E9))).toEqual(sec(50));
    expect(tsAxis.toDomainFraction(sec(25))).toEqual(.25);
  });

  it('defines duration axes and gets points', () => {
    const axis = getAxis(valueMap(
        {key: 'category_defined_id', val: str('x_axis')},
        {key: 'category_display_name', val: str('time from start')},
        {key: 'category_description', val: str('Time from start')},
        {key: 'axis_type', val: str('duration')},
        {key: 'axis_min', val: dur(d(0))},
        {key: 'axis_max', val: dur(d(100))},
        ));
    expect(axis).toBeInstanceOf(DurationAxis);
    const dAxis = axis as DurationAxis;
    expect(dAxis.contains(d(50))).toBeTrue();
    expect(dAxis.contains(d(150))).toBeFalse();
    expect(dAxis.pointValue(valueMap(
               {key: 'x_axis', val: dur(d(50))},
               )))
        .toEqual(d(50));
    expect(() => {
      dAxis.pointValue(valueMap(
          {key: 'missing field', val: dur(d(50))},
          ));
    }).toThrow();
    expect(dAxis.toDomainFraction(d(25))).toEqual(.25);
  });

  it('defines number axes and gets points', () => {
    const axis = getAxis(valueMap(
        {key: 'category_defined_id', val: str('y_axis')},
        {key: 'category_display_name', val: str('events per second')},
        {key: 'category_description', val: str('Events per second')},
        {key: 'axis_type', val: str('double')},
        {key: 'axis_min', val: dbl(0)},
        {key: 'axis_max', val: dbl(100)},
        ));
    expect(axis).toBeInstanceOf(NumberAxis);
    const dblAxis = axis as NumberAxis;
    expect(dblAxis.contains(50)).toBeTrue();
    expect(dblAxis.contains(150)).toBeFalse();
    expect(dblAxis.pointValue(valueMap(
               {key: 'y_axis', val: dbl(50)},
               )))
        .toEqual(50);
    expect(() => {
      dblAxis.pointValue(valueMap(
          {key: 'missing field', val: dbl(50)},
          ));
    }).toThrow();
    expect(dblAxis.toDomainFraction(25)).toEqual(.25);
    expect(dblAxis.toDomainFraction(125)).toEqual(1.25);
  });

  it('unions axes properly', () => {
    const axis1 = getAxis(valueMap(
        {key: 'category_defined_id', val: str('x_axis')},
        {key: 'category_display_name', val: str('time from start')},
        {key: 'category_description', val: str('Time from start')},
        {key: 'axis_type', val: str('timestamp')},
        {key: 'axis_min', val: ts(sec(50))},
        {key: 'axis_max', val: ts(sec(100))},
        ));
    const axis2 = getAxis(valueMap(
        {key: 'category_defined_id', val: str('x_axis')},
        {key: 'category_display_name', val: str('time from start')},
        {key: 'category_description', val: str('Time from start')},
        {key: 'axis_type', val: str('timestamp')},
        {key: 'axis_min', val: ts(sec(0))},
        {key: 'axis_max', val: ts(sec(150))},
        ));
    const axis3 = getAxis(valueMap(
        {key: 'category_defined_id', val: str('x_axis')},
        {key: 'category_display_name', val: str('time from start')},
        {key: 'category_description', val: str('Time from start')},
        {key: 'axis_type', val: str('duration')},
        {key: 'axis_min', val: dur(d(0))},
        {key: 'axis_max', val: dur(d(100))},
        ));
    expect(() => unionAxes(axis1, axis2, axis3)).toThrow();
    const uAxis = unionAxes(axis1, axis2);
    expect(uAxis).toBeInstanceOf(TimestampAxis);
    const tsAxis = uAxis as TimestampAxis;
    expect(tsAxis.min).toEqual(sec(0));
    expect(tsAxis.max).toEqual(sec(150));
  });
});
