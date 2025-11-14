import {NgModule} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {Dropdown} from './components/dropdown.component';

@NgModule({
  declarations: [
    Dropdown,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  exports: [
    Dropdown,
  ],
})
export class DropdownModule {
}