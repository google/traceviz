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

import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {AppCoreService, CoreModule, TestCoreModule} from '@traceviz/angular/core';
import {IntegerValue, StringValue} from '@traceviz/client-core';

import {UrlHashDirective, WINDOW} from './url_hash.directive';
import {UrlHashModule} from './url_hash.module';


/** A test component to wrap a <url-hash> so that we can inspect it. */
@Component({
  standalone: false,
  selector: 'test',
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="bye"><string>bye</string></value>
        <value key="greeting"><string>hello</string></value>
        <value key="count"><int>1</int></value>
      </value-map>
    </global-state>
    <test-data-query>
    </test-data-query>
  </app-core>
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
  </url-hash>`,
  jit: true,

})
class TestComponent {
  @ViewChild(UrlHashDirective) urlHash!: UrlHashDirective;
}

const mockWindow = () => {
  const location = {
    pathname: '/test',
    hash:
        '#bye=bad&state=eMKcwqtWSsKqTFXCslJKSkxRw5JRSi9KTS0pBnI9UnNyw7IVSjJSwotSFcKBw6J5wqXCuUpWwobCtQBEw6gOEg%3D%3D',
  };

  function saveURL(url: string) {
    if (url == null) {
      return;
    }
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
    location,
    history: {
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
  let fixture: ComponentFixture<TestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeAll(() => {
    const realReplace = window.history.replaceState;
    const realPush = window.history.pushState;

    window.history.replaceState = function(...args) {
      console.error('!!! EARLY REPLACE', args);
      return realReplace.apply(this, args);
    };

    window.history.pushState = function(...args) {
      console.error('!!! EARLY PUSH', args);
      return realPush.apply(this, args);
    };
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed.configureTestingModule({
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
        // BrowserModule,
        CoreModule,
        TestCoreModule,
        UrlHashModule,
      ],
    });
    fixture = TestBed.createComponent(TestComponent);
    await fixture.whenStable();
  });

  it('should read and write to the URL hash', fakeAsync(() => {
       fixture.detectChanges();

       const ci = fixture.componentInstance;
       const uh = ci.urlHash!;
       const byeVal =
           appCoreService.appCore.globalState.get('bye') as StringValue;
       const greetingVal =
           appCoreService.appCore.globalState.get('greeting') as StringValue;
       const countVal =
           appCoreService.appCore.globalState.get('count') as IntegerValue;

       spyOn(uh, 'updateURL').and.callThrough();
       expect(byeVal.val).toEqual('bad');
       expect(greetingVal.val).toEqual('Hello there!');

       console.log('updating greeting');
       greetingVal.val = 'howdy';
       console.log('updated greeting');
       expect(uh.updateURL).toHaveBeenCalledTimes(1);

       spyOn(uh.window.history, 'pushState').and.callThrough();
       spyOn(uh.window.history, 'replaceState').and.callThrough();

       uh.urlHashUpdated(uh.unencodedValueMap!, {'bye': 'good'});
       expect(byeVal.val).toEqual('good');
       expect(uh.window.history.pushState).toHaveBeenCalledTimes(1);
       // Ensure that not encoding is respected.
       expect(uh.window.location.hash).toContain('#bye=good');
       uh.urlHashUpdated(uh.encodedValueMap!, {'greets': 'Well met!'});
       expect(greetingVal.val).toEqual('Well met!');
       expect(uh.window.history.replaceState).toHaveBeenCalledTimes(1);
       // Ensure that encoding is respected.
       expect(uh.window.location.hash).not.toContain('greets=Well met!');
       expect(uh.window.location.hash)
           .toContain(
               'state=eMKcwqtWSi9KTS0pVsKyUgpPw43DiVHDiE0tUVTDklHDiivDjVXCsjLCrAUAwprCiQnCiw%253D%253D');

       uh.urlHashUpdated(uh.encodedValueMap!, {'num': 100});
       expect(countVal.val).toEqual(100);
       expect(uh.window.history.pushState).toHaveBeenCalledTimes(2);
       console.log(uh.window.location.hash);
       expect(
           uh.window.location.hash.includes(
               'state=eMKcwqtWSi9KTS0pVsKyUgpPw43DiVHDiE0tUVTDklHDiivDjVXCsjI0MMKoBQDCrcKVCcOr'))
           .toBeTrue();

       // Check if unknown properties are filtered out.
       uh.window.location.hash = '#bye=tada&bad=hi';
       uh.parseURL();
       expect(byeVal.val).toEqual('tada');
       uh.updateURL();
       expect(uh.window.location.hash).toContain('bye=tada');
       expect(uh.window.location.hash).not.toContain('bad=hi');
     }));
});
