import {AfterContentInit, Component, OnDestroy} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {AppCoreService} from 'traceviz-angular-core';
import {ConfigurationError} from 'traceviz-client-core';

@Component({
  selector: 'error-message',
  template: '',
  styles: [`
    ::ng-deep .mat-mdc.snack-bar-label {
      word-break: break-all;
    }
  `],
})
export class ErrorMessage implements AfterContentInit, OnDestroy {
  unsubscribe = new Subject<void>();

  constructor(
      private readonly appCoreService: AppCoreService,
      private readonly snackBar: MatSnackBar) {}

  ngAfterContentInit() {
    this.appCoreService.appCore.configurationErrors
        .pipe(takeUntil(this.unsubscribe))
        .subscribe((err: ConfigurationError) => {
          this.snackBar.open(err.message, 'Close');
          console.error(err);
        })
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
    this.snackBar.dismiss();
  }
}
