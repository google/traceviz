import {bootstrapApplication} from '@angular/platform-browser';

import {appConfig} from './app/app.config';

bootstrapApplication(null, appConfig).catch(err => console.error(err));
