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

import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {IntegerValue, DurationValue, Duration, int, str, DoubleValue, StringValue, prettyPrintDocumenter, StringSetValue, Timestamp, TimestampValue, ts, valueMap} from 'traceviz-client-core';

import {AppCoreService} from '../services/app_core.service';

import {AppCoreDirective} from './app_core.directive';
import {CoreModule} from '../core.module';
import {InteractionsDirective} from './interactions.directive';
import {TestCoreModule} from '../test_core.module';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="number_text"><string></string></value>
        <value key="is_one"><int>0</int></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <interactions>
    <action target="item" type="click">
      <if>
        <equals>
          <local-ref key="num"></local-ref>
          <int>0</int>
        </equals>
        <then>
          <set>
            <global-ref key="number_text"></global-ref>
            <string>none</string>
          </set>
          <set>
            <global-ref key="is_one"></global-ref>
            <int>0</int>
          </set>
        </then>
        <else>
          <if>
            <equals>
              <local-ref key="num"></local-ref>
              <int>1</int>
            </equals>
            <then>
              <set>
                <global-ref key="number_text"></global-ref>
                <string>one</string>
              </set>
              <set>
                <global-ref key="is_one"></global-ref>
                <int>1</int>
              </set>
            </then>
            <else>
              <set>
                <global-ref key="number_text"></global-ref>
                <string>several</string>
              </set>
              <set>
                <global-ref key="is_one"></global-ref>
                <int>0</int>
              </set>
            </else>
          </if>
        </else>
      </if>
    </action>
  </interactions>`
})
class IfTestComponent {
  @ViewChild(InteractionsDirective) ints!: InteractionsDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('if test', () => {
  let fixture: ComponentFixture<IfTestComponent>;
  const appCoreService = new AppCoreService();
  let numberText: StringValue;
  let isOne: IntegerValue;

  beforeAll(() => {
    TestBed.configureTestingModule({
      declarations: [IfTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(IfTestComponent);
    fixture.detectChanges();
    numberText =
        appCoreService.appCore.globalState.get('number_text') as StringValue;
    isOne = appCoreService.appCore.globalState.get('is_one') as IntegerValue;
  });

  beforeEach(() => {
    numberText.val = '';
    isOne.val = 0;
  });

  it('conditionally executes properly', () => {
    const errs: string[] = [];
    appCoreService.appCore.configurationErrors.subscribe((err) => {
      errs.push(err.message);
    });
    const itc = fixture.componentInstance;
    itc.ints.get().update(
        'item', 'click',
        valueMap(
            {key: 'num', val: int(0)},
            ));
    expect(numberText.val).toEqual('none');
    expect(isOne.val).toEqual(0);
    itc.ints.get().update(
        'item', 'click',
        valueMap(
            {key: 'num', val: int(1)},
            ));
    expect(numberText.val).toEqual('one');
    expect(isOne.val).toEqual(1);
    itc.ints.get().update(
        'item', 'click',
        valueMap(
            {key: 'num', val: int(5)},
            ));
    expect(numberText.val).toEqual('several');
    expect(isOne.val).toEqual(0);
    expect(errs).toEqual([]);
  });
});

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="number_text"><string></string></value>
        <value key="is_one"><int>0</int></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <interactions>
    <action target="item" type="click">
      <switch>
        <case>
          <equals>
            <local-ref key="num"></local-ref>
            <int>1</int>
          </equals>
          <set>
            <global-ref key="is_one"></global-ref>
            <int>1</int>
          </set>
        </case>
        <case>
          <true></true>
          <set>
            <global-ref key="is_one"></global-ref>
            <int>0</int>
          </set>
        </case>
      </switch>
      <switch>
        <case>
          <equals>
            <local-ref key="num"></local-ref>
            <int>0</int>
          </equals>
          <set>
            <global-ref key="number_text"></global-ref>
            <string>none</string>
          </set>
        </case>
        <case>
          <equals>
            <local-ref key="num"></local-ref>
            <int>1</int>
          </equals>
          <set>
            <global-ref key="number_text"></global-ref>
            <string>one</string>
          </set>
        </case>
        <case>
          <true></true>
          <set>
            <global-ref key="number_text"></global-ref>
            <string>several</string>
          </set>
        </case>
      </switch>
    </action>
  </interactions>`
})
class SwitchTestComponent {
  @ViewChild(InteractionsDirective) ints!: InteractionsDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('switch test', () => {
  let fixture: ComponentFixture<IfTestComponent>;
  const appCoreService = new AppCoreService();
  let numberText: StringValue;
  let isOne: IntegerValue;

  beforeAll(() => {
    TestBed.configureTestingModule({
      declarations: [IfTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(IfTestComponent);
    fixture.detectChanges();
    numberText =
        appCoreService.appCore.globalState.get('number_text') as StringValue;
    isOne = appCoreService.appCore.globalState.get('is_one') as IntegerValue;
  });

  beforeEach(() => {
    numberText.val = '';
    isOne.val = 0;
  });

  it('conditionally executes properly', () => {
    const errs: string[] = [];
    appCoreService.appCore.configurationErrors.subscribe((err) => {
      errs.push(err.message);
    });
    const itc = fixture.componentInstance;
    itc.ints.get().update(
        'item', 'click',
        valueMap(
            {key: 'num', val: int(0)},
            ));
    expect(numberText.val).toEqual('none');
    expect(isOne.val).toEqual(0);
    itc.ints.get().update(
        'item', 'click',
        valueMap(
            {key: 'num', val: int(1)},
            ));
    expect(numberText.val).toEqual('one');
    expect(isOne.val).toEqual(1);
    itc.ints.get().update(
        'item', 'click',
        valueMap(
            {key: 'num', val: int(5)},
            ));
    expect(numberText.val).toEqual('several');
    expect(isOne.val).toEqual(0);
    expect(errs).toEqual([]);
  });
});

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="filtered_text"><string></string></value>
        <value key="text_2"><string></string></value>
        <value key="called_out_num"><int></int></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <interactions>
    <action target="item" type="click">
      <toggle>
        <global-ref key="filtered_text"></global-ref>
        <local-ref key="text"></local-ref>
      </toggle>
      <set>
        <global-ref key="called_out_num"></global-ref>
        <local-ref key="num"></local-ref>
      </set>
      <set>
        <global-ref key="text_2"></global-ref>
        <string>thing 2</string>
      </set>
    </action>
    <action target="item" type="clear">
      <clear>
        <global-ref key="filtered_text"></global-ref>
      </clear>
    </action>
  </interactions>`
})
class ActionTestComponent {
  @ViewChild(InteractionsDirective) ints!: InteractionsDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('actions test', () => {
  let fixture: ComponentFixture<ActionTestComponent>;
  const appCoreService = new AppCoreService();
  let filteredText: StringValue;
  let text2: StringValue;
  let calledOutNum: IntegerValue;

  beforeAll(() => {
    TestBed.configureTestingModule({
      declarations: [ActionTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(ActionTestComponent);
    fixture.detectChanges();
    filteredText =
        appCoreService.appCore.globalState.get('filtered_text') as StringValue;
    text2 = appCoreService.appCore.globalState.get('text_2') as StringValue;
    calledOutNum = appCoreService.appCore.globalState.get('called_out_num') as
        IntegerValue;
  });

  beforeEach(() => {
    filteredText.val = '';
    text2.val = '';
    calledOutNum.val = 0;
  });

  it('updates multiple values on event', () => {
    const itc = fixture.componentInstance;
    const localValues = valueMap(
        {key: 'text', val: str('thing one')},
        {key: 'num', val: int(10)},
    );
    itc.ints.get().update('item', 'click', localValues);
    expect(filteredText.val).toEqual('thing one');
    expect(text2.val).toEqual('thing 2');
    expect(calledOutNum.val).toEqual(10);
  });

  it('does not update a missing key', () => {
    const itc = fixture.componentInstance;
    const localValues = valueMap(
        {key: 'num', val: int(10)},
    );
    itc.ints.get().update('item', 'click', localValues);
    expect(filteredText.val).toEqual('');
    expect(calledOutNum.val).toEqual(10);
  });

  it('clears on event', () => {
    const itc = fixture.componentInstance;
    const localValues = valueMap(
        {key: 'text', val: str('thing one')},
        {key: 'num', val: int(10)},
    );
    itc.ints.get().update('item', 'click', localValues);
    expect(filteredText.val).toEqual('thing one');
    expect(calledOutNum.val).toEqual(10);
    itc.ints.get().update('item', 'clear', localValues);
    expect(filteredText.val).toEqual('');
  });
});

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="mode"><string></string></value>
        <value key="selected_names"><string-set></string-set></value>
        <value key="called_out_num"><int>0</int></value>
        <value key="hover_time"><timestamp></timestamp></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <interactions>
    <reaction target="item" type="highlight">
      <and>
        <equals>
          <global-ref key="mode"></global-ref>
          <string>select</string>
        </equals>
        <or>
          <includes>
            <global-ref key="selected_names"></global-ref>
            <local-ref key="name"></local-ref>
          </includes>
          <includes>
            <global-ref key="called_out_num"></global-ref>
            <local-ref key="num"></local-ref>
          </includes>
          <and>
            <not>
              <less-than>
                <global-ref key="hover_time"></global-ref>
                <local-ref key="start"></local-ref>
              </less-than>
            </not>
            <not>
              <greater-than>
                <global-ref key="hover_time"></global-ref>
                <local-ref key="end"></local-ref>
              </greater-than>
            </not>
          </and>
        </or>
      </and>
    </reaction>
  </interactions>`
})
class ReactionTestComponent {
  @ViewChild(InteractionsDirective) ints!: InteractionsDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('reactions test', () => {
  let fixture: ComponentFixture<ReactionTestComponent>;
  const appCoreService = new AppCoreService();
  let mode: StringValue;
  let selectedNames: StringSetValue;
  let calledOutNum: IntegerValue;
  let hoverTime: TimestampValue;

  beforeAll(() => {
    TestBed.configureTestingModule({
      declarations: [ReactionTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(ReactionTestComponent);
    fixture.detectChanges();
    mode = appCoreService.appCore.globalState.get('mode') as StringValue;
    selectedNames = appCoreService.appCore.globalState.get('selected_names') as
        StringSetValue;
    calledOutNum = appCoreService.appCore.globalState.get('called_out_num') as
        IntegerValue;
    hoverTime =
        appCoreService.appCore.globalState.get('hover_time') as TimestampValue;
  });

  beforeEach(() => {
    mode.val = 'select';
    selectedNames.val = new Set<string>();
    calledOutNum.val = 1;
    hoverTime.val = new Timestamp(0, 0);
  });

  it('reacts', () => {
    const itc = fixture.componentInstance;
    const unsubscribe = new Subject<void>();
    const highlighted = new Set<number>();
    [valueMap(
         {key: 'name', val: str('thing1')}, {key: 'num', val: int(1)},
         {key: 'start', val: ts(new Timestamp(100, 0))},
         {key: 'end', val: ts(new Timestamp(200, 0))}),
     valueMap(
         {key: 'name', val: str('thing2')}, {key: 'num', val: int(2)},
         {key: 'start', val: ts(new Timestamp(200, 0))},
         {key: 'end', val: ts(new Timestamp(300, 0))}),
     valueMap(
         {key: 'name', val: str('thing3')}, {key: 'num', val: int(3)},
         {key: 'start', val: ts(new Timestamp(1000, 0))},
         {key: 'end', val: ts(new Timestamp(2000, 2000))})]
        .forEach((localValues, id) => {
          itc.ints.get()
              .match('item', 'highlight')(localValues)
              .pipe(
                  takeUntil(unsubscribe),
                  )
              .subscribe((match) => {
                if (match) {
                  highlighted.add(id);
                } else {
                  highlighted.delete(id);
                }
              });
        });
    expect(highlighted).toEqual(new Set([0]));
    hoverTime.val = new Timestamp(1500, 0);
    expect(highlighted).toEqual(new Set([0, 2]));
    hoverTime.val = new Timestamp(2100, 0);
    calledOutNum.val = 2;
    expect(highlighted).toEqual(new Set([1]));
    selectedNames.val = new Set(['thing1']);
    expect(highlighted).toEqual(new Set([0, 1]));
    mode.val = 'edit';
    expect(highlighted).toEqual(new Set([]));

    unsubscribe.next();
    unsubscribe.complete();
  });
});

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="a"><string></string></value>
        <value key="tick"><int>0</int></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <interactions>
    <reaction target="item" type="highlight">
      <changed>
        <global-ref key="a"></global-ref>
      </changed>
    </reaction>
  </interactions>`
})
class ChangedTestComponent {
  @ViewChild(InteractionsDirective) ints!: InteractionsDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('changed test', () => {
  let fixture: ComponentFixture<ChangedTestComponent>;
  const appCoreService = new AppCoreService();
  let a: StringValue;
  let tick: IntegerValue;

  beforeAll(() => {
    TestBed.configureTestingModule({
      declarations: [ChangedTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(ChangedTestComponent);
    fixture.detectChanges();
    a = appCoreService.appCore.globalState.get('a') as StringValue;
    tick = appCoreService.appCore.globalState.get('tick') as IntegerValue;
  });

  beforeEach(() => {
    a.val = 'a';
  });

  it('observesChanges', () => {
    const itc = fixture.componentInstance;
    const matchFn = itc.ints.get().match('item', 'highlight');
    const changes: string[] = [];
    expect(matchFn).toBeDefined();
    if (!matchFn) {
      return;
    }
    matchFn(valueMap()).subscribe((changed: boolean) => {
      changes.push(`${changed ? '+' : '-'}@${tick.val}`);
    });
    [() => {
      a.val = 'a';  // same value, so no change.
    },
     () => {
       a.val = 'z';  // new value at index 2.
     },
     () => {}]
        .forEach((action) => {
          tick.val++;
          action();
        });

    expect(changes).toEqual([
      '+@0',
      '-@0',
      '+@2',
      '-@2',
    ]);
  });
});

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="offset_marker"><dur></dur></value>
        <value key="min_extent"><dbl></dbl></value>
        <value key="max_extent"><dbl></dbl></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <interactions>
    <watch type="show_offset_marker">
      <value-map>
        <value key="offset_marker">
          <global-ref key="offset_marker"></global-ref>
        </value>
      </value-map>
    </watch>
    <watch type="show_range">
      <value-map>
        <value key="min_extent">
          <global-ref key="min_extent"></global-ref>
        </value>
        <value key="max_extent">
          <global-ref key="max_extent"></global-ref>
        </value>
      </value-map>
    </watch>
  </interactions>`
})
class WatchTestComponent {
  @ViewChild(InteractionsDirective) ints!: InteractionsDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('watch test', () => {
  let fixture: ComponentFixture<WatchTestComponent>;
  const appCoreService = new AppCoreService();
  let offsetMarker: DurationValue;
  let minExtent: DoubleValue;
  let maxExtent: DoubleValue;

  beforeAll(() => {
    TestBed.configureTestingModule({
      declarations: [WatchTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(WatchTestComponent);
    fixture.detectChanges();
    offsetMarker = appCoreService.appCore.globalState.get('offset_marker') as
        DurationValue;
    minExtent =
        appCoreService.appCore.globalState.get('min_extent') as DoubleValue;
    maxExtent =
        appCoreService.appCore.globalState.get('max_extent') as DoubleValue;
  });

  beforeEach(() => {
    offsetMarker.val = new Duration(0);
    minExtent.val = 0;
    maxExtent.val = 100;
  });

  it('watches', () => {
    const unsubscribe = new Subject<void>();
    const itc = fixture.componentInstance;
    let offsetPoint = new Duration(0);
    let rangeMin = 0;
    let rangeMax = 0;
    itc.ints.get().watch('show_offset_marker', (vm) => {
      offsetPoint = vm.expectDuration('offset_marker');
    }, unsubscribe);
    itc.ints.get().watch('show_range', (vm) => {
      rangeMin = vm.expectNumber('min_extent');
      rangeMax = vm.expectNumber('max_extent');
    }, unsubscribe);
    offsetMarker.val = new Duration(100);
    expect(offsetPoint).toEqual(new Duration(100));

    expect(rangeMin).toEqual(0);
    expect(rangeMax).toEqual(100);
    minExtent.val = 50;
    expect(rangeMin).toEqual(50);
  });
});

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
        <value key="filtered_text"><string></string></value>
        <value key="text_2"><string></string></value>
        <value key="called_out_num"><int></int></value>
        <value key="selected_names"><string-set></string-set></value>
        <value key="hover_time"><timestamp></timestamp></value>
        <value key="offset_marker"><dur></dur></value>
        <value key="min_extent"><dbl></dbl></value>
        <value key="max_extent"><dbl></dbl></value>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>
  <interactions>
    <action target="item" type="click">
      <toggle>
        <global-ref key="filtered_text"></global-ref>
        <local-ref key="text"></local-ref>
      </toggle>
      <set>
        <global-ref key="called_out_num"></global-ref>
        <local-ref key="num"></local-ref>
      </set>
    </action>
    <action target="item" type="clear">
      <clear>
        <global-ref key="filtered_text"></global-ref>
      </clear>
    </action>
    <action target="item" type="set">
      <set>
        <global-ref key="text_2"></global-ref>
        <string>set value</string>
      </set>
    </action>
    <reaction target="item" type="highlight">
      <or>
        <includes>
          <global-ref key="selected_names"></global-ref>
          <local-ref key="name"></local-ref>
        </includes>
        <includes>
          <global-ref key="called_out_num"></global-ref>
          <local-ref key="num"></local-ref>
        </includes>
        <and>
          <not>
            <less-than>
              <global-ref key="hover_time"></global-ref>
              <local-ref key="start"></local-ref>
            </less-than>
          </not>
          <not>
            <greater-than>
              <global-ref key="hover_time"></global-ref>
              <local-ref key="end"></local-ref>
            </greater-than>
          </not>
        </and>
      </or>
    </reaction>
    <watch type="show_offset_marker">
      <value-map>
        <value key="offset_marker">
          <global-ref key="offset_marker"></global-ref>
        </value>
      </value-map>
    </watch>
    <watch type="show_range">
      <value-map>
        <value key="min_extent">
          <global-ref key="min_extent"></global-ref>
        </value>
        <value key="max_extent">
          <global-ref key="max_extent"></global-ref>
        </value>
      </value-map>
    </watch>
  </interactions>`
})
class DocTestComponent {
  @ViewChild(InteractionsDirective) ints!: InteractionsDirective;
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
}

describe('self-documentation test', () => {
  let fixture: ComponentFixture<DocTestComponent>;
  const appCoreService = new AppCoreService();

  beforeAll(() => {
    TestBed.configureTestingModule({
      declarations: [DocTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(DocTestComponent);
    fixture.detectChanges();
  });

  it('documents itself', () => {
    const itc = fixture.componentInstance;
    expect(prettyPrintDocumenter(itc.ints.get()).join('\n'))
        .toEqual(`Interactions (Interactions)
  Upon 'click' on 'item' (Action)
    toggles global string 'filtered_text' from local value 'text'. (Update)
    sets global integer 'called_out_num' from local value 'num'. (Update)
  Upon 'clear' on 'item' (Action)
    clears [global string 'filtered_text'] (Update)
  Upon 'set' on 'item' (Action)
    sets global string 'text_2' from literal 'set value'. (Update)
  Performs 'highlight' on 'item' (Reaction)
    OR (Predicate)
      when global string set 'selected_names' includes local value 'name' (Predicate)
      when global integer 'called_out_num' includes local value 'num' (Predicate)
      AND (Predicate)
        NOT (Predicate)
          when global timestamp 'hover_time' < local value 'start' (Predicate)
        NOT (Predicate)
          when global timestamp 'hover_time' > local value 'end' (Predicate)
  Trigger 'show_offset_marker' on changes to arguments (Watch)
  Trigger 'show_range' on changes to arguments (Watch)`);
  });
});
