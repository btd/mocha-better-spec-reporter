var chalk = require('chalk');

var config = require('./config');

function prepareColor(color) {
    var splitted = color.split('.');
    var style = chalk;
    while(splitted.length) style = style[splitted.shift()];
    return style;
}

function prepareColors(colors) {
    var prepearedColors = {};
    Object.keys(colors).forEach(function(name) {
        prepearedColors[name] = prepareColor(colors[name]);
    });
    return prepearedColors;
}

var colors = prepareColors(config.colors);

var ARRAY_SLICE = Array.prototype.slice;

module.exports = function color(name) {
    var args = ARRAY_SLICE.call(arguments, 1);
    return colors[name].apply(null, args);
}