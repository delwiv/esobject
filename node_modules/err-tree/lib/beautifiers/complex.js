'use strict';

var _ = require('lodash');
var colorPath = require('color-path');
var chalk = require('chalk');

function ComplexBeautifier(options) {
  this.options = _.defaults(options || {}, {
    colors: true,
    exerpt: true
  });
  this.chalk = new chalk.constructor({enabled: this.options.colors});
}
ComplexBeautifier.prototype.beautify = function(err) {
  var chalk = this.chalk;
  var exerpt = this.options.exerpt ? err.getExerpt(this.options) : '';

  return (!err.ns ? '' : chalk.grey('[') + chalk.magenta(err.ns.split(':').join(chalk.grey(':'))) + chalk.grey('] ')) +
    err.name + chalk.grey(': ') + chalk.red.bold(err.message || '<missing error message>') +

    (!err.code ? '' : chalk.grey(' − code ' + chalk.yellow(err.code))) + '\n' +

    (exerpt && '|\n' + exerpt + '|\n') +

    '|  ' + chalk.grey('Trace:') + '\n' +

    _.reduce(err.parsedStack, function(acc, ctx, pos) {
      var startFn = ctx.fn ? ctx.fn.split('.') : [];
      var endFn = startFn.pop() || '';
      startFn = startFn.join('.') + ((startFn.length || '') && '.');
      var fileColor = chalk.reset;

      if (ctx.dirname && !ctx.dirname.match('node_modules/'))
        fileColor = chalk.cyan;

      return acc +
        // start stack line
        '|    ' +
        // add at + prefix fnname + fnname
        chalk.grey('at ' + startFn) + (endFn || '') +
        // add [as alias] if needed
        (!ctx.as ? '' : chalk.grey(' [as ') + ctx.as + chalk.grey(']')) +
        // add '(' if there is a fn name
        (endFn && chalk.grey(' (')) +
        // add file path with correc colors
        colorPath.colorize(ctx, this.options) +
        // add line & column
        chalk.grey(':') + chalk.yellow(ctx.line) + chalk.grey(':' + ctx.column) +
        // add ')' if there is a fn name
        (endFn && chalk.grey(')')) +
        // add a \n if this is not the last line
        (pos !== err.parsedStack.length - 1 ? '\n' : '')
      ;
    }.bind(this), '')
  ;
};

module.exports = function(options) {
  var beautifier = new ComplexBeautifier(options);
  return beautifier.beautify.bind(beautifier);
};
