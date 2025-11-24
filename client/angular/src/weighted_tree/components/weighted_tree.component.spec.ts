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

import {GLOBAL_TEST_DATA_FETCHER, RenderedTreeNode, ResponseNode, StringValue, Value, ValueMap, dbl, int, node, str, strs, valueMap} from 'traceviz-client-core';
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
      {key: 'self_magnitude', val: int(selfMagnitude)},
      {key: 'label_format', val: str(label)},
  );
  if (primaryColorSpace) {
    props.push(
        {
          key: 'primary_color_space',
          val: str('color_space_' + primaryColorSpace)
        },
        {key: 'primary_color_space_value', val: dbl(0)},
    );
  }
  return valueMap(...props);
}

// Tree structure:
// |-node 0-----------------------------------------------|
// |-node 1---||-node 4-----------------------------------|
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
  standalone: false,
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
    <weighted-tree transitionDurationMs="0">
      <data-series>
        <query><value><string>q</string></value></query>
        <interactions>
          <reaction type="fetch" target="data-series">
            <and>
              <not><equals>
                <global-ref key="collection_name"></global-ref>
                <string></string>
              </equals></not>
              <changed><global-ref key="collection_name"></global-ref></changed>
            </and>
          </reaction>
        </interactions>
        <parameters></parameters>
      </data-series>

      <interactions>
        <action target="nodes" type="click">
          <set>
            <global-ref key="selected_ids"></global-ref>
            <local-ref key="id"></local-ref>
          </set>
        </action>

        <reaction target="nodes" type="highlight">
          <includes>
            <global-ref key="selected_ids"></global-ref>
            <local-ref key="id"></local-ref>
          </includes>
        </reaction>
      </interactions>
    </weighted-tree>`,
// TODO: Make this AOT compatible. See b/352713444
jit: true,

})
class WeightedTreeTestComponent {
  @ViewChild(WeightedTreeComponent) weightedTree!: WeightedTreeComponent;
}

describe('weighted tree test', () => {
  let fixture: ComponentFixture<WeightedTreeTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [WeightedTreeTestComponent],
          imports: [
            CoreModule, TestCoreModule, WeightedTreeModule, NoopAnimationsModule
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(WeightedTreeTestComponent);
    await fixture.whenStable();
  });

  it('renders tree nodes', () => {
    fixture.detectChanges();
    const wt = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [
          wt.weightedTree.dataSeries!.dataSeriesQuery!.uniqueSeriesName,
          treeData
        ],
      ]),
    });
    collectionName.val = 'coll';
    wt.weightedTree.redraw();  // we can't wait for the debouncer.

    const frames = wt.weightedTree.svg.nativeElement.querySelectorAll(
        'g.chart-area > svg');
    // Expect eight frames: the root and nodes 1-7.
    expect(frames.length).toBe(8);
    const colors: string[] = [];
    const labels: string[] = [];
    for (const frame of frames.values()) {
      const rect = frame.querySelector('rect');
      colors.push(rect.attributes.getNamedItem('fill').value);
      const text = frame.querySelector('text');
      labels.push(text.textContent);
    }
    expect(colors).toEqual([
      'rgb(127, 127, 127)',  // root (grey)
      'rgb(255, 0, 0)',      // node 1 (red)
      'rgb(0, 255, 0)',      // node 2 (green)
      'rgb(0, 255, 0)',      // node 3 (green)
      'rgb(255, 0, 0)',      // node 4 (red)
      'rgb(0, 255, 0)',      // node 5 (green)
      'rgb(0, 0, 255)',      // node 6 (blue)
      'rgb(0, 255, 0)'       // node 7 (green)
    ]);
    expect(labels).toEqual([
      'root',
      'Node 1',
      'Node 2',
      'Node 3',
      'Node 4',
      'Node 5',
      'Node 6',
      'Node 7',
    ]);
  });

  it('supports click and highlight interactions', () => {
    fixture.detectChanges();
    const wt = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [
          wt.weightedTree.dataSeries!.dataSeriesQuery!.uniqueSeriesName,
          treeData
        ],
      ]),
    });
    collectionName.val = 'coll';
    wt.weightedTree.redraw();  // we can't wait for the debouncer.

    expect(wt.weightedTree.highlightedNodes.size).toBe(0);

    wt.weightedTree.interactions?.update(
        'nodes', 'click', wt.weightedTree.treeNodes[0].properties);

    expect(wt.weightedTree.highlightedNodes)
        .toEqual(new Set<RenderedTreeNode>([wt.weightedTree.treeNodes[0]]));
  });
});
