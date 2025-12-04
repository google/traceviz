// test.ts (Angular test environment bootstrap)

import 'zone.js';
import 'zone.js/testing';

import {getTestBed} from '@angular/core/testing';
import {BrowserDynamicTestingModule, platformBrowserDynamicTesting,} from '@angular/platform-browser-dynamic/testing';

// Declare require for Webpack (no @types/node needed)
declare const require: {
  context(path: string, deep?: boolean, filter?: RegExp):
      {keys(): string[];<T>(id: string): T;};
};

getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
);

const context = (import.meta as any).webpackContext('../../', {
  recursive: true,
  regExp: /\.spec\.ts$/,
});

console.log('Loaded test files:', context.keys());

context.keys().forEach(key => context(key));
