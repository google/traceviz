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

import {int, valueMap, rpcNode, Trace, renderCategoryHierarchyForHorizontalSpans} from '@traceviz/client-core';
import {AxesModule} from './axes.module';
import {RectangularCategoryHierarchyYAxis} from './category-axes.component';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Component, ViewChild} from '@angular/core';

const traceData = rpcNode.with(valueMap(
    {key: 'span_width_cat_px', val: int(10)},
    {key: 'span_padding_cat_px', val: int(1)},
    {key: 'category_header_cat_px', val: int(0)},
    {key: 'category_handle_val_px', val: int(0)},
    {key: 'category_padding_cat_px', val: int(2)},
    {key: 'category_margin_val_px', val: int(5)},
    {key: 'category_min_width_cat_px', val: int(20)},
    {key: 'category_base_width_val_px', val: int(100)},
    ));

@Component({
  template: `
  <rectangular-category-hierarchy-y-axis>
  </rectangular-category-hierarchy-y-axis>`
})
class TraceAxesTestComponent {
  @ViewChild(RectangularCategoryHierarchyYAxis)
  traceCatYAxis!: RectangularCategoryHierarchyYAxis;
}

describe('x axis test', () => {
  let fixture: ComponentFixture<TraceAxesTestComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [TraceAxesTestComponent],
      imports: [AxesModule],
    });
    fixture = TestBed.createComponent(TraceAxesTestComponent);
  });

  it('shows rectangular trace category y-axis', () => {
    fixture.detectChanges();
    const tac = fixture.componentInstance;
    const trace = Trace.union(
        Trace.fromNode(traceData),
    );
    const yac = tac.traceCatYAxis;
    const rcs = renderCategoryHierarchyForHorizontalSpans(trace);
    yac.render(rcs);

    const rects: SVGRectElement[] =
        Array.from(yac.svg.nativeElement.querySelectorAll('svg'));
    const rectDimensions = rects.map(rect => {
      return {
        ulx: rect.x.baseVal.value,
        uly: rect.y.baseVal.value,
        width: rect.width.baseVal.value,
        height: rect.height.baseVal.value,
        label: rect.querySelector('text')!.textContent,
      };
    });
    expect(rectDimensions).toEqual([
      {
        ulx: 0,
        uly: 0,
        width: 115,  // 100 + 3*5
        height: 100,
        label: 'a',
      },
      {
        ulx: 5,      // indent
        uly: 12,     // 1*10 + 2
        width: 110,  // 100 + 2*5
        height: 54,  // 12 + 2 + 2*20
        label: 'a/b',
      },
      {
        ulx: 10,     // 2*5
        uly: 24,     // 12 + 1*10+2
        width: 105,  // 100 + 1*5
        height: 20,  // min height
        label: 'a/b/c',
      },
      {
        ulx: 10,     // 2*5
        uly: 46,     // 24 + 20 + 2
        width: 105,  // 100 + 1*5
        height: 20,  // min height
        label: 'a/b/d',
      },
      {
        ulx: 5,      // 1*5
        uly: 68,     // 54 + 1*10 + 2
        width: 110,  // 100 + 2*5
        height: 32,  // 20 + 12
        label: 'a/e',
      },
      {
        ulx: 10,     // 2*5
        uly: 80,     // 68 + 1*10 + 2
        width: 105,  // 100 + 1*5
        height: 20,  // min height
        label: 'a/e/a',
      },
    ]);
  });
});
