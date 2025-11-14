import {NgModule} from '@angular/core';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SlideToggleComponent} from './components/slide_toggle.component';


@NgModule({
  declarations: [
    SlideToggleComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  exports: [
    SlideToggleComponent,
  ],
})
export class SlideToggleModule {
}
