mocha-better-spec-reporter
==========================

Originally it was fork for mocha own spec reporter, but it is very inconvinent to use.
So i fork it and rewrite adding missing things.
When output stack traces this reporter show lines from files and do not show stack after test files to do not pollute output.

It is possible to hide additional stack traces via env variable MOCHA_REPORTER_STACK_EXCLUDE as regexp.

`\/yadda\/lib\/` - will hide all of the yadda stack traces

It is possible to hide some parts of output via env variable MOCHA_REPORTER_OPTS.

`hide-titles` - will hide execution tests/suites titles

`hide-stats` - will hide stat


How to use
=======

```
npm install --save-dev mocha-better-spec-reporter
```

```
mocha --reporter mocha-better-spec-reporter ... # and other options there
```

Screenshot
==========
![screenshot](https://cloud.githubusercontent.com/assets/334851/4676893/a6951042-55e0-11e4-812d-04fe09241d6a.png)
