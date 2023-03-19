import { NgModule } from "@angular/core";
import { AppCoreDirective, GlobalStateDirective } from "./app_core.directive";

@NgModule({
    declarations: [
        AppCoreDirective,
        GlobalStateDirective,
    ],
    imports: [],
    exports: [
        AppCoreDirective,
        GlobalStateDirective,
    ],
})
export class DirectivesModule {
}