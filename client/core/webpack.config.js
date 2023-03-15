const path = require('path')

module.exports = {
    entry: './src/core.ts',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        filename: 'core.js',
        path: path.resolve(__dirname, 'dist')
    }
}