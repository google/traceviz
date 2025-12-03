import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AppCoreService, CoreModule, TestCoreModule} from '@traceviz/angular-core';
import {GLOBAL_TEST_DATA_FETCHER, node, Timestamp, dbl, int, str, strs, ts, valueMap, ResponseNode, StringValue, TimestampValue} from '@traceviz/client-core';
import {LineChart} from './line_chart.component';
import {LineChartModule} from './line_chart.module';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

function sec(sec: number): Timestamp {
  return new Timestamp(sec, 0);
}

const xyChartData = node(
    valueMap(
        {key: 'color_space_things', val: strs('blue')},
        {key: 'color_space_stuff', val: strs('red')},
        {key: 'x_axis_render_label_height_px', val: int(10)},
        {key: 'x_axis_render_markers_height_px', val: int(20)},
        {key: 'y_axis_render_label_width_px', val: int(10)},
        {key: 'y_axis_render_markers_width_px', val: int(30)},
        ),
    node(
        // axis definitions
        valueMap(),
        node(
            // x axis
            valueMap(
                {key: 'category_defined_id', val: str('x_axis')},
                {key: 'category_display_name', val: str('time from start')},
                {key: 'category_description', val: str('Time from start')},
                {key: 'axis_type', val: str('timestamp')},
                {key: 'axis_min', val: ts(sec(0))},
                {key: 'axis_max', val: ts(sec(100))},
                ),
            ),
        node(
            // y axis
            valueMap(
                {key: 'category_defined_id', val: str('y_axis')},
                {key: 'category_display_name', val: str('events per second')},
                {key: 'category_description', val: str('Events per second')},
                {key: 'axis_type', val: str('double')},
                {key: 'axis_min', val: dbl(0)},
                {key: 'axis_max', val: dbl(3)},
                ),
            ),
        ),
    node(
        // series definition
        valueMap(
            {key: 'category_defined_id', val: str('things')},
            {key: 'category_display_name', val: str('Remembered Things')},
            {key: 'category_description', val: str('Things we remembered')},
            {key: 'primary_color_space', val: str('color_space_things')},
            {key: 'primary_color_space_value', val: dbl(1)},
            ),
        node(valueMap(
            {key: 'x_axis', val: ts(sec(0))},
            {key: 'y_axis', val: dbl(3)},
            {key: 'story', val: str('We started out so well...')},
            )),
        node(valueMap(
            {key: 'x_axis', val: ts(sec(10))},
            {key: 'y_axis', val: dbl(2)},
            )),
        node(valueMap(
            {key: 'x_axis', val: ts(sec(20))},
            {key: 'y_axis', val: dbl(1)},
            )),
        ),
    node(
        valueMap(
            {key: 'category_defined_id', val: str('stuff')},
            {key: 'category_display_name', val: str('Forgotten Stuff')},
            {key: 'category_description', val: str('Stuff we forgot')},
            {key: 'primary_color_space', val: str('color_space_stuff')},
            {key: 'primary_color_space_value', val: dbl(1)},
            ),
        node(valueMap(
            {key: 'x_axis', val: ts(sec(80))},
            {key: 'y_axis', val: dbl(1)},
            )),
        node(valueMap(
            {key: 'x_axis', val: ts(sec(90))},
            {key: 'y_axis', val: dbl(2)},
            )),
        node(valueMap(
            {key: 'x_axis', val: ts(sec(100))},
            {key: 'y_axis', val: dbl(3)},
            {key: 'story', val: str('But it all ended so badly...')},
            )),
        ),
);

@Component({
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="collection_name"><string></string></value>
          <value key="x_axis_marker"><timestamp></timestamp></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <line-chart>
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
        <watch type="update_x_axis_marker">
          <value-map>
            <value key="x_axis_marker_position">
              <global-ref key="x_axis_marker"></global-ref>
            </value>
          </value-map>
        </watch>
      </interactions>
    </line-chart>
  `
})
class LineChartTestComponent {
  @ViewChild(LineChart) lineChart!: LineChart;
}

describe('line chart test', () => {
  let fixture: ComponentFixture<LineChartTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [LineChartTestComponent],
          imports: [
            CoreModule, TestCoreModule, LineChartModule, NoopAnimationsModule
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(LineChartTestComponent);
    await fixture.whenStable();
  });

  it('shows line chart data, axes, and x-axis marker', () => {
    fixture.detectChanges();
    const lc = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    const xAxisMarker = appCoreService.appCore.globalState.get(
                            'x_axis_marker') as TimestampValue;
    xAxisMarker.val = sec(500);
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [
          lc.lineChart.dataSeries!.dataSeriesQuery!.uniqueSeriesName,
          xyChartData
        ],
      ]),
    });
    collectionName.val = 'coll';
    lc.lineChart.redraw();  // we can't wait for the debouncer.
    // Expect two series
    const chartArea =
        lc.lineChart.svg.nativeElement.querySelector('.chart-area');
    const paths = chartArea.querySelectorAll('path');
    expect(paths.length).toBe(2);
    // Expect 'things' to have 3 line segments (e.g., M0,0L1,1L2,2.)
    expect(paths[0].getAttribute('d').split('L').length).toBe(3);
    // Expect 'stuff' to have 3 line segments.
    expect(paths[1].getAttribute('d').split('L').length).toBe(3);
    // TODO(hamster) test zooming.
  });
});
