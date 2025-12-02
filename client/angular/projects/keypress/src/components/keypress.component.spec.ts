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
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppCoreService, CoreModule, TestCoreModule} from '@google/traceviz-angular-core';
import {IntegerValue, StringSetValue} from '@traceviz/client-core';

import {KeypressComponent} from './keypress.component';
import {KeypressModule} from './keypress.module';

@Component({
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="ctrl_a_pressed"><int>0</int></value>
          <value key="depressed_key_codes"><string-set></string-set></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <keypress>
      <interactions>
        <action target="key" type="press">
          <set>
            <global-ref key="depressed_key_codes"></global-ref>
            <local-ref key="depressed_key_codes"></local-ref>
          </set>
          <switch>
            <case>
              <and>
                <includes>
                  <local-ref key="depressed_key_codes"></local-ref>
                  <string>ControlLeft</string>
                </includes>
                <includes>
                  <local-ref key="depressed_key_codes"></local-ref>
                  <string>KeyA</string>
                </includes>
              </and>
              <set>
                <global-ref key="ctrl_a_pressed"></global-ref>
                <int>1</int>
              </set>
            </case>
            <case>
              <true></true>
              <set>
                <global-ref key="ctrl_a_pressed"></global-ref>
                <int>0</int>
              </set>
            </case>
          </switch>
        </action>
      </interactions>
    </keypress>`
})
class KeypressTestComponent {
  @ViewChild(KeypressComponent) kc!: KeypressComponent;
}

function ke(type: string, options: object): KeyboardEvent {
  return new KeyboardEvent(type, options);
}

describe('keypress test', () => {
  let fixture: ComponentFixture<KeypressTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [KeypressTestComponent],
          imports: [
            CoreModule,
            TestCoreModule,
            KeypressModule,
            NoopAnimationsModule,
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(KeypressTestComponent);
    await fixture.whenStable();
  });

  it('handles keypresses', () => {
    fixture.detectChanges();
    const ctrlAPressed = appCoreService.appCore.globalState.get(
                             'ctrl_a_pressed') as IntegerValue;
    const depressedKeyCodes = appCoreService.appCore.globalState.get(
                                  'depressed_key_codes') as StringSetValue;
    const kp = fixture.componentInstance;

    expect(ctrlAPressed.val).toEqual(0);
    expect(depressedKeyCodes.val).toEqual(new Set([]));

    kp.kc.keyEvent(ke('keydown', {'code': 'KeyA'}));
    expect(ctrlAPressed.val).toEqual(0);
    expect(depressedKeyCodes.val).toEqual(new Set(['KeyA']));

    kp.kc.keyEvent(ke('keydown', {'code': 'ControlLeft'}));
    expect(ctrlAPressed.val).toEqual(1);
    expect(depressedKeyCodes.val).toEqual(new Set(['KeyA', 'ControlLeft']));

    kp.kc.keyEvent(ke('keyup', {'code': 'KeyA'}));
    expect(ctrlAPressed.val).toEqual(0);
    expect(depressedKeyCodes.val).toEqual(new Set(['ControlLeft']));

    kp.kc.keyEvent(ke('keyup', {'code': 'ControlLeft'}));
    expect(ctrlAPressed.val).toEqual(0);
    expect(depressedKeyCodes.val).toEqual(new Set([]));
  });
});
