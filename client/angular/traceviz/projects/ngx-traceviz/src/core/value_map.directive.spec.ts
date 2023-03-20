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
import { ValueMap, str, valueMap } from 'traceviz-client-core';
import { CoreModule } from './core.module';
import { ValueMapDirective } from './value_map.directive';

@Component({
    template: `
    <!--
      -- The value-map goes first so that ViewChild doesn't pick up the one
      -- in the global-state :\
      -->
  <value-map>
    <value key="name">
        <global-ref key="name"></global-ref>
    </value>
    <value key="age">
        <int>56</int>
    </value>
    <value key="species">
        <local-ref key="species"></local-ref>
    </value>
  </value-map>
  <app-core>
    <global-state>
      <value-map>
        <value key="name"><string>clyde</string></value>
      </value-map>
    </global-state>
  </app-core>
`
})
class ValueMapTestComponent {
    @ViewChild(ValueMapDirective) valueMapDir!: ValueMapDirective;
    @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('value map directive test', () => {
    let fixture: ComponentFixture<ValueMapTestComponent>;
    const appCoreService = new AppCoreService();

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ValueMapTestComponent],
            imports: [CoreModule],
            providers: [{
                provide: AppCoreService,
                useValue: appCoreService,
            }]
        })
        fixture = TestBed.createComponent(ValueMapTestComponent);
    });

    it('handles value map', () => {
        fixture.detectChanges();
        const tc = fixture.componentInstance;
        const localVm = valueMap(
            { key: 'species', val: str('cloud') },
        );
        const vmDir = tc.valueMapDir as ValueMapDirective;
        let vm: ValueMap | undefined;
        expect(() => {
            vm = vmDir.getValueMap(localVm);
        }).not.toThrow();
        expect(Array.from(vm!.entries()).map(([key, val]) => [key, val.toString()])).toEqual([
            ['name', 'clyde'],
            ['age', '56'],
            ['species', 'cloud']
        ]);
    });
});

