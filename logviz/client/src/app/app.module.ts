import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AxesModule} from '@traceviz/angular/axes';
import {CoreModule} from '@traceviz/angular/core';
import {DataTableModule} from '@traceviz/angular/data_table';
import {ErrorMessageModule} from '@traceviz/angular/error_message';
import {HovercardModule} from '@traceviz/angular/hovercard';
import {KeypressModule} from '@traceviz/angular/keypress';
import {LineChartModule} from '@traceviz/angular/line_chart';
import {TextFieldModule} from '@traceviz/angular/text_field';
import {UpdateValuesModule} from '@traceviz/angular/update_values';
import {UrlHashModule} from '@traceviz/angular/url_hash';

import {AppComponent} from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    AxesModule,
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    DataTableModule,
    ErrorMessageModule,
    HttpClientModule,
    HovercardModule,
    KeypressModule,
    LineChartModule,
    MatCardModule,
    MatPaginatorModule,
    TextFieldModule,
    UpdateValuesModule,
    UrlHashModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
