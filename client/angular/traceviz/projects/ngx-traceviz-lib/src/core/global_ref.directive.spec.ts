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

import { AppCoreDirective } from './app_core.directive';
import { AppCoreService } from '../app_core_service/app_core.service';
import { GlobalRefDirective } from './global_ref.directive';
import { StringValue } from 'traceviz-client-core';
import { CoreModule } from './core.module';
import { TestCoreModule } from './test_core.module';

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="str"><string>yay</string></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <global-ref key="str"></global-ref>
`
})
class GlobalTestComponent {
  @ViewChild(GlobalRefDirective) globalRefDir!: GlobalRefDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('global value directive test', () => {
  let fixture: ComponentFixture<GlobalTestComponent>;
  const appCoreService = new AppCoreService();

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GlobalTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    })
    fixture = TestBed.createComponent(GlobalTestComponent);
  });

  it('handles global Values', () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    expect((tc.globalRefDir.get(undefined) as StringValue).val).toEqual('yay');
  });
});

