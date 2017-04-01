var path = require('path');
module.exports = {
  entry: './init.js',
  output:
    {filename: 'bundle.js', path: path.resolve(__dirname + "/..", 'dist')},
  resolve: {extensions: ['.js', '.jsx']},
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      exclude: /(node_modules|bower_components|webpack\.config\.js)/,
      use: {loader: 'babel-loader', options: ""}
    }]
  }
};
