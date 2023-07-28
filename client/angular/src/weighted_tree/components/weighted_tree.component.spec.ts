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

import {GLOBAL_TEST_DATA_FETCHER, ResponseNode, StringValue, Value, ValueMap, dbl, int, node, str, strs, valueMap} from 'traceviz-client-core';
import {WeightedTreeComponent} from './weighted_tree.component';
import {Component, ViewChild} from '@angular/core';
import {AppCoreService, CoreModule, TestCoreModule} from 'traceviz-angular-core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {WeightedTreeModule} from '../weighted-tree.module';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

function n(
    nodeID: number, selfMagnitude: number, label: string,
    primaryColorSpace: string|undefined): ValueMap {
  const props = new Array<{key: string, val: Value}>(
      {key: 'id', val: int(nodeID)},
      {key: 'tree_datum_type', val: int(0)},
      {key: 'self_magnitude', val: int(selfMagnitude)},
      {key: 'label_format', val: str(label)},
      {key: 'weighted_tree_datum_type', val: int(0)},
  );
  if (primaryColorSpace !== undefined) {
    props.push(
        {
          key: 'primary_color_space',
          val: str(`color_space_${primaryColorSpace}`)
        },
        {key: 'primary_color_space_value', val: dbl(0)},
    );
  }
  return valueMap(...props);
}

// Tree structure:
// |-node 0-----------------------------------------------|
// |-node 1---||-node4------------------------------------|
// |n2||-n3-|  |-node 5-------------||-node 7-----|
//             |-node 6---|
const treeData = node(
    valueMap(
        {key: 'weighted_tree_frame_height_px', val: int(20)},
        {key: 'color_space_grey', val: strs('rgb(127,127,127)')},
        {key: 'color_space_red', val: strs('rgb(255,0,0)')},
        {key: 'color_space_green', val: strs('rgb(0,255,0)')},
        {key: 'color_space_blue', val: strs('rgb(0,0,255)')},
        ),
    node(
        n(0, 0, 'root', 'grey'),
        node(
            n(1, 1, 'Node 1', 'red'),
            node(n(2, 2, 'Node 2', 'green')),
            node(n(3, 3, 'Node 3', 'green')),
            ),
        node(
            n(4, 4, 'Node 4', 'red'),
            node(
                n(5, 5, 'Node 5', 'green'),
                node(n(6, 6, 'Node 6', 'blue')),
                ),
            node(n(7, 7, 'Node 7', 'green')),
            ),
        ),
);

@Component({
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="collection_name"><string></string></value>
          <value key="selected_ids"><int-set></int-set></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <weighted-tree>
        <interactions>
            <action target="node" type="click">
                <set>
                    <global-ref key="selected_ids"></global-ref>
                    <local-ref key="id"></local-ref>
                </set>
            </action>
            <reaction target="node" type="highlight">
                <includes>
                    <global-ref key="selected_ids"></global-ref>
                    <local-ref key="id"></local-ref>
                </includes>
            </reaction>
        </interactions>
        <data-series>
            <query><string>flavs</string></query>
            <interactions>
                <reaction type="fetch" target="data-series">
                    <and>
                        <not><equals>
                            <global-ref key="collection_name"></global-ref>
                            <string></string>
                        </equals></not>
                        <changed>
                            <global-ref key="collection_name"></global-ref>
                        </changed>
                    </and>
                </reaction>
            </interactions>
        </data-series>
    </weighted-tree>
`
})
class WeightedTreeTestComponent {
  @ViewChild(WeightedTreeComponent) weightedTreeComp!: WeightedTreeComponent;
}

describe('weighted tree test', () => {
  let fixture: ComponentFixture<WeightedTreeTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [WeightedTreeTestComponent],
      imports: [
        CoreModule, TestCoreModule, WeightedTreeModule, NoopAnimationsModule
      ],
      providers: [{provide: AppCoreService, useValue: appCoreService}]
    });
    fixture = TestBed.createComponent(WeightedTreeTestComponent);
  });

  it('renders tree nodes', () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [tc.weightedTreeComp.dataSeriesQuery!.uniqueSeriesName, treeData],
      ]),
    });
    collectionName.val = 'coll';
    tc.weightedTreeComp.redraw();
    const element: HTMLElement = fixture.nativeElement;
    const nodes = element.querySelectorAll('rect');
    expect(nodes.length).toBe(8);

    // TODO(ilhamster): finish out the tests
  });
});
