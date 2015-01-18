mocha-better-spec-reporter
==========================

Originally it was fork for mocha own spec reporter, but it is very inconvinent to use.
So i fork it and rewrite adding missing things.
When output stack traces this reporter show lines from files and do not show stack after test files to do not pollute output.

## Migrate 1.x -> 2.x

Env var MOCHA_REPORTER_STACK_EXCLUDE now used as glob string - not as regexp.

## Env variables usage

It is possible to hide additional stack traces via env variable `MOCHA_REPORTER_STACK_EXCLUDE` as glob string.

`**/yadda/lib/**` - will hide all of the yadda stack traces

It is possible to hide some parts of output via env variable `MOCHA_REPORTER_OPTS`.

`hide-titles` - will hide execution tests/suites titles

`hide-stats` - will hide stat

`show-back-order` - will show fails in back order

## Command line usage

Also it is possible to set this parameters with mocha command line option `--reporter-options`, e.g:
```
mocha -R ../../../ --reporter-options hide-stats=true,hide-titles=true test.js
```

You need to set options in such format A=B,C=D.... Options are:

`hide-titles` accepted values `true`|`false` - show/hide executed test/suites titles

`hide-stats` accepted values `true`|`false` - show/hide executed tests statistic

`show-back-order` accepted values `true`|`false` - test fails shown in back order, so first fail will be at the bottom

`stack-exclude` any glob string, used to match stack trace files for exclude

How to use
=======

```
npm install --save-dev mocha-better-spec-reporter
```

```
mocha --reporter mocha-better-spec-reporter ... # and other options there
mocha -R mocha-better-spec-reporter --reporter-options hide-stats=true,hide-titles=true ...
```

Screenshot
==========
![screenshot](https://cloud.githubusercontent.com/assets/334851/4676893/a6951042-55e0-11e4-812d-04fe09241d6a.png)
