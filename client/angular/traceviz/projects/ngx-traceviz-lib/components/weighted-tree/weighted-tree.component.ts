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

import { AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, ElementRef, Input, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { DataSeriesQueryDirective } from '../../src/core/data_series_query.directive';
import { InteractionsDirective } from '../../src/core/interactions.directive';
import { AppCoreService } from '../../src/app_core_service/app_core.service';
import { ConfigurationError, DataSeriesQuery, Interactions, RenderedTreeNode, Severity, Tree, getStyle } from 'traceviz-client-core';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as d3 from 'd3';

const SOURCE = 'weighted-tree';

enum Keys {
    DETAIL_FORMAT = 'detail_format',
}

// Valid interactions targets
const NODE = 'node';

// Valid action types
const CLICK = 'click';
const MOUSEOVER = 'mouseover';
const MOUSEOUT = 'mouseout';

// Valid reaction types
const HIGHLIGHT = 'highlight';

const supportedActions = new Array<[string, string]>(
    [NODE, CLICK],
    [NODE, MOUSEOVER],
    [NODE, MOUSEOUT],
);

const supportedReactions = new Array<[string, string]>(
    [NODE, HIGHLIGHT],
);

const supportedWatches: string[] = [];

@Component({
    selector: 'weighted-tree',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div *ngIf="loading">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>>
    </div>
    <div class="content">
        <hovercard [visible]="tooltip !== ''">>{{tooltip}}</hovercard>
        <div class="content" #componentDiv (window:resize)="resize()">
            <svg #svg class='svg'>
                <g class="chart-area"></g>
            </svg>
        </div>
    </div>`,
    styleUrls: ['weighted-tree.component.css'],
})
export class WeightedTreeComponent implements AfterContentInit, AfterViewInit, OnDestroy {
    @ContentChild(DataSeriesQueryDirective) dataSeriesQueryDir: DataSeriesQueryDirective | undefined;
    @ContentChild(InteractionsDirective) interactionsDir: InteractionsDirective | undefined;

    @ViewChild('svg', { static: true }) svg!: ElementRef;
    @ViewChild('scopeNameDiv', { static: true }) scopeNameDiv!: ElementRef;
    @ViewChild('componentDiv') componentDiv!: ElementRef;

    @Input() transitionDurationMs = 500;

    loading = false;
    tooltip = '';

    // Ends all subscriptions in the component.
    private unsubscribe = new Subject<void>();
    // Signals when a redraw is requested.
    private redrawDebouncer = new Subject<void>();

    // Fields available after ngAfterContentInit.
    private interactions: Interactions | undefined;
    dataSeriesQuery: DataSeriesQuery | undefined;
    private treeNodes: RenderedTreeNode[] = [];

    constructor(private readonly appCoreService: AppCoreService, private readonly ref: ChangeDetectorRef) {
        console.log('uh');
    }

    ngAfterContentInit(): void {
        console.log('welp');
        this.appCoreService.appCore.onPublish((appCore) => {
            if (this.dataSeriesQueryDir === undefined) {
                appCore.err(new ConfigurationError(`weighted-tree is missing required 'data-series' child.`)
                    .from(SOURCE)
                    .at(Severity.ERROR));
                return;
            }
            console.log('here');
            this.dataSeriesQuery = this.dataSeriesQueryDir.dataSeriesQuery;

            // Ensure the user-specified interactions are supported.
            this.interactions = this.interactionsDir?.get();
            try {
                this.interactions?.checkForSupportedActions(supportedActions);
                this.interactions?.checkForSupportedReactions(supportedReactions);
                this.interactions?.checkForSupportedWatches(supportedWatches);
            } catch (err) {
                appCore.err(err);
            }

            // Publish loading status.
            this.dataSeriesQuery?.loading
                .pipe(takeUntil(this.unsubscribe))
                .subscribe((loading) => {
                    this.loading = loading;
                    this.ref.detectChanges();
                });

            // Handle new data series.
            this.dataSeriesQuery?.response
                .pipe(takeUntil(this.unsubscribe))
                .subscribe((response) => {
                    try {
                        const tree = new Tree(response);
                        this.treeNodes = tree.renderTopDownTree();
                        this.redraw();
                    } catch (err: unknown) {
                        appCore.err(err);
                    }
                    this.redrawDebouncer.next();
                });
        })
    }

    ngAfterViewInit(): void {
        this.redraw();
    }

    ngOnDestroy(): void {
        this.redrawDebouncer.next();
        this.redrawDebouncer.complete();
        this.unsubscribe.next();
        this.unsubscribe.complete();
    }

    @HostListener('window:resize')
    resize() {
        this.redrawDebouncer.next();
    }

    handleMouseover(treeNode: RenderedTreeNode) {
        try {
            this.tooltip = treeNode.properties.format(
                treeNode.properties.expectString(Keys.DETAIL_FORMAT));
        } catch (err: unknown) {
            this.appCoreService.appCore.err(err);
        }
    }

    handleMouseout() {
        this.tooltip = '';
    }

    redraw() {
        if (this.treeNodes.length === 0) {
            return;
        }
        const widthPx = this.componentDiv.nativeElement.offsetWidth;
        for (const treeNode of this.treeNodes) {
            treeNode.resize(widthPx);
        }
        const heightPx = this.treeNodes.reduce(
            (highestYPx, treeNode) => (treeNode.y1Px > highestYPx) ? treeNode.y1Px : highestYPx, 0);
        d3.select(this.svg.nativeElement)
            .attr('width', widthPx)
            .attr('height', heightPx)
            .select('.chart-area')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', widthPx)
            .attr('height', heightPx);
        this.svg.nativeElement.style.display

        const wt = this;
        // Create a bounding svg for each frame.  Add a colored rectangle and
        // text to each frame's svg.
        const nodes = d3.select(this.svg.nativeElement)
            .select('.chart-area')
            .selectAll('svg')
            .data(this.treeNodes);
        // Remove any extra nodes.
        nodes.exit().remove();
        // Add any new nodes.
        const enteredNodes: any = nodes.enter()
            .append('svg')
            .on('mouseover',
                (event: any, d: RenderedTreeNode) => {
                    this.interactions?.update(NODE, MOUSEOVER, d.properties);
                    wt.handleMouseover(d);
                })
            .on('mouseout',
                (event: any, d: RenderedTreeNode) => {
                    this.interactions?.update(NODE, MOUSEOUT, d.properties);
                    wt.handleMouseout();
                })
            .on('click',
              (event: any, d: RenderedTreeNode) => {
                this.interactions?.update(NODE, CLICK, d.properties);
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
            .attr('id', (d: RenderedTreeNode) => `rect${d.id}`)
            .attr('rx', (d: RenderedTreeNode) => {
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
            .attr('stroke-width', 1);
        mergedNodes.select('text')
            .attr('x', (d: RenderedTreeNode) => 4)
            .attr('y', (d: RenderedTreeNode) => d.heightPx - 4)
            .attr('id', (d: RenderedTreeNode) => `text${d.id}`)
            .attr('fill', (d: RenderedTreeNode) => d.textColor)
            .text((d: RenderedTreeNode) => d.label)
            .style('font-size', (d: RenderedTreeNode) => {
                const fontSize = getStyle('font-size', d.properties);
                if (fontSize) {
                    return fontSize;
                }
                return '14px';
            });

        // Update all node svgs, rects, and texts with their new positions,
        // colors, and contents.
        // TODO(ilhamster): Maybe migrate to d3 v6.
        mergedNodes.call(
            (update: any) =>
                update.transition()
                    .duration(this.transitionDurationMs)
                    .attr('rx', (d: RenderedTreeNode) => {
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
                    .attr('stroke-width', 1));
        mergedNodes.call(
            (update: any) => update.select('text')
                .attr('x', (d: RenderedTreeNode) => 4)
                .attr('y', (d: RenderedTreeNode) => d.heightPx - 4)
                .attr('id', (d: RenderedTreeNode) => `text${d.id}`)
                .attr('fill', (d: RenderedTreeNode) => d.textColor)
                .text((d: RenderedTreeNode) => d.label)
                .style('font-size', (d: RenderedTreeNode) => {
                    const fontSize = getStyle('font-size', d.properties);
                    if (fontSize) {
                        return fontSize;
                    }
                    return '14px';
                }));

        const matchFn = this.interactions?.match(NODE, HIGHLIGHT);
        if (matchFn !== undefined) {
            for (const treeNode of this.treeNodes) {
                matchFn(treeNode.properties)
                    .pipe(
                        takeUntil(this.redrawDebouncer),
                        takeUntil(this.unsubscribe),
                        distinctUntilChanged(),
                    )
                    .subscribe((matches) => {
                        const rect = nodes.select(`#rect${treeNode.id}`);
                        const text = nodes.select(`#text${treeNode.id}`);
                        if (matches) {
                            rect.transition()
                                .duration(this.transitionDurationMs)
                                .attr('fill', treeNode.highlightedFillColor)
                                .attr('stroke', treeNode.highlightedBorderColor);
                            text.attr('fill', treeNode.highlightedTextColor);
                        } else {
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