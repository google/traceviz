import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {
  AxesModule,
  CoreModule,
  DataTableModule,
  ErrorMessageModule,
  KeypressModule,
  HovercardModule,
  LineChartModule,
  TextFieldModule,
  UpdateValuesModule,
  UrlHashModule,
} from 'traceviz';

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
