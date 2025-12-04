const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@traceviz/angular/core': path.resolve(__dirname, '../traceviz-angular/core/src/public-api.ts'),
      '@traceviz/angular/axes': path.resolve(__dirname, '../traceviz-angular/axes/src/public-api.ts'),
      '@traceviz/angular/data_table': path.resolve(__dirname, '../traceviz-angular/data_table/src/public-api.ts'),
      '@traceviz/angular/dropdown': path.resolve(__dirname, '../traceviz-angular/dropdown/src/public-api.ts'),
      '@traceviz/angular/error_message': path.resolve(__dirname, '../traceviz-angular/error_message/src/public-api.ts'),
      '@traceviz/angular/hovercard': path.resolve(__dirname, '../traceviz-angular/hovercard/src/public-api.ts'),
      '@traceviz/angular/keypress': path.resolve(__dirname, '../traceviz-angular/keypress/src/public-api.ts'),
      '@traceviz/angular/line_chart': path.resolve(__dirname, '../traceviz-angular/line_chart/src/public-api.ts'),
      '@traceviz/angular/slide_toggle': path.resolve(__dirname, '../traceviz-angular/slide_toggle/src/public-api.ts'),
      '@traceviz/angular/text_area': path.resolve(__dirname, '../traceviz-angular/text_area/src/public-api.ts'),
      '@traceviz/angular/text_field': path.resolve(__dirname, '../traceviz-angular/text_field/src/public-api.ts'),
      '@traceviz/angular/trace': path.resolve(__dirname, '../traceviz-angular/trace/src/public-api.ts'),
      '@traceviz/angular/update_values': path.resolve(__dirname, '../traceviz-angular/update_values/src/public-api.ts'),
      '@traceviz/angular/url_hash': path.resolve(__dirname, '../traceviz-angular/url_hash/src/public-api.ts'),
      '@traceviz/angular/weighted_tree': path.resolve(__dirname, '../traceviz-angular/weighted_tree/src/public-api.ts'),
    }
  }
};
