# webpack-rollup-babel-loader

Forked from [erikdesjardins/webpack-rollup-loader](https://github.com/erikdesjardins/webpack-rollup-loader), this loader applies Babel transformations after Rollup compiles a bundle to prevent Babel from affecting Rollup's tree shaking.

## Installation
  
`npm install --save-dev git://github.com/derekmiranda/webpack-rollup-babel-loader.git` 

Rollup is a peer dependency, and must also be installed:

`npm install --save-dev rollup`

## Usage

**Note:** This loader must only be applied once to the entry module. If it is applied to all `.js` files, basically anything can happen. Modules may be duplicated, Webpack may fail to terminate, cryptic errors may be generated.

Rollup can receive settings outlined [here](https://rollupjs.org/#javascript-api) from an `options` object passed alongside the loader.

Babel can receive settings from the `babelOptions` key on that `options` object, as well.

Also, make sure that Babel is not transpiling ES6 imports to CommonJS with the `transform-es2015-modules-commonjs` plugin.

**webpack.config.js:**

```js
module.exports = {
  entry: 'entry.js',
  module: {
    rules: [
      {
        test: /entry.js$/,
        use: [{
          loader: 'webpack-rollup-loader',
          options: {
            // OPTIONAL: any rollup options (except `entry`)
            // e.g.
            plugins: [rollupCommonjsPlugin()],
            external: ['moment'],
            // pass Babel options from here
            babelOptions: {
              presets: ['env']
            }
          },
        }]
      },

      // ...other rules as usual
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ]
      }
    ]
  }
};
```
