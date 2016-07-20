var WebpackDevServer = require("webpack-dev-server");
var webpack = require('webpack');

var webpackConfig = require('./webpack.dev.config');
if (process.env.AUTO === '1') {
    if (process.env.HTTPS === '1') {
        webpackConfig.entry.app.unshift(
            "webpack-dev-server/client?https://0.0.0.0:3000/",
            "webpack/hot/dev-server"
        );   
    } else {
        webpackConfig.entry.app.unshift(
            "webpack-dev-server/client?http://0.0.0.0:3000/",
            "webpack/hot/dev-server"
        );
    }
}

var compiler = webpack(webpackConfig);
var server = new WebpackDevServer(compiler, {
    hot: true,
    historyApiFallback: true,
    publicPath: "/",
    contentBase: './dist/',
    stats: {colors: true},
    https: process.env.HTTPS === '1' ? true : false
});

server.listen(3000, '0.0.0.0', function () {
    console.log('Listen on: 0.0.0.0:3000');
});
