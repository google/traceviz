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

import {HovercardComponent} from './hovercard.component';
import {HovercardModule} from './hovercard.module';

@Component({template: `<hovercard [visible]="visible">child</hovercard>`})
class HovercardTestComponent {
  visible: boolean = false;
  @ViewChild(HovercardComponent) hovercard!: HovercardComponent;
}

describe('hovercard test', () => {
  let fixture: ComponentFixture<HovercardTestComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [HovercardTestComponent],
      imports: [HovercardModule],
    });
    fixture = TestBed.createComponent(HovercardTestComponent);
  });

  it('should hide and show', () => {
    fixture.detectChanges();
    const thc = fixture.componentInstance;
    expect(thc.hovercard.element.nativeElement.childNodes.length).toBe(1);
    thc.visible = true;
    fixture.detectChanges();
    expect(thc.hovercard.element.nativeElement.childNodes.length).toBe(2);
    expect(thc.hovercard.element.nativeElement.innerText).toBe('child');
  });

  it('should compute correct positions', () => {
    const testCases = [
      {x: [0, 10], y: [0, 10]},
      // 791 = 901 (mouse pos) - 100 (width) - 10 (offset)
      {x: [901, 791], y: [901, 900]},
      {x: [500, 510], y: [500, 510]},
    ];
    fixture.detectChanges();
    const thc = fixture.componentInstance;
    spyOn(thc.hovercard.document.body, 'getBoundingClientRect')
        .and.returnValue(DOMRect.fromRect({
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
        }));
    spyOn(thc.hovercard.element.nativeElement, 'getBoundingClientRect')
        .and.returnValue({
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          top: 0,
          right: 100,
          bottom: 100,
          left: 0,
        });
    testCases.forEach((val: {x: number[], y: number[]}) => {
      const [cursorX, computedX] = val.x;
      expect(thc.hovercard.computeLeftPosition(cursorX)).toBe(computedX);
      const [cursorY, computedY] = val.y;
      expect(thc.hovercard.computeTopPosition(cursorY)).toBe(computedY);
    })
  });
})
