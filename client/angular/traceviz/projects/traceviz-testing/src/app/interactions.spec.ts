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

import { AppCoreDirective, AppCoreService, InteractionsDirective } from 'ngx-traceviz';
import { IntegerValue, Interactions } from 'traceviz-client-core';
import { CoreModule } from 'ngx-traceviz';

@Component({
    template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="counter"><int>0</int></value>
        <value key="lower_bound"><int>5</int></value>
        <value key="upper_bound"><int>10</int></value>
        <value key="forbidden"><int>7</int></value>
        <value key="allowed"><int-set><int>12</int></int-set></value>
      </value-map>
    </global-state>
  </app-core>
  <interactions>
    <action target="counter" type="reset">
        <clear><global-ref key="counter"></global-ref></clear>
    </action>
    <reaction target="counter" type="bold">
      <or>
        <and>
          <greater-than>
            <global-ref key="counter"></global-ref>
            <int>5</int>
          </greater-than>
          <less-than>
            <global-ref key="counter"></global-ref>
            <int>10</int>
          </less-than>
          <not>
            <equals>
              <global-ref key="counter"></global-ref>
              <int>7</int>
            </equals>
          </not>
        </and>
        <includes>
          <int-set><int>12</int></int-set>
          <global-ref key="counter"></global-ref>
        </includes> 
      </or>
    </reaction>
  </interactions>
`
})
class InteractionsTestComponent {
    @ViewChild(AppCoreDirective) appCoreDir!: AppCoreDirective;
    @ViewChild(InteractionsDirective) interactionsDir!: InteractionsDirective;
}

describe('interactions directive test', () => {
    let fixture: ComponentFixture<InteractionsTestComponent>;
    const appCoreService = new AppCoreService();

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [InteractionsTestComponent],
            imports: [CoreModule],
            providers: [{
                provide: AppCoreService,
                useValue: appCoreService,
            }]
        })
        fixture = TestBed.createComponent(InteractionsTestComponent);
    });

    it('handles global Values', () => {
        fixture.detectChanges();
        const tc = fixture.componentInstance;
        let interactions: Interactions | undefined;
        expect(() => {
            interactions = tc.interactionsDir.get();
        }).not.toThrow();
        const counter = tc.appCoreDir.appCoreService.appCore.globalState.get('counter') as IntegerValue;
        const bolded: string[] = [];
        interactions!.match('counter', 'bold')().subscribe(
            (bold: boolean) => {
                bolded.push(`bold: ${bold} at ${counter.val}`);
            });
        const bump = () => {
            counter.val = counter.val + 1;
            console.log(`bumped to ${counter.val}`);
        };
        // Bump the counter 12 times, to 12.
        for (let i = 0; i < 12; i++) {
            bump();
        }
        expect(counter.val).toEqual(12);
        // Perform the 'reset' interaction, resetting counter to 0.
        interactions!.update('counter', 'reset');
        expect(counter.val).toEqual(0);
        // Expect to start unbolded, go bolded at 6, unbold at 7,
        // bold at 8, unbold at 10 bold at 12, and unbold for 0.
        expect(bolded).toEqual([
            "bold: false at 0",
            "bold: true at 6",
            "bold: false at 7",
            "bold: true at 8",
            "bold: false at 10",
            "bold: true at 12",
            "bold: false at 0",
        ]);
    });
});

