var chalk = require('chalk');
var util = require('util');
var diff = require('diff');
var stacktrace = require('stack-trace');
var fs = require('graceful-fs');

var minimatch = require('minimatch');

var getType = require('should-type');
var format = require('should-format');

var config = require('./config');
var symbols = config.symbols;

var color = require('./color');
var formatTime = require('./time').formatTime;

var pad = require('./pad');

function parseEnvOptions(opts) {
  var v = process.env.MOCHA_REPORTER_OPTS || '',
    s = process.env.MOCHA_REPORTER_STACK_EXCLUDE;

  if(s) {
    opts.stackExclude = s;
  }

  opts.hideTitles = ~v.indexOf('hide-titles');
  opts.hideStats = ~v.indexOf('hide-stats');

  return opts;
}

function parseMochaReporterOptions(opts, reporterOptions) {
  if('hide-titles' in reporterOptions)
    opts.hideTitles = reporterOptions['hide-titles'] === 'true';

  if('hide-stats' in reporterOptions)
    opts.hideStats = reporterOptions['hide-stats'] === 'true';

  if('stack-exclude' in reporterOptions)
    opts.stackExclude = reporterOptions['stack-exclude'];

  if('show-back-order' in reporterOptions)
    opts.showFailsInBackOrder = reporterOptions['show-back-order'] === 'true';

  return opts;
}

function Reporter(runner, mochaOptions) {
  if(!runner) return;
  this.runner = runner;

  var that = this;

  this.options = {};

  this.options = parseEnvOptions(this.options);
  this.options = parseMochaReporterOptions(this.options, mochaOptions.reporterOptions);

  var stats = this.stats = {suites: 0, tests: 0, passes: 0, pending: 0, failures: 0, timeouts: 0};
  var failures = this.failures = [];

  this.indentation = 0;

  this.files = mochaOptions.files;
  this.filesCache = {};

  runner.on('start', function() {
    stats.start = new Date;
  });

  runner.on('suite', function(suite) {
    if(!suite.root) {
      stats.suites++;
      that.indentation++;

      if(!that.options.hideTitles) {
        that.writeLine();
        that.writeLine('%s', color('suite title', suite.title));
      }
    }
  });

  runner.on('suite end', function(suite) {
    if(!suite.root) {
      that.indentation--;
    }
  });

  runner.on('test end', function(test) {
    stats.tests++;
  });

  runner.on('pass', function(test) {
    stats.passes++;

    that.writeTest(test);
  });

  runner.on('fail', function(test, err) {
    test.err = err;
    test.timedOut = test.duration >= test.timeout();
    if(test.timedOut) stats.timeouts++;
    failures.push(test);

    that.writeTest(test);
  });

  runner.on('pending', function(test) {
    stats.pending++;

    that.writeTest(test);
  });

  runner.on('end', function() {
    //console.log(runner);

    stats.end = new Date;
    stats.duration = stats.end - stats.start;

    that.indentation = 0;

    if(!that.options.hideTitles) {
      that.writeLine();
    }

    if(!that.options.hideStats) {
      that.writeStat(stats);
    }

    if(failures.length) that.writeFailures(failures);
  });
}


Reporter.prototype.writeTest = function writeTest(test) {
  var state = test.pending ? 'pending' : test.state;
  var prefix = symbols[state];
  if(state == 'failed') {
    prefix = '' + (this.stats.failures + 1) + ')';
    this.stats.failures++;
  }
  this.indentation += 0.5;

  if(!this.options.hideTitles) {
    this.writeLine(
      '%s %s',
      color('option ' + state, prefix),
      color('test title ' + state, test.title + (test.timedOut ? ' (timeout)' : '')));
  }

  this.indentation -= 0.5;
};

function indent(indentation) {
  return new Array(Math.round(indentation * config.indentation)).join(' ');
}

Reporter.prototype.writeLine = function() {
  config.stream.write(indent(this.indentation) + util.format.apply(util, arguments) + '\n');
};

Reporter.prototype.writeStat = function(stats) {
  this.indentation++;
  if(stats.suites) {
    this.writeLine(color('stat', 'Executed %d tests in %d suites in %s'), stats.tests, stats.suites, formatTime(stats.duration));
  } else {
    this.writeLine(color('stat', 'Executed %d tests in %s'), stats.tests, formatTime(stats.duration));
  }
  this.indentation++;
  if(stats.tests == stats.passes)
    this.writeLine(color('pass', 'All passes'));
  else {
    this.writeLine(color('pass', '%d passes'), stats.passes);
    if(stats.pending)
      this.writeLine(color('pending', '%d pending'), stats.pending);
    if(stats.failures) {
      if(stats.timeouts)
        this.writeLine(color('fail', '%d failed (%d timed out)'), stats.failures, stats.timeouts);
      else
        this.writeLine(color('fail', '%d failed'), stats.failures);
    }
  }
  this.indentation -= 2;
};


Reporter.prototype.writeFailures = function(failures) {
  this.indentation++;

  if(this.options.showFailsInBackOrder)
    failures = failures.reverse();

  failures.forEach(function(test, i) {
    var err = test.err,
      message = err.message,
      stack = err.stack,
      actual = err.actual,
      expected = err.expected,
      escape = true;

    if(this.options.showFailsInBackOrder)
      i = failures.length - 1 - i;

    var parsedStack = stacktrace.parse(err);

    var index = stack.indexOf(message);
    stack = stack.substr(index + message.length).split('\n').map(function(line) {
      return line.trim();
    });

    if(sameType(actual, expected)) {
      escape = false;
      err.actual = actual = stringify(actual);
      err.expected = expected = stringify(expected);
    }

    this.writeLine();
    this.writeLine('%d) ' + color('error title', '%s'), i + 1, test.fullTitle());
    this.writeLine();

    this.indentation++;
    message.split('\n').forEach(function(messageLine) {
      this.writeLine(color('error message', '%s'), messageLine);
    }, this);

    if(!test.timedOut) {

      // actual / expected diff
      if('string' == typeof actual && 'string' == typeof expected) {
        this.writeDiff(actual, expected, escape);
      }

      this.writeLine();

      var isFilesBeforeTests = true, isTestFiles = true;

      stack
        .filter(function(l) {
          return l.length > 0;
        })
        .forEach(function(line, i) {
          var fileName = parsedStack[i].getFileName(),
            lineNumber = parsedStack[i].getLineNumber(),
            columnNumber = parsedStack[i].getColumnNumber();

          if(~this.files.indexOf(fileName)) {
            isTestFiles = true;
            isFilesBeforeTests = false;
          } else {
            isTestFiles = false;
          }

          if((isTestFiles || isFilesBeforeTests) && (!this.options.stackExclude || !minimatch(fileName, this.options.stackExclude))) {
            this.writeLine(color('error stack', line));
            this.writeStackLine(line, fileName, lineNumber, columnNumber);
          }
        }, this);
    }

    this.indentation--;

  }, this);
  this.indentation--;
};

Reporter.prototype.writeStackLine = function(line, fileName, lineNumber, columnNumber) {
  if(lineNumber != null) {
    if(!this.filesCache[fileName]) {
      try {
        this.filesCache[fileName] = fs.readFileSync(fileName, {encoding: 'utf8'}).split('\n');
      } catch(e) {
      }
    }
    if(this.filesCache[fileName]) {
      var lines = this.filesCache[fileName];

      this.writeLine();

      var linenums = [lineNumber - 2, lineNumber - 1, lineNumber];

      var longestLength = linenums
        .filter(function(n) {
          return !!lines[n]
        })
        .map(function(n) {
          return ('' + (n + 1)).length;
        })
        .reduce(function(acc, n) {
          return Math.max(acc, n)
        });// O_O Omg

      linenums.forEach(function(ln) {
        var line = lines[ln];

        if(line) {
          if(ln + 1 == lineNumber) {
            if(columnNumber) {
              var lineBefore = line.substr(0, columnNumber - 1);
              var lineAfter = line.substr(columnNumber);
              line = lineBefore + color('error line pos', line[columnNumber - 1]) + lineAfter;
            }
            this.writeLine('%s | %s', color('error line pos', pad('' + (ln + 1), longestLength)), line);
          } else {
            this.writeLine('%s | %s', pad('' + (ln + 1), longestLength), line);
          }
        }
      }, this);

      this.writeLine();
    }
  }
}

Reporter.prototype.writeDiff = function(actual, expected, escape) {
  var lines = diff.createPatch('str', actual, expected).split('\n').slice(4);

  this.writeLine();
  this.writeLine(color('diff added', '+ expected') + ' ' + color('diff removed', '- actual'));
  this.writeLine();

  lines.forEach(function(line) {
    if(!line.length) return;
    var begining = line.substr(0, 1);
    if(escape) line = escapeInvisibles(line);
    var added = begining == '+';
    var removed = begining == '-';
    var usual = begining == ' ';
    if(!added && !removed && !usual) return;

    line = added ? color('diff added', line) : removed ? color('diff removed', line) : line;
    this.writeLine(line);
  }, this)
};

function stringify(obj) {
  return format(obj, {maxLineLength: 0, propSep: ''});
}

function sameType(a, b) {
  return getType(a) == getType(b);
}

function escapeInvisibles(line) {
  return line.replace(/\t/g, '<tab>')
    .replace(/\r/g, '<CR>')
    .replace(/\n/g, '<LF>\n');
}

function colorLines(name, str) {
  return str.split('\n').map(function(str) {
    return color(name, str);
  }).join('\n');
}

module.exports = Reporter;
