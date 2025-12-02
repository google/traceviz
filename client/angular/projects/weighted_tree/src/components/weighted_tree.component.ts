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
 * @fileoverview A basic TraceViz weighted tree or 'flame graph' view,
 * consuming weighted tree data as defined at
 * ../../../../server/go/weighted_tree/weighted_tree.go
 */

import {AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, ElementRef, HostListener, Input, OnDestroy, ViewChild} from '@angular/core';
import {AppCoreService, DataSeriesDirective, InteractionsDirective} from '@google/traceviz-angular-core';
import {DataSeriesQuery, getStyle, Interactions, RenderedTreeNode, Tree} from '@traceviz/client-core';
import * as d3 from 'd3';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged, takeUntil} from 'rxjs/operators';

enum Keys {
  TOOLTIP = 'tooltip',
}

const NODES = 'nodes';

const ACTION_CLICK = 'click';
const ACTION_MOUSEOVER = 'mouseover';
const ACTION_MOUSEOUT = 'mouseout';

const REACTION_HIGHLIGHT = 'highlight';

const supportedActions = new Array<[string, string]>(
    [NODES, ACTION_CLICK],
    [NODES, ACTION_MOUSEOVER],
    [NODES, ACTION_MOUSEOUT],
);

const supportedReactions =
    new Array<[string, string]>([NODES, REACTION_HIGHLIGHT]);

/** Renders a weighted tree from tree data (see TreeDataComponent). */
@Component({
  standalone: false,
  selector: 'weighted-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'weighted_tree.component.html',
  styleUrls: ['weighted_tree.component.css'],
})
export class WeightedTree implements AfterContentInit, AfterViewInit,
                                     OnDestroy {
  @ContentChild(DataSeriesDirective)
  dataSeriesQuery: DataSeriesDirective|undefined;
  @ContentChild(InteractionsDirective, {descendants: false})
  interactionsDir: InteractionsDirective|undefined;

  @ViewChild('svg', {static: true}) svg!: ElementRef;
  @ViewChild('loadingDiv', {static: true}) loadingDiv: ElementRef|undefined;
  @ViewChild('scopeNameDiv', {static: true}) scopeNameDiv!: ElementRef;
  @ViewChild('componentDiv') componentDiv!: ElementRef;

  @Input() transitionDurationMs = 500;

  readonly unsubscribe = new Subject<void>();
  readonly redrawDebouncer = new Subject<void>();
  tree?: Tree;
  treeNodes: RenderedTreeNode[] = [];
  // Used in testing to confirm highlighting, since getting d3 updates to
  // quiesce in tests is maybe impossible.
  highlightedNodes = new Set<RenderedTreeNode>();
  interactions: Interactions|undefined;
  private dataSeries: DataSeriesQuery|undefined;

  private readonly resizeObserver = new ResizeObserver(() => {
    this.redraw();
  });
  tooltip = '';

  constructor(
      private readonly appCoreService: AppCoreService,
      private readonly elm: ElementRef, readonly ref: ChangeDetectorRef) {}

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      this.interactions = this.interactionsDir?.get();
      try {
        this.interactions?.checkForSupportedActions(supportedActions);
        this.interactions?.checkForSupportedReactions(supportedReactions);
        this.interactions?.checkForSupportedWatches([]);
        this.dataSeries = this.dataSeriesQuery?.dataSeriesQuery;
        // Publish loading status.
        this.dataSeries?.loading.pipe(takeUntil(this.unsubscribe))
            .subscribe((loading) => {
              if (this.loadingDiv !== undefined) {
                this.loadingDiv.nativeElement.style.display =
                    loading ? 'block' : 'none';
              }
              // Force change detection.
              this.ref.detectChanges();
            });
        this.dataSeries?.response.pipe(takeUntil(this.unsubscribe))
            .subscribe((response) => {
              try {
                this.tree = new Tree(response);
                this.treeNodes = this.tree.renderTree();
              } catch (err: unknown) {
                appCore.err(err);
              }
              this.redrawDebouncer.next();
            });
      } catch (err: unknown) {
        appCore.err(err);
      }
    });

    this.redrawDebouncer.pipe(takeUntil(this.unsubscribe), debounceTime(50))
        .subscribe(() => {
          try {
            this.redraw();
          } catch (err: unknown) {
            this.appCoreService.appCore.err(err);
          }
        });
  }

  ngAfterViewInit() {
    this.resizeObserver.observe(this.elm.nativeElement);
    this.resize();
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
    this.resizeObserver.unobserve(this.elm.nativeElement);
  }

  handleMouseover(treeNode: RenderedTreeNode) {
    try {
      this.tooltip = treeNode.properties.expectString(Keys.TOOLTIP);
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }

  handleMouseout(treeNode: RenderedTreeNode) {
    this.tooltip = '';
  }

  @HostListener('window:resize')
  resize() {
    this.redrawDebouncer.next();
  }

  redraw() {
    // Empty trees should have a height and width of 0
    d3.select(this.svg.nativeElement).attr('width', 0).attr('height', 0);

    if (!this.componentDiv || !this.tree) {
      return;
    }
    // Temporarily hide the SVG so the correct container width is computed.
    const widthPx = this.componentDiv.nativeElement.offsetWidth;
    for (const treeNode of this.treeNodes) {
      treeNode.resize(widthPx);
    }
    const heightPx = this.treeNodes.reduce(
        (highestYPx, treeNode) =>
            (treeNode.y1Px > highestYPx) ? treeNode.y1Px : highestYPx,
        0);
    this.svg.nativeElement.style.display = 'none';
    d3.select(this.svg.nativeElement)
        .attr('width', widthPx)
        .attr('height', heightPx)
        .select('.chart-area')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', widthPx)
        .attr('height', heightPx);
    this.svg.nativeElement.style.display = 'block';

    const wt = this;
    // Create a bounding svg for each frame.  Add a colored rectangle and a
    // text to each.
    const nodes =
        d3.select<SVGSVGElement, RenderedTreeNode>(this.svg.nativeElement)
            .select<SVGSVGElement>('.chart-area')
            .selectAll<SVGSVGElement, RenderedTreeNode>('svg')
            .data(this.treeNodes);
    // Remove any extra nodes.
    nodes.exit().remove();
    // Add any new nodes.  Each added node consists of a container SVG,
    // with a rectangle and text nested beneath it.
    const enteredNodes =
        nodes.enter()
            .append('svg')
            .on('mouseover',
                (d: RenderedTreeNode) => {
                  this.interactions?.update(
                      NODES, ACTION_MOUSEOVER, d.properties);
                  wt.handleMouseover(d);
                })
            .on('mouseout',
                (d: RenderedTreeNode) => {
                  this.interactions?.update(
                      NODES, ACTION_MOUSEOUT, d.properties);
                  wt.handleMouseout(d);
                })
            .on('click', (d: RenderedTreeNode) => {
              this.interactions?.update(NODES, ACTION_CLICK, d.properties);
            });
    enteredNodes.append('rect');
    enteredNodes.append('text');
    const mergedNodes =
        nodes.merge(enteredNodes)
            .attr('x', (d: RenderedTreeNode) => d.x0Px)
            .attr('y', (d: RenderedTreeNode) => d.y0Px)
            .attr('width', (d: RenderedTreeNode) => d.widthPx)
            .attr('height', (d: RenderedTreeNode) => d.heightPx);
    mergedNodes.select('rect')
        .attr('width', (d: RenderedTreeNode) => d.widthPx)
        .attr('height', (d: RenderedTreeNode) => d.heightPx)
        .attr(
            'id',
            (d: RenderedTreeNode) => {
              return `rect${d.id}`;
            })
        .attr(
            'rx',
            (d: RenderedTreeNode) => {
              const rx = getStyle('rx', d.properties);
              if (rx) {
                return rx;
              }
              return '0px';
            })
        .attr('width', (d: RenderedTreeNode) => d.widthPx)
        .attr('height', (d: RenderedTreeNode) => d.heightPx)
        .attr('fill', (d: RenderedTreeNode) => d.fillColor)
        .attr('stroke', (d: RenderedTreeNode) => d.borderColor)
        .style('stroke-width', 1);
    mergedNodes.select('text')
        .attr('x', (d: RenderedTreeNode) => 4)
        .attr('y', (d: RenderedTreeNode) => d.heightPx - 4)
        .attr(
            'id',
            (d: RenderedTreeNode) => {
              return `text${d.id}`;
            })
        .attr('x', (d: RenderedTreeNode) => 4)
        .attr('y', (d: RenderedTreeNode) => d.heightPx - 4)
        .attr('fill', (d: RenderedTreeNode) => d.textColor)
        .text((d: RenderedTreeNode) => d.label)
        .style('font-size', '14px');


    // Update all node svgs, rects, and texts with their new positions, colors,
    // and contents.  This version of d3 update uses a lambda receiving a d3
    // selection; as d3 is untyped, this is `any` for now.
    // TODO(hamster) Migrate to d3v6 to use the join update API.
    mergedNodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.transition()
              .duration(this.transitionDurationMs)
              .attr('x', (d: RenderedTreeNode) => d.x0Px)
              .attr('y', (d: RenderedTreeNode) => d.y0Px)
              .attr('width', (d: RenderedTreeNode) => d.widthPx)
              .attr('height', (d: RenderedTreeNode) => d.heightPx);
        });
    mergedNodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.select('rect')
              .transition()
              .duration(this.transitionDurationMs)
              .attr(
                  'rx',
                  (d: RenderedTreeNode) => {
                    const rx = getStyle('rx', d.properties);
                    if (rx) {
                      return rx;
                    }
                    return '0px';
                  })
              .attr('width', (d: RenderedTreeNode) => d.widthPx)
              .attr('height', (d: RenderedTreeNode) => d.heightPx)
              .attr('fill', (d: RenderedTreeNode) => d.fillColor)
              .attr('stroke', (d: RenderedTreeNode) => d.borderColor)
              .style('stroke-width', 1);
        });
    mergedNodes.call(
        // tslint:disable-next-line:no-any
        (update: any) => {
          update.select('text')
              .attr('x', (d: RenderedTreeNode) => 4)
              .attr('y', (d: RenderedTreeNode) => d.heightPx - 4)
              .attr('fill', (d: RenderedTreeNode) => d.textColor)
              .style('font-size', '14px')
              .text((d: RenderedTreeNode) => d.label);
        });

    const match = this.interactions?.match(NODES, REACTION_HIGHLIGHT);
    if (match !== undefined) {
      for (const treeNode of this.treeNodes) {
        match(treeNode.properties)
            .pipe(
                takeUntil(this.redrawDebouncer),
                takeUntil(this.unsubscribe),
                distinctUntilChanged(),
                )
            .subscribe((matches) => {
              const nodes =
                  d3.select<SVGSVGElement, RenderedTreeNode>(
                        this.svg.nativeElement)
                      .select<SVGSVGElement>('.chart-area')
                      .selectAll<SVGSVGElement, RenderedTreeNode>('svg');
              const rect = nodes.select(`#rect${treeNode.id}`);
              const text = nodes.select(`#text${treeNode.id}`);
              if (matches) {
                this.highlightedNodes.add(treeNode);
                rect.transition()
                    .duration(this.transitionDurationMs)
                    .attr('fill', treeNode.highlightedFillColor)
                    .attr('stroke', treeNode.highlightedBorderColor);
                text.attr('fill', treeNode.highlightedTextColor);
              } else {
                this.highlightedNodes.delete(treeNode);
                rect.transition()
                    .duration(this.transitionDurationMs)
                    .attr('fill', treeNode.fillColor)
                    .attr('stroke', treeNode.borderColor);
                text.attr('fill', treeNode.textColor);
              }
            });
      }
    }
  }
}
