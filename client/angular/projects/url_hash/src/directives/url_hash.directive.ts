/*
        Copyright 2025 Google Inc.
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
 * @fileoverview A directive that populates the URL hash from a set of Values,
 * updating the hash whenever the Values change, and updates that set of Values
 * from the URL hash.
 */

import {AfterContentInit, ContentChild, Directive, HostListener, Inject, InjectionToken, OnDestroy} from '@angular/core';
import {AppCoreService, StringLiteralListDirective, ValueMapDirective} from '@google/traceviz-angular-core';
import {compress, ConfigurationError, decompress, ExportedKeyValueMap, serializeHashFragment, Severity, unserializeHashFragment, ValueMap} from '@traceviz/client-core';
import {merge, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

/** Injection token for the window object, allowing it to be mocked in tests. */
export const WINDOW =
    new InjectionToken<Window>('window', {factory: () => window});
const STATE_KEY = 'state';
const SOURCE = 'url_hash/directives';

/**
 * A directive for url-hash to mark a value map to be encoded in a state blob
 */
@Directive({selector: 'encoded'})
export class EncodedDirective implements AfterContentInit {
  @ContentChild(ValueMapDirective) valueMap?: ValueMapDirective;

  ngAfterContentInit() {
    if (!this.valueMap) {
      throw new ConfigurationError('<encoded> must contain a <value-map>')
          .at(Severity.ERROR)
          .from(SOURCE);
    }
  }
}

/**
 * A directive for url-hash to mark a value map to be unencoded in the URL
 * parameters
 */
@Directive({selector: 'unencoded'})
export class UnencodedDirective implements AfterContentInit {
  @ContentChild(ValueMapDirective) valueMap?: ValueMapDirective;

  ngAfterContentInit() {
    if (!this.valueMap) {
      throw new ConfigurationError('<unencoded> must contain a <value-map>')
          .at(Severity.ERROR)
          .from(SOURCE);
    }
  }
}

/**
 * A directive whose children are a list of string keys whose value changes will
 * result in a history state being pushed.
 */
@Directive({selector: 'stateful'})
export class StatefulDirective extends StringLiteralListDirective {
}

/**
 * A directive specifying a set of keyed Values to be encoded into, and
 * updated from, the URL hash.
 *
 * The set of Values to be encoded into/populated from the hash is specified by
 * a contained <value-map>, whose keys specify keys in the URL hash (or in an
 * encoded, zipped object stored in the hash) and whose values reference Values
 * to be updated upon reading the hash.
 */
@Directive({selector: 'url-hash'})
export class UrlHashDirective implements AfterContentInit, OnDestroy {
  @ContentChild(EncodedDirective) encodedValues?: EncodedDirective;
  @ContentChild(UnencodedDirective) unencodedValues?: UnencodedDirective;
  @ContentChild(StatefulDirective) statefulValues?: StatefulDirective;

  encodedValueMap?: ValueMap;
  unencodedValueMap?: ValueMap;
  statefulKeys = new Set<string>();

  private readonly destroyed = new Subject<void>();
  readonly updateDebouncer = new Subject<void>();

  constructor(
      private readonly appCoreService: AppCoreService,
      @Inject(WINDOW) readonly window: Window) {
    this.updateDebouncer.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.updateURL();
    });
  }

  updateURL() {
    console.log('updating');
    let replaceState = true;
    const hash = unserializeHashFragment(this.window.location.hash);
    let decodedStateJSON: ExportedKeyValueMap|undefined;
    let compressedState: string|undefined;
    const unencodedState: {[k: string]: string} = {};

    if (this.encodedValueMap) {
      const {[STATE_KEY]: encodedState} = hash;
      if (encodedState != null) {
        decodedStateJSON = decompress<ExportedKeyValueMap>(encodedState);
      }

      // If we've changed any stateful key, we want to create a new state,
      // not replace the existing one.
      for (const [key, value] of this.encodedValueMap.entries()) {
        if (this.statefulKeys.has(key) &&
            (decodedStateJSON == null ||
             decodedStateJSON[key] !== value.exportTo())) {
          replaceState = false;
          break;
        }
      }

      compressedState = compress(this.encodedValueMap.exportKeyValueMap());
    }
    if (this.unencodedValueMap) {
      for (const [key, value] of this.unencodedValueMap.entries()) {
        const exportedValue = value.exportTo();
        if (typeof exportedValue === 'string') {
          const oldValue = hash[key];
          unencodedState[key] = exportedValue;
          if (oldValue !== exportedValue && this.statefulKeys.has(key)) {
            // Create a new history state since a stateful property changed.
            replaceState = false;
          }
        }
      }
    }

    // Creating a new state filters out anything unexpected that may have been
    // manually added to the hash.
    let finalHash: {[k: string]: string} = {};
    if (compressedState) {
      finalHash[STATE_KEY] = compressedState;
    }
    finalHash = {...finalHash, ...unencodedState};

    const serializedHash = serializeHashFragment(finalHash);
    const newURL = `${this.window.location.pathname}${serializedHash}`;
    if (replaceState) {
      this.window.history.replaceState(null, '', newURL);
    } else {
      this.window.history.pushState(null, '', newURL);
    }
  }

  err(err: unknown) {
    this.appCoreService.appCore.err(err);
  }

  urlHashUpdated(valueMap: ValueMap, hashContents: ExportedKeyValueMap) {
    // Filter out unexpected keys
    const filteredHashContents = Object.fromEntries(
        Object.entries(hashContents).filter(([key]) => valueMap.has(key)));
    try {
      valueMap.updateFromExportedKeyValueMap(filteredHashContents);
    } catch (err: unknown) {
      this.err(err);
    }
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  @HostListener('window:popstate')
  parseURL() {
    const hash = unserializeHashFragment(this.window.location.hash);
    const {[STATE_KEY]: encodedState, ...paramJSON} = hash;
    if (encodedState != null) {
      const decodedStateJSON = decompress<ExportedKeyValueMap>(encodedState);
      if (decodedStateJSON && this.encodedValueMap != null) {
        this.urlHashUpdated(this.encodedValueMap, decodedStateJSON);
      }
    }

    // Non-state blob values have precedence,
    // which is why we set the unencoded values are set after the encoded.
    if (this.unencodedValues?.valueMap) {
      this.unencodedValueMap = this.unencodedValues.valueMap.getValueMap();
      this.urlHashUpdated(this.unencodedValueMap, paramJSON);
    }
  }

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish(() => {
      if (!this.encodedValues && !this.unencodedValues) {
        return;
      }

      const valueMaps: ValueMap[] = [];
      if (this.encodedValues?.valueMap) {
        this.encodedValueMap = this.encodedValues.valueMap.getValueMap();
        valueMaps.push(this.encodedValueMap);
      }
      if (this.unencodedValues?.valueMap) {
        this.unencodedValueMap = this.unencodedValues.valueMap.getValueMap();
        valueMaps.push(this.unencodedValueMap);
      }
      if (this.statefulValues) {
        this.statefulKeys = new Set(this.statefulValues.val);
      }

      this.parseURL();

      merge(...valueMaps.map(vm => [...vm.values()]).flat())
          .pipe(takeUntil(this.destroyed))
          .subscribe(() => {
            this.updateDebouncer.next();
          });
    });
  }
}
