const webpack = require('webpack')


const ignorePlugin = new webpack.IgnorePlugin({
  resourceRegExp: /broken.js$/,
})

module.exports = {
  entry: "./webpack-main.js",
  mode: "development",
  plugins: [
    ignorePlugin
  ]
}
