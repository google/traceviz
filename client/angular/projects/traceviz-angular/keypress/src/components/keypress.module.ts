import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CoreModule} from '@traceviz/angular/core';

import {KeypressComponent} from './keypress.component';

@NgModule({
  declarations: [
    KeypressComponent,
  ],
  imports: [
    BrowserModule,
    CoreModule,
  ],
  exports: [
    KeypressComponent,
  ],
})
export class KeypressModule {
}
