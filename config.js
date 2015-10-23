var symbols = {
    passed: '✓',
    failed: '✖',
    pending: '-'
};

// With node.js on Windows: use symbols available in terminal default fonts
if('win32' == process.platform) {
    symbols.passed = '\u221A';
    symbols.failed = '\u00D7';
    symbols.pending = '-';
}

exports.symbols = symbols;

exports.colors = {

    'pending': 'yellow.bold',
    'pass': 'green.bold',
    'fail': 'red.bold',
    'checkmark': 'magenta',
    'slow': 'red',
    'medium': 'yellow',
    'stat': 'blue',
    'error title': 'white.underline.bold',
    'error stack': 'yellow',
    'error stack source-map': 'magenta',
    'error message': 'cyan',
    'diff added': 'green',
    'diff removed': 'red',
    'pos': 'yellow',

    'error line num': 'red.bold',
    'error line pos': 'red.bold',

    'suite title': 'bold.underline',

    'option passed': 'magenta.bold',
    'test title passed': 'green',

    'option pending': 'yellow.bold',
    'test title pending': 'yellow',

    'option failed': 'red.bold',
    'test title failed': 'red.bold'
};

exports.indentation = 4;

exports.stream = process.stdout;
