const path = require('path');

module.exports = {
  resolve: {
    alias: {
      'traceviz-client-core': path.join(__dirname, 'node_modules/traceviz-client-core/lib/src/core.js')
    }
  }
}
