import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';

import {TextArea} from './text_area.component';

@NgModule({
  declarations: [
    TextArea,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
  ],
  exports: [
    TextArea,
  ],
})
export class TextAreaModule {
}
