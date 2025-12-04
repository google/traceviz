import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppCoreService, CoreModule, TestCoreModule} from '@traceviz/angular/core';
import {GLOBAL_TEST_DATA_FETCHER, node, ResponseNode, str, StringValue, strs, valueMap} from '@traceviz/client-core';

import {DataTable} from './data_table.component';
import {DataTableModule} from './data_table.module';

const tableData = node(
    valueMap(),
    node(
        valueMap(),  // Column definitions
        node(valueMap(
            {key: 'category_defined_id', val: str('name')},
            {key: 'category_display_name', val: str('Name')}, {
              key: 'category_description',
              val: str('Give this name to order this scoop!')
            })),
        node(valueMap(
            {key: 'category_defined_id', val: str('color')},
            {key: 'category_display_name', val: str('Color')}, {
              key: 'category_description',
              val: str('How will you recognize it?')
            })),
        node(valueMap(
            {key: 'category_defined_id', val: str('flavor')},
            {key: 'category_display_name', val: str('Flavor')}, {
              key: 'category_description',
              val: str('What will it taste like?')
            })),
        node(valueMap(
            {key: 'category_defined_id', val: str('label')},
            {key: 'category_display_name', val: str('Label')}, {
              key: 'category_description',
              val: str('This ice cream\'s label')
            }))),
    node(
        // row 1
        valueMap(
            {key: 'flavor', val: str('vanilla')},
            ),
        node(valueMap(
            {key: 'category_ids', val: strs('name')},
            {key: 'table_cell', val: str('vanilla')})),
        node(valueMap(
            {key: 'category_ids', val: strs('color')},
            {key: 'table_cell', val: str('white')})),
        node(valueMap(
            {key: 'category_ids', val: strs('flavor')},
            {key: 'table_cell', val: str('vanilla-y')})),
        node(valueMap(
            {key: 'category_ids', val: strs('label')},
            {key: 'name', val: str('vanilla')},
            {key: 'color', val: str('white')},
            {key: 'table_formatted_cell', val: str('$(name) ($(color))')})),
        node(valueMap(
            {key: 'table_payload', val: str('info box')},
            {
              key: 'label',
              val: str('Vanilla is derived from the seed pod of an orchid!')
            },
            )),
        ),
    node(
        // row 2
        valueMap(
            {key: 'flavor', val: str('chocolate')},
            ),
        node(valueMap(
            {key: 'category_ids', val: strs('name')},
            {key: 'table_cell', val: str('chocolate')})),
        node(valueMap(
            {key: 'category_ids', val: strs('color')},
            {key: 'table_cell', val: str('brown')})),
        node(valueMap(
            {key: 'category_ids', val: strs('flavor')},
            {key: 'table_cell', val: str('chocolatey')})),
        node(valueMap(
            {key: 'category_ids', val: strs('label')},
            {key: 'name', val: str('chocolate')},
            {key: 'color', val: str('brown')},
            {key: 'table_formatted_cell', val: str('$(name) ($(color))')})),
        ),
    node(
        // row 3
        valueMap(
            {key: 'flavor', val: str('strawberry')},
            ),
        node(valueMap(
            {key: 'category_ids', val: strs('name')},
            {key: 'table_cell', val: str('strawberry')})),
        node(valueMap(
            {key: 'category_ids', val: strs('color')},
            {key: 'table_cell', val: str('pink')})),
        node(valueMap(
            {key: 'category_ids', val: strs('flavor')},
            {key: 'table_cell', val: str('berrylicious')})),
        node(valueMap(
            {key: 'category_ids', val: strs('label')},
            {key: 'name', val: str('strawberry')},
            {key: 'color', val: str('pink')},
            {key: 'table_formatted_cell', val: str('$(name) ($(color))')})),
        ),
);

@Component({
  standalone: false,
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="collection_name"><string></string></value>
          <value key="table_sort_direction"><string></string></value>
          <value key="table_sort_column"><string></string></value>
          <value key="selected_flavor"><string></string></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <data-table>
      <interactions>
        <watch type="update_sort_direction">
          <value-map>
            <value key="sort_direction">
              <global-ref key="table_sort_direction"></global-ref>
            </value>
          </value-map>
        </watch>
        <watch type="update_sort_column">
          <value-map>
            <value key="sort_column">
              <global-ref key="table_sort_column"></global-ref>
            </value>
          </value-map>
        </watch>
        <action type="click" target="rows">
          <set>
            <global-ref key="selected_flavor"></global-ref>
            <local-ref key="flavor"></local-ref>
          </set>
        </action>
      </interactions>
      <data-series name="ugh">
        <query><string>flavs</string></query>
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
      </data-series>
    </data-table>
`,
  jit: true,
})
class DataTableTestComponent {
  @ViewChild(DataTable) dataTable!: DataTable;
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [DataTableTestComponent],
          imports: [
            CoreModule,
            TestCoreModule,
            DataTableModule,
            NoopAnimationsModule,
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(DataTableTestComponent);
    await fixture.whenStable();
  });

  it('should populate from backend', () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [
          tc.dataTable.dataSeriesQueryDir!.dataSeriesQuery!.uniqueSeriesName,
          tableData
        ],
      ]),
    });
    collectionName.val = 'coll';
    const element: HTMLElement = fixture.nativeElement;
    expect(tc.dataTable.rows.length).toEqual(3);
    const rows = element.querySelectorAll('tr');
    expect(rows.length).toEqual(4);  // one header and three rows.
    // Expect a header row.
    expect(Array.from(rows[0].querySelectorAll('th')).map((el) => el.innerText))
        .toEqual(['Name', 'Color', 'Flavor', 'Label']);
    // Expect three content rows.
    expect(Array.from(rows).slice(1).map(
               (rowEl) => Array.from(rowEl.querySelectorAll('.table-datum'))
                              .map((el) => el.innerHTML.trim())))
        .toEqual([
          ['vanilla', 'white', 'vanilla-y', 'vanilla (white)'],
          ['chocolate', 'brown', 'chocolatey', 'chocolate (brown)'],
          ['strawberry', 'pink', 'berrylicious', 'strawberry (pink)'],
        ]);
    // Click some rows.
    const selectedFlavor = appCoreService.appCore.globalState.get(
                               'selected_flavor') as StringValue;
    expect(selectedFlavor.val).toEqual('');
    rows[1].click();
    expect(selectedFlavor.val).toEqual('vanilla');
    rows[3].click();
    expect(selectedFlavor.val).toEqual('strawberry');
  });
});
