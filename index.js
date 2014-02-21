var chalk = require('chalk'),
  util = require('util'),
  diff = require('diff'),
  stacktrace = require('stack-trace'),
  fs = require('fs');

var symbols = {
  ok: '✓',
  err: '✖',
  dot: '․'
};

// With node.js on Windows: use symbols available in terminal default fonts
if('win32' == process.platform) {
  symbols.ok = '\u221A';
  symbols.err = '\u00D7';
  symbols.dot = '.';
}

var options = {
  colors: {
    'suite title': 'bold.underline',
    'pending': 'yellow',
    'pass': 'green',
    'fail': 'red.bold',
    'checkmark': 'magenta',
    'slow': 'red',
    'medium': 'yellow',
    'stat': 'blue',
    'error title': 'underline',
    'error stack': 'reset',
    'error message': 'cyan',
    'diff added': 'green',
    'diff removed': 'red',
    'pos': 'yellow'
  },
  indentation: 4,
  stream: process.stdout
};

function prepareColor(color) {
  var splitted = color.split('.');
  var style = chalk;
  while(splitted.length) style = style[splitted.shift()];
  return style;
}

function prepareColors(colors) {
  for(var name in colors) {
    colors[name] = prepareColor(colors[name]);
  }
}

prepareColors(options.colors);

function color(name) {
  var args = Array.prototype.slice.call(arguments, 1);
  return options.colors[name].apply(null, args);
}

function Reporter(runner, mocha) {
  var that = this,
    stats = this.stats = { suites: 0, tests: 0, passes: 0, pending: 0, failures: 0 },
    failures = this.failures = [];

  this.indentationLevel = 0;

  if(!runner) return;
  this.runner = runner;

  runner.stats = stats;

  //this.files = mocha.files;
  this.filesCache = {};

  runner.on('start', function() {
    stats.start = new Date;
  });

  runner.on('suite', function(suite) {
    stats.suites = stats.suites || 0;
    suite.root || stats.suites++;

    that.indentationLevel++;
    that.writeLine(color('suite title', suite.title));
  });

  runner.on('suite end', function(suite) {
    that.indentationLevel--;
    if(1 == that.indentationLevel) that.writeLine();
  });

  runner.on('pending', function(test) {
    stats.pending++;

    that.writeLine(color('pending', '- %s'), test.title);
  });

  runner.on('test end', function(test) {
    stats.tests = stats.tests || 0;
    stats.tests++;
  });

  runner.on('pass', function(test) {
    stats.passes = stats.passes || 0;

    var medium = test.slow() / 2;
    test.speed = test.duration > test.slow()
      ? 'slow'
      : test.duration > medium
      ? 'medium'
      : 'fast';

    stats.passes++;

    if('fast' == test.speed) {
      that.writeLine('  ' + color('checkmark', symbols.ok) + color('pass', ' %s'), test.title);
    } else {
      that.writeLine('  ' + color('checkmark', symbols.ok) + color('pass', ' %s ') + color(test.speed, '(%dms)'), test.title, test.duration);
    }
  });

  runner.on('fail', function(test, err) {
    stats.failures = stats.failures || 0;
    stats.failures++;
    test.err = err;
    failures.push(test);

    that.writeLine('  ' + color('fail', '%d) %s'), failures.length, test.title);
  });

  runner.on('end', function() {
    stats.end = new Date;
    stats.duration = new Date - stats.start;

    that.writeLine();
    that.writeStat(stats);
    if(failures.length) that.writeFailures(failures);
  });
}

function formatTime(ms) {
  var time = [];
  var days = Math.floor(ms / 1000 / 60 / 60 / 24);
  if(days >= 1) {
    time.push(days + 'd');
    ms -= days * (1000 * 60 * 60 * 24);
  }
  var hours = Math.floor(ms / 1000 / 60 / 60);
  if(hours >= 1) {
    time.push(hours + 'h');
    ms -= hours * (1000 * 60 * 60);
  }
  var minutes = Math.floor(ms / 1000 / 60);
  if(minutes >= 1) {
    time.push(minutes + 'm');
    ms -= minutes * (1000 * 60);
  }
  var seconds = Math.floor(ms / 1000);
  if(seconds >= 1) {
    time.push(seconds + 's');
    ms -= seconds * (1000);
  }
  if(ms >= 1) {
    time.push(ms + 'ms');
  }
  return time.join(' ');
}

Reporter.prototype.write = function() {
  var ident = new Array(options.indentation * this.indentationLevel).join(' ');
  options.stream.write(ident + util.format.apply(util, arguments));
};

Reporter.prototype.writeLine = function() {
  var args = Array.prototype.slice.call(arguments);
  args.push('\n');
  this.write.apply(this, args);
};

Reporter.prototype.writeStat = function(stats) {
  this.indentationLevel++;
  if(stats.suites) {
    this.writeLine(color('stat', 'Executed %d tests in %d suites in %s'), stats.tests, stats.suites, formatTime(stats.duration));
  } else {
    this.writeLine(color('stat', 'Executed %d tests in %s'), stats.tests, formatTime(stats.duration));
  }
  this.indentationLevel++;
  if(stats.tests == stats.passes)
    this.writeLine(color('pass','All passes'));
  else {
    this.writeLine(color('pass', '%d passes'), stats.passes);
    if(stats.pending)
      this.writeLine(color('pending', '%d pending'), stats.pending);
    if(stats.failures)
      this.writeLine(color('fail', '%d failed'), stats.failures);
  }
  this.indentationLevel -= 2;
};


Reporter.prototype.writeFailures = function(failures) {
  this.indentationLevel++;

  failures.forEach(function(test, i) {
    var err = test.err,
      message = err.message,
      stack = err.stack,
      actual = err.actual,
      expected = err.expected,
      escape = true;

    var parsedStack = stacktrace.parse(err);

    var index = stack.indexOf(message);
    stack = stack.substr(index + message.length).split('\n').map(function(line) { return line.trim(); });

    if (err.showDiff && sameType(actual, expected)) {
      escape = false;
      err.actual = actual = stringify(canonicalize(actual));
      err.expected = expected = stringify(canonicalize(expected));
    }

    this.writeLine();
    this.writeLine('%d) ' + color('error title', '%s'), i+1, test.fullTitle());
    this.writeLine();

    this.indentationLevel++;
    this.writeLine(color('error message', '%s'), message);

    // actual / expected diff
    if ('string' == typeof actual && 'string' == typeof expected) {
      this.writeDiff(actual, expected, escape);
    }

    this.writeLine();

    stack.filter(function(l) { return l.length > 0; }).forEach(function(line, i) {
      this.writeLine(color('error stack', line));

      var fileName = parsedStack[i].getFileName(),
          lineNumber = parsedStack[i].getLineNumber(),
        columnNumber = parsedStack[i].getColumnNumber();

      if(lineNumber != null/* && this.files.indexOf(fileName) >= 0*/) {
        if(!this.filesCache[fileName]) {
          try {
            this.filesCache[fileName] = fs.readFileSync(fileName, { encoding: 'utf8' }).split('\n');
          } catch(e) {}
        }
        if(this.filesCache[fileName]) {
          var lines = this.filesCache[fileName];
          var exactLine = lines[lineNumber - 1];
          this.writeLine();
          this.writeLine(color('pos', '%d') + ' | %s', lineNumber, exactLine);
          if(columnNumber != null) {
            var prefixLength = ('' + lineNumber + ' | ').length;
            var padding = new Array(prefixLength + exactLine.length);
            padding[prefixLength + columnNumber - 1] = color('pos', '^');
            this.writeLine(padding.join(' '));
          } else {
            this.writeLine();
          }
        }
      }
    }, this);

    this.indentationLevel--;

  }, this);
  this.indentationLevel--;
};

function canonicalize(obj, stack) {
  stack = stack || [];

  if(stack.indexOf(obj) !== -1) return obj;

  var canonicalizedObj;

  if(Array.isArray(obj)) {
    stack.push(obj);
    canonicalizedObj = obj.map(function(item) {
      return canonicalize(item, stack);
    });
    stack.pop();
  } else if(typeof obj === 'object' && obj !== null) {
    stack.push(obj);
    canonicalizedObj = {};
    Object.keys(obj).sort().forEach(function(key) {
      canonicalizedObj[key] = canonicalize(obj[key], stack);
    });
    stack.pop();
  } else {
    canonicalizedObj = obj;
  }

  return canonicalizedObj;
}

Reporter.prototype.writeDiff = function(actual, expected, escape) {
  function cleanUp(line) {
    if (escape) {
      line = escapeInvisibles(line);
    }
    if (line[0] === '+') return colorLines('diff added', line);
    if (line[0] === '-') return colorLines('diff removed', line);
    if (line.match(/\@\@/)) return null;
    if (line.match(/\\ No newline/)) return null;
    else return line;
  }
  function notBlank(line) {
    return line != null;
  }
  var msg = diff.createPatch('string', actual, expected);
  var lines = msg.split('\n').splice(4);

  this.writeLine();
  this.writeLine(color('diff added', '+ expected') + ' ' + color('diff removed', '- actual'));
  this.writeLine();

  lines.map(cleanUp).filter(notBlank).forEach(function(line) {
    if(line.length)
      this.writeLine(line);
  }, this);
};

function stringify(obj) {
  if(obj instanceof RegExp) return obj.toString();
  return JSON.stringify(obj, null, 2);
}

function sameType(a, b) {
  return Object.prototype.toString.call(a) == Object.prototype.toString.call(b);
}

function escapeInvisibles(line) {
  return line.replace(/\t/g, '<tab>')
    .replace(/\r/g, '<CR>')
    .replace(/\n/g, '<LF>\n');
}

function colorLines(name, str) {
  return str.split('\n').map(function(str){
    return color(name, str);
  }).join('\n');
}

module.exports = Reporter;