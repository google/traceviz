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
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { dbl, dur, str, ts, valueMap } from '../value/test_value.js';
import { getAxis } from './continuous_axis.js';
function sec(sec) {
    return new Timestamp(sec, 0);
}
function d(nanos) {
    return new Duration(nanos);
}
describe('axis test', () => {
    it('defines timestamp axes and gets points', () => {
        const axis = getAxis(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('timestamp') }, { key: 'axis_min', val: ts(sec(0)) }, { key: 'axis_max', val: ts(sec(100)) }));
        expect(axis.contains(sec(50))).toBeTrue();
        expect(axis.contains(sec(150))).toBeFalse();
        expect(axis.value(valueMap({ key: 'x_axis', val: ts(sec(50)) }), 'x_axis'))
            .toEqual(sec(50));
        expect(() => {
            axis.value(valueMap({ key: 'missing field', val: ts(sec(50)) }), 'x_axis');
        }).toThrow();
        expect(axis.toDomainFraction(sec(25))).toEqual(.25);
    });
    it('defines duration axes and gets points', () => {
        const axis = getAxis(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('duration') }, { key: 'axis_min', val: dur(d(0)) }, { key: 'axis_max', val: dur(d(100)) }));
        expect(axis.contains(d(50))).toBeTrue();
        expect(axis.contains(d(150))).toBeFalse();
        expect(axis.value(valueMap({ key: 'x_axis', val: dur(d(50)) }), 'x_axis'))
            .toEqual(d(50));
        expect(() => {
            axis.value(valueMap({ key: 'missing field', val: dur(d(50)) }), 'x_axis');
        }).toThrow();
        expect(axis.toDomainFraction(d(25))).toEqual(.25);
    });
    it('defines number axes and gets points', () => {
        const axis = getAxis(valueMap({ key: 'category_defined_id', val: str('y_axis') }, { key: 'category_display_name', val: str('events per second') }, { key: 'category_description', val: str('Events per second') }, { key: 'axis_type', val: str('double') }, { key: 'axis_min', val: dbl(0) }, { key: 'axis_max', val: dbl(100) }));
        expect(axis.contains(50)).toBeTrue();
        expect(axis.contains(150)).toBeFalse();
        expect(axis.value(valueMap({ key: 'y_axis', val: dbl(50) }), 'y_axis'))
            .toEqual(50);
        expect(() => {
            axis.value(valueMap({ key: 'missing field', val: dbl(50) }), 'y_axis');
        }).toThrow();
        expect(axis.toDomainFraction(25)).toEqual(.25);
        expect(axis.toDomainFraction(125)).toEqual(1.25);
    });
    it('unions axes properly', () => {
        const axis1 = getAxis(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('timestamp') }, { key: 'axis_min', val: ts(sec(0)) }, { key: 'axis_max', val: ts(sec(100)) }));
        const axis2 = getAxis(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('timestamp') }, { key: 'axis_min', val: ts(sec(50)) }, { key: 'axis_max', val: ts(sec(150)) }));
        const axis3 = getAxis(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('duration') }, { key: 'axis_min', val: dur(d(0)) }, { key: 'axis_max', val: dur(d(100)) }));
        expect(() => axis1.union(axis3)).toThrow();
        const uAxis = axis1.union(axis2);
        expect(uAxis.min).toEqual(sec(0));
        expect(uAxis.max).toEqual(sec(150));
    });
});
//# sourceMappingURL=continuous_axis_test.js.map