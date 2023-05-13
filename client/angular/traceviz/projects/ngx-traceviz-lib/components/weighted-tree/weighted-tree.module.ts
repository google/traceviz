import { NgModule } from "@angular/core";
import { WeightedTreeComponent } from "./weighted-tree.component";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { CommonModule } from "@angular/common";
import { HovercardModule } from "../hovercard/hovercard.module";

@NgModule({
  declarations: [
    WeightedTreeComponent,
  ],
  imports: [
    CommonModule,
    HovercardModule,
    MatProgressBarModule,
  ],
  exports: [
    WeightedTreeComponent,
  ],
})
export class WeightedTreeModule {
}
