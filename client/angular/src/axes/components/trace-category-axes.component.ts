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

/**
 * @fileoverview Axis comopnents for trace categories.
 */

import {AfterContentInit, Component, ContentChild, ElementRef, forwardRef, Input, ViewChild} from '@angular/core';
import * as d3 from 'd3';
import {AppCoreService, InteractionsDirective} from 'traceviz-client-core';
import {getLabel, Coloring, RenderedTraceCategory, RenderedTraceCategoryHierarchy} from 'traceviz-client-core';

enum Keys {
  DETAIL_FORMAT = 'detail_format',
}

const CATEGORY_HEADERS = 'category_headers';
const ACTION_CLICK = 'click';
const ACTION_MOUSEOVER = 'mouseover';
const ACTION_MOUSEOUT = 'mouseout';

/** The name for a highlight reaction. */
export const REACTION_HIGHLIGHT = 'highlight';

const supportedActions = new Array<[string, string]>(
    [CATEGORY_HEADERS, ACTION_CLICK],      // A category header is clicked on.
    [CATEGORY_HEADERS, ACTION_MOUSEOVER],  // A category header is moused over.
    [CATEGORY_HEADERS, ACTION_MOUSEOUT]  // A category header is moused out of.
);

/**
 * A base class for components displaying hierarchical trace categories in the Y
 * axis.
 */
export abstract class TraceCategoryHierarchyYAxis {
  abstract render(renderedCategories: RenderedTraceCategoryHierarchy): void;
}

/**
 * A standard continuous Y axis, rendered so that markings face the right.
 */
@Component({
  selector: 'rectangular-trace-category-hierarchy-y-axis',
  styles: [`
    :host {
      display: flex;
    }
    svg {
      display: block;
    }
    `],
  template: `
    <hovercard [visible]="tooltip !== ''">{{tooltip}}</hovercard>
    <svg #svg>
      <g class="y-axis"></g>
      <g class="y-axis-label"></g>
    </svg>
  `,
  providers: [{
    provide: TraceCategoryHierarchyYAxis,
    useExisting: forwardRef(() => RectangularTraceCategoryHierarchyYAxis)
  }],
})
export class RectangularTraceCategoryHierarchyYAxis extends
    TraceCategoryHierarchyYAxis implements AfterContentInit {
  @ContentChild(InteractionsDirective)
  interactions: InteractionsDirective|undefined;

  @ViewChild('svg', {static: true}) svg!: ElementRef;
  @Input() transitionDurationMs = 500;

  tooltip = '';

  constructor(private readonly appCoreService: AppCoreService) {
    super();
  }

  ngAfterContentInit() {
    this.interactions?.get().checkForSupportedActions(supportedActions);
  }

  handleCategoryMouseout(data: RenderedTraceCategory) {
    try {
      this.interactions?.get().update(
          CATEGORY_HEADERS, ACTION_MOUSEOUT, data.properties);
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
    this.tooltip = '';
  }

  handleCategoryMouseover(data: RenderedTraceCategory) {
    try {
      this.interactions?.get().update(
          CATEGORY_HEADERS, ACTION_MOUSEOVER, data.properties);
      this.tooltip = data.properties.format(
          data.properties.expectString(Keys.DETAIL_FORMAT));
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }


  override render(renderedCategories: RenderedTraceCategoryHierarchy) {
    const coloring = new Coloring(renderedCategories.properties);
    const yAxisArea = d3.select(this.svg.nativeElement);
    yAxisArea.attr('width', renderedCategories.widthPx)
        .attr('height', renderedCategories.heightPx);
    const nodes =
        yAxisArea.selectAll('svg').data(renderedCategories.categories);
    // Remove any extra nodes.
    nodes.exit().remove();
    const enteredNodes =
        nodes.enter()
            .append('svg')
            .attr('x', (rc: RenderedTraceCategory) => rc.x0Px)
            .attr('y', (rc: RenderedTraceCategory) => rc.y0Px)
            .attr('width', (rc: RenderedTraceCategory) => rc.width)
            .attr('height', (rc: RenderedTraceCategory) => rc.height)
            .on('mouseover',
                (rc: RenderedTraceCategory, i: number,
                 n: ArrayLike<SVGSVGElement>) => {
                  d3.select(n[i]).select('rect').attr('stroke', 'lime');
                  this.handleCategoryMouseover(rc);
                })
            .on('mouseout',
                (rc: RenderedTraceCategory, i: number,
                 n: ArrayLike<SVGSVGElement>) => {
                  rc = rc;
                  d3.select(n[i]).select('rect').attr('stroke', 'none');
                  this.handleCategoryMouseout(rc);
                })
            .on('click', (rc: RenderedTraceCategory) => {
              try {
                this.interactions?.get().update(
                    CATEGORY_HEADERS, ACTION_CLICK, rc.properties);
              } catch (err: unknown) {
                this.appCoreService.appCore.err(err);
              }
            });
    enteredNodes.append('rect')
        .attr('class', 'cat')
        .attr('width', (rc: RenderedTraceCategory) => rc.width)
        .attr('height', (rc: RenderedTraceCategory) => rc.height)
        .attr(
            'fill',
            (rc: RenderedTraceCategory) =>
                coloring.colors(rc.properties).primary || '');
    enteredNodes.append('rect')
        .attr('class', 'handle')
        .attr(
            'width',
            (rc: RenderedTraceCategory) =>
                rc.renderSettings.categoryHandleTempPx)
        .attr(
            'height',
            (rc: RenderedTraceCategory) =>
                rc.renderSettings.categoryHeaderCatPx)
        .attr(
            'fill',
            (rc: RenderedTraceCategory) =>
                coloring.colors(rc.properties).secondary || '');
    enteredNodes.append('text')
        .attr('dominant-baseline', 'hanging')
        .attr('y', (rc: RenderedTraceCategory) => 1)
        .attr(
            'x',
            (rc: RenderedTraceCategory) =>
                rc.renderSettings.categoryHandleTempPx)
        .attr(
            'fill',
            (rc: RenderedTraceCategory) =>
                coloring.colors(rc.properties).stroke || '')
        .text((rc: RenderedTraceCategory) => getLabel(rc.properties));
    // Update all node svgs, rects, and texts with their new positions, colors,
    // and contents.  This version of d3 update uses a lambda receiving a d3
    // selection; as d3 is untyped, this is `any` for now.
    nodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.transition()
              .duration(this.transitionDurationMs)
              .attr('x', (rc: RenderedTraceCategory) => rc.x0Px)
              .attr('y', (rc: RenderedTraceCategory) => rc.y0Px)
              .attr('width', (rc: RenderedTraceCategory) => rc.width)
              .attr('height', (rc: RenderedTraceCategory) => rc.height);
        });
    nodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.select('rect.cat')
              .transition()
              .duration(this.transitionDurationMs)
              .attr('width', (rc: RenderedTraceCategory) => rc.width)
              .attr('height', (rc: RenderedTraceCategory) => rc.height)
              .attr(
                  'fill',
                  (rc: RenderedTraceCategory) =>
                      coloring.colors(rc.properties).primary);
        });
    nodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.select('rect.handle')
              .transition()
              .duration(this.transitionDurationMs)
              .attr(
                  'width',
                  (rc: RenderedTraceCategory) =>
                      rc.renderSettings.categoryHandleTempPx)
              .attr(
                  'height',
                  (rc: RenderedTraceCategory) =>
                      rc.renderSettings.categoryHeaderCatPx)
              .attr(
                  'fill',
                  (rc: RenderedTraceCategory) =>
                      coloring.colors(rc.properties).secondary || '');
        });
    nodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.select('text')
              .attr('dominant-baseline', 'hanging')
              .attr('y', (rc: RenderedTraceCategory) => 1)
              .attr(
                  'x',
                  (rc: RenderedTraceCategory) =>
                      rc.renderSettings.categoryHandleTempPx)
              .attr(
                  'fill',
                  (rc: RenderedTraceCategory) =>
                      coloring.colors(rc.properties).stroke)
              .text((rc: RenderedTraceCategory) => getLabel(rc.properties));
        });
  }
}