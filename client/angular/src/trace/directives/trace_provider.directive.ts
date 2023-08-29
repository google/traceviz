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

import {AfterContentInit, ContentChild, ContentChildren, Directive, forwardRef, OnDestroy, QueryList} from '@angular/core';
import {BehaviorSubject, combineLatest, ReplaySubject, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';
import {AppCoreService, DataSeriesQueryDirective} from 'traceviz-angular-core';
import {DataSeriesQuery, Trace} from 'traceviz-client-core';

/**
 * A directive producing a trace and a 'loading' status.  Trace visualization
 * components should get their trace data from TraceProvider @ContentChildren,
 * rather than a specific TraceProvider implementation.
 */
export abstract class TraceProvider {
  /** An observable emitting true when trace data is being fetched. */
  abstract loading: BehaviorSubject<boolean>;
  /** An observable emitting fetched Trace data when it becomes available. */
  abstract trace: ReplaySubject<Trace<unknown>>;
  /**
   * The unique data series names of all data series under this provider.  For
   * testing only.
   */
  abstract uniqueSeriesNames: ReplaySubject<string[]>;
}

/** Specifies a trace populated from a single data series. */
@Directive({
  selector: 'trace',
  providers:
      [{provide: TraceProvider, useExisting: forwardRef(() => TraceDirective)}],
})
export class TraceDirective extends TraceProvider implements AfterContentInit,
                                                             OnDestroy {
  @ContentChild(DataSeriesQueryDirective) dataSeries: DataSeriesQueryDirective|undefined;

  trace = new ReplaySubject<Trace<unknown>>();
  loading = new BehaviorSubject<boolean>(false);
  uniqueSeriesNames = new ReplaySubject<string[]>();
  readonly unsubscribe = new Subject<void>();
  private dataSeriesQuery: DataSeriesQuery|undefined;

  constructor(private readonly appCoreService: AppCoreService) {
    super();
  }

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      try {
        this.dataSeriesQuery = this.dataSeries?.dataSeriesQuery;
      } catch (err: unknown) {
        appCore.err(err);
      }
      // Publish loading status.
      this.dataSeriesQuery?.loading.pipe(takeUntil(this.unsubscribe))
          .subscribe((loading) => {
            this.loading.next(loading);
          });
      this.dataSeriesQuery?.response.pipe(takeUntil(this.unsubscribe))
          .subscribe((response) => {
            try {
              this.trace.next(Trace.fromNode(response));
            } catch (err: unknown) {
              appCore.err(err);
            }
          });
      if (this.dataSeriesQuery !== undefined) {
        this.uniqueSeriesNames.next([this.dataSeriesQuery.uniqueSeriesName]);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}

/** Specifies a trace populated by the union of multiple data series. */
@Directive({
  selector: 'union-traces',
  providers: [{
    provide: TraceDirective,
    useExisting: forwardRef(() => UnionTracesDirective)
  }],
})
export class UnionTracesDirective extends TraceProvider implements
    AfterContentInit, OnDestroy {
  private layersUnsubscribe = new Subject<void>();
  private readonly changesUnsubscribe = new Subject<void>();
  @ContentChildren(TraceDirective) layers = new QueryList<TraceDirective>();

  trace = new ReplaySubject<Trace<unknown>>();
  loading = new BehaviorSubject<boolean>(false);
  uniqueSeriesNames = new ReplaySubject<string[]>();

  constructor(private readonly appCoreService: AppCoreService) {
    super();
  }

  ngAfterContentInit() {
    this.refreshLayers();
    this.layers.changes.pipe(takeUntil(this.changesUnsubscribe))
        .subscribe(() => {
          this.refreshLayers();
        });
  }

  private refreshLayers() {
    this.layersUnsubscribe.next();
    this.layersUnsubscribe.complete();
    this.layersUnsubscribe = new Subject<void>();
    const loading = new Array<BehaviorSubject<boolean>>();
    const traces = new Array<ReplaySubject<Trace<unknown>>>();
    const uniqueSeriesNames = new Array<ReplaySubject<string[]>>();
    for (const layer of this.layers) {
      loading.push(layer.loading);
      traces.push(layer.trace);
      uniqueSeriesNames.push(layer.uniqueSeriesNames);
    }
    combineLatest(loading)
        .pipe(
            takeUntil(this.layersUnsubscribe),
            map((vals: boolean[]) =>
                    vals.reduce((prev, curr) => prev || curr, false)),
            )
        .subscribe((loading: boolean) => {
          this.loading.next(loading);
        });
    combineLatest(traces)
        .pipe(
            takeUntil(this.layersUnsubscribe),
            map((vals: Array<Trace<unknown>>) => {
              let t: Trace<unknown>|undefined;
              try {
                t = Trace.union(...vals);
              } catch (err: unknown) {
                this.appCoreService.appCore.err(err);
              }
              return t;
            }))
        .subscribe((t: Trace<unknown>|undefined) => {
          if (t !== undefined) {
            this.trace.next(t);
          }
        });
    combineLatest(uniqueSeriesNames)
        .pipe(takeUntil(this.layersUnsubscribe), map((vals: string[][]) => {
                return Array.prototype.concat(...vals);
              }))
        .subscribe((usns: string[]) => {
          this.uniqueSeriesNames.next(usns);
        });
  }

  ngOnDestroy() {
    this.layersUnsubscribe.next();
    this.layersUnsubscribe.complete();
    this.changesUnsubscribe.next();
    this.changesUnsubscribe.complete();
  }
}
