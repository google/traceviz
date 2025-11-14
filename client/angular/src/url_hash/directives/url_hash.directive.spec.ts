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

import {AppCoreService, int, str} from 'traceviz-angular-core';
import {BrowserModule} from '@angular/platform-browser';
import {CoreModule} from 'google3/third_party/traceviz/client/angular/src/core/core.module';
import {WINDOW, UrlHashDirective} from './url_hash.directive';
import {UrlHashModule} from '../url_hash.module';
import {Component, ContentChild} from '@angular/core';

/** A test component to wrap a <url-hash> so that we can inspect it. */
@Component({
  standalone: false,
  selector: 'test',
  template: `<div></div>`,
jit: true,

})
class TestComponent {
  @ContentChild(UrlHashDirective) urlHash: UrlHashDirective|undefined;
}

const mockWindow = () => {
  const location = {
    pathname: 'test.com',
    hash: '#bye=bad&state=eJyrVkovSk0tKVayUvJIzcnJVyjJSC1KVVTSUcorzVWyMqwFAL3YCr0%253D',
  };

  function saveURL(url: string) {
    if (url == null) { return; }
    const urlParts = url.split('#');
    expect(urlParts.length).toBeGreaterThanOrEqual(1);
    expect(urlParts.length).toBeLessThanOrEqual(2);
    if (urlParts.length > 1) {
      location.pathname = urlParts[0];
    }
    if (urlParts.length >= 2) {
      location.hash = `#${urlParts[1]}`;
    }
  }

  return {
    location, history: {
      replaceState: (data: unknown, unused: string, url: string) => {
        saveURL(url);
      },
      pushState: (data: unknown, unused: string, url: string) => {
        saveURL(url);
      },
    }
  };
};

describe('url-hash test', () => {
  const appCoreService = new AppCoreService();
    const byeVal = str('new');
    const greetingVal = str('hello');
    const countVal = int(1);

    beforeAll(() => {
      appCoreService.appCore.globalState.set('bye', byeVal);
      appCoreService.appCore.globalState.set('greeting', greetingVal);
      appCoreService.appCore.globalState.set('count', countVal);
      appCoreService.appCore.publish();
    });

  beforeEach(() => {
    setupModule({
      providers: [
        {
          provide: AppCoreService,
          useValue: appCoreService,
        },
        {
          provide: WINDOW,
          useValue: mockWindow(),
        }
      ],
      declarations: [
        TestComponent,
      ],
      imports: [
        BrowserModule,
        CoreModule,
        UrlHashModule,
      ],
    });
  });

  it('should read and write to the URL hash', () => {
    bootstrapTemplate<TestComponent>(`
      <test>
        <url-hash>
          <stateful>
            <string>bye</string>
            <string>num</string>
          </stateful>
          <unencoded>
            <value-map>
              <value key="bye"><global-ref key="bye"></global-ref></value>
            </value-map>
          </unencoded>
          <encoded>
            <value-map>
              <value key="greets"><global-ref key="greeting"></global-ref></value>
              <value key="num"><global-ref key="count"></global-ref></value>
            </value-map>
          </encoded>
        </url-hash>
      </test>`);

    const tc = getDebugEl('test').componentInstance;
    const uh = tc.urlHash;

    spyOn(uh, 'updateURL').and.callThrough();
    flush();
    expect(uh.updateURL).toHaveBeenCalledTimes(1);
    expect(byeVal.val).toEqual('bad');
    expect(greetingVal.val).toEqual('Hello there!');

    greetingVal.val = 'howdy';
    flush();
    expect(uh.updateURL).toHaveBeenCalledTimes(2);

    spyOn(uh.window.history, 'pushState').and.callThrough();
    spyOn(uh.window.history, 'replaceState').and.callThrough();

    uh.urlHashUpdated(uh.unencodedValueMap, {'bye': 'good'});
    flush();
    expect(byeVal.val).toEqual('good');
    expect(uh.window.history.pushState).toHaveBeenCalledTimes(1);
    // Ensure that not encoding is respected.
    expect(uh.window.location.hash).toContain('#bye=good');

    uh.urlHashUpdated(uh.encodedValueMap, {'greets': 'Well met!'});
    flush();
    expect(greetingVal.val).toEqual('Well met!');
    expect(uh.window.history.replaceState).toHaveBeenCalledTimes(1);
    // Ensure that encoding is respected.
    expect(uh.window.location.hash).not.toContain('greets=Well met!');
    expect(uh.window.location.hash)
        .toContain(
            'state=eJyrVkovSk0tKVayUgpPzclRyE0tUVTSUcorzVWyMqwFAJqJCYs%253D');

    uh.urlHashUpdated(uh.encodedValueMap, {'num': 100});
    flush();
    expect(countVal.val).toEqual(100);
    expect(uh.window.history.pushState).toHaveBeenCalledTimes(2);
    expect(
        uh.window.location.hash.includes(
            'state=eJyrVkovSk0tKVayUgpPzclRyE0tUVTSUcorzVWyMjQwqAUArZUJ6w%253D%253D'))
        .toBeTrue();

    // Check if unknown properties are filtered out.
    uh.window.location.hash = '#bye=tada&bad=hi';
    uh.parseURL();
    expect(byeVal.val).toEqual('tada');
    flush();
    uh.updateURL();
    flush();
    expect(uh.window.location.hash).toContain('bye=tada');
    expect(uh.window.location.hash).not.toContain('bad=hi');
  });
});