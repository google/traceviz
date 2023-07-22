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
 * @fileoverview A directive defining an app's global state.
 */

import {AfterContentInit, ContentChild, Directive} from '@angular/core';
import {AppCore, ConfigurationError, Severity} from 'traceviz-client-core';

import {AppCoreService} from '../services/app_core.service';

import {ValueMapDirective} from './value_map.directive';

const SOURCE = 'global_state.directive';

@Directive({selector: 'global-state'})
export class GlobalStateDirective implements AfterContentInit {
  @ContentChild(ValueMapDirective) values: ValueMapDirective|undefined;

  constructor(private readonly appCoreService: AppCoreService) {}

  ngAfterContentInit(): void {
    this.appCoreService.appCore.onPublish((appCore: AppCore) => {
      if (this.values === undefined) {
        throw new ConfigurationError('global-state lacks a value-map')
            .from(SOURCE)
            .at(Severity.FATAL);
      }
      for (const [key, value] of this.values.getValueMap().entries()) {
        appCore.globalState.set(key, value);
      }
      this.values = undefined;
    });
  }
}
