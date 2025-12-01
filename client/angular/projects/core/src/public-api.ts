/*
 * Public API Surface of core
 */

export * from './lib/core.module';

// Services
export * from './lib/services/app_core.service';

// Directives
export * from './lib/directives/app_core.directive';
export * from './lib/directives/data_query.directive';
export * from './lib/directives/data_series_query.directive';
export * from './lib/directives/debug.directive';
export * from './lib/directives/global_ref.directive';
export * from './lib/directives/global_state.directive';
export * from './lib/directives/http_data_fetcher';
export * from './lib/directives/interactions.directive';
export * from './lib/directives/literal_value.directive';
export * from './lib/directives/local_ref.directive';
export * from './lib/directives/value.directive';
export * from './lib/directives/value_map.directive';

// Test-only utilities (optional)
export * from './lib/test_core.module';
export * from './lib/test_directives/test_data_query.directive';
