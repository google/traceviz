import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';

import {TextAreaComponent} from './components/text_area.component';

@NgModule({
  declarations: [
    TextAreaComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
  ],
  exports: [
    TextAreaComponent,
  ],
})
export class TextAreaModule {
}
