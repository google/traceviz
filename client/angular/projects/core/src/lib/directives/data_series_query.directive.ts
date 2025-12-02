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
 * @fileoverview Directives used to define a data series.
 */

import {AfterContentInit, ContentChild, Directive, Input, OnDestroy} from '@angular/core';
import {ConfigurationError, DataSeriesQuery, DEFAULT_DATA_QUERY_ID, Severity, StringValue, ValueMap} from '@traceviz/client-core';

import {AppCoreService} from '../services/app_core.service';

import {InteractionsDirective} from './interactions.directive';
import {ValueDirective} from './value.directive';
import {ValueMapDirective} from './value_map.directive';

const SOURCE = 'data_series_query.directive';

/** Specifies a dataseries query name. */
@Directive({standalone: false, selector: 'query'})
export class QueryDirective {
  @ContentChild(ValueDirective) queryName: ValueDirective|undefined;
}

/** Specifies a key-value mapping of dataseries query parameters. */
@Directive({standalone: false, selector: 'parameters'})
export class ParametersDirective {
  @ContentChild(ValueMapDirective) parameters: ValueMapDirective|undefined;
}

const DATASERIES = 'data-series';
const FETCH = 'fetch';

const supportedReactions = new Array<[string, string]>(
    [DATASERIES, FETCH]  // The data series is fetched or refetched.
);

/**
 * A data series definition, to be enclosed in a type that consumes that data
 * series, such as a UI component.
 */
@Directive({standalone: false, selector: 'data-series'})
export class DataSeriesDirective implements AfterContentInit, OnDestroy {
  @Input() dataQueryID: string = DEFAULT_DATA_QUERY_ID;
  @ContentChild(QueryDirective) query?: QueryDirective;
  @ContentChild(ParametersDirective) parameters?: ParametersDirective;
  @ContentChild(InteractionsDirective) interactions?: InteractionsDirective;
  // Available after ContentInit.  Since ngAfterContentInit is invoked on a
  // component's children before being invoked on the component itself,
  // dataSeriesQuery should be available in a parent component's
  // ngAfterContentInit.
  dataSeriesQuery: DataSeriesQuery|undefined;

  constructor(private readonly appCoreService: AppCoreService) {}

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      try {
        if (this.query === undefined) {
          throw new ConfigurationError(
              `data-series is missing required 'query' child.`)
              .from(SOURCE)
              .at(Severity.ERROR);
        }
        if (this.query.queryName === undefined ||
            this.query.queryName.get() === undefined ||
            !(this.query.queryName.get() instanceof StringValue)) {
          throw new ConfigurationError(`query takes a single string child.`)
              .from(SOURCE)
              .at(Severity.ERROR);
        }
        if (this.interactions === undefined) {
          throw new ConfigurationError(
              `data-series is missing required 'interactions' child.`)
              .from(SOURCE)
              .at(Severity.ERROR);
        }
        const interactions = this.interactions.get();
        interactions.checkForSupportedActions([]);
        interactions.checkForSupportedReactions(supportedReactions);
        interactions.checkForSupportedWatches([]);
        let parameters: ValueMap|undefined;
        if (this.parameters !== undefined) {
          parameters = this.parameters.parameters?.getValueMap();
        }
        if (parameters === undefined) {
          parameters = new ValueMap();
        }
        this.dataSeriesQuery = new DataSeriesQuery(
            appCore.getDataQuery(this.dataQueryID),
            this.query.queryName.get() as StringValue, parameters,
            interactions.match(DATASERIES, FETCH)());
      } catch (err: unknown) {
        appCore.err(err);
      }
    });
  }

  ngOnDestroy(): void {
    this.dataSeriesQuery?.dispose();
  }
}
