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

import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {str, StringValue, valueMap} from 'traceviz-client-core';

import {AppCoreService} from '../services/app_core.service';

import {AppCoreDirective} from './app_core.directive';
import {CoreModule} from './core.module';
import {LocalRefDirective} from './local_ref.directive';

@Component({
  template: `
  <local-ref key="str"></local-ref>
`
})
class LocalTestComponent {
  @ViewChild(LocalRefDirective) globalRefDir!: LocalRefDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('local value directives test', () => {
  let fixture: ComponentFixture<LocalTestComponent>;
  const appCoreService = new AppCoreService();

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LocalTestComponent],
      imports: [CoreModule],
    })
    fixture = TestBed.createComponent(LocalTestComponent);
  });

  it('handles global Values', () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const vm = valueMap(
        {key: 'str', val: str('howdy')},
    );
    expect((tc.globalRefDir.get(vm) as StringValue).val).toEqual('howdy');
  });
});
