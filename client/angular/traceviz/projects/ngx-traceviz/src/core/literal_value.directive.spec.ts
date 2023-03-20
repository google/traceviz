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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';

import { DblLiteralDirective, DurationLiteralDirective, IntLiteralDirective, IntLiteralListDirective, IntLiteralSetDirective, StringLiteralDirective, StringLiteralListDirective, StringLiteralSetDirective, TimestampLiteralDirective } from './literal_value.directive';
import { StringValue, StringListValue, StringSetValue, IntegerValue, IntegerListValue, IntegerSetValue, DoubleValue, DurationValue, Duration, TimestampValue, Timestamp } from 'traceviz-client-core';
import { CoreModule } from './core.module';

@Component({
    template: `
    <string>hello</string>
    <string-list>
      <string>a</string>
      <string>b</string>
    </string-list>
    <string-set>
      <string>c</string> 
      <string>d</string>
    </string-set>
    <int>3</int>
    <int-list>
      <int>1</int>
      <int>2</int>
    </int-list>
    <int-set>
      <int>3</int>
      <int>4</int>
    </int-set>
    <dbl>3.14159</dbl>
    <dur>1000000</dur>
    <timestamp></timestamp>
`
})
class LiteralTestComponent {
    @ViewChild(StringLiteralDirective) strLitDir!: StringLiteralDirective;
    @ViewChild(StringLiteralListDirective) strLitListDir!: StringLiteralListDirective;
    @ViewChild(StringLiteralSetDirective) strLitSetDir!: StringLiteralSetDirective;
    @ViewChild(IntLiteralDirective) intLitDir!: IntLiteralDirective;
    @ViewChild(IntLiteralListDirective) intLitListDir!: IntLiteralListDirective;
    @ViewChild(IntLiteralSetDirective) intLitSetDir!: IntLiteralSetDirective;
    @ViewChild(DblLiteralDirective) dblLitDir!: DblLiteralDirective;
    @ViewChild(DurationLiteralDirective) durLitDir!: DurationLiteralDirective;
    @ViewChild(TimestampLiteralDirective) tsLitDir!: TimestampLiteralDirective;
}

describe('value literal directive test', () => {
    let fixture: ComponentFixture<LiteralTestComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [LiteralTestComponent],
            imports: [CoreModule],
        })
        fixture = TestBed.createComponent(LiteralTestComponent);
    });

    it('handles literal Values', () => {
        fixture.detectChanges();
        const tc = fixture.componentInstance;
        expect((tc.strLitDir.get(undefined) as StringValue).val).toEqual('hello');
        expect((tc.strLitListDir.get(undefined) as StringListValue).val).toEqual(['a', 'b']);
        expect((tc.strLitSetDir.get(undefined) as StringSetValue).val).toEqual(new Set(['c', 'd']));
        expect((tc.intLitDir.get(undefined) as IntegerValue).val).toEqual(3);
        expect((tc.intLitListDir.get(undefined) as IntegerListValue).val).toEqual([1, 2]);
        expect((tc.intLitSetDir.get(undefined) as IntegerSetValue).val).toEqual(new Set([3, 4]));
        expect((tc.dblLitDir.get(undefined) as DoubleValue).val).toEqual(3.14159);
        expect((tc.durLitDir.get(undefined) as DurationValue).val).toEqual(new Duration(1000000));
        expect((tc.tsLitDir.get(undefined) as TimestampValue).val).toEqual(new Timestamp(0, 0));
    });
});
