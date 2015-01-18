var assert = require('assert');

var b = require('./tst-f');

describe('I need to have one group', function() {
    it('should have test before', function(done) {
        setTimeout(function() {
            done();
        }, 3000);
    });

    describe('And another group inside', function() {
       it('should fail always', function() {
           assert.fail('Boom');
       });

        it('should not fail', function() {

        });
    });

    it('should be in first group and be ok', function() {

    });

    it('should also contain pending test');
});

it('also contain test without suite', function() {

});

it('should call function outside of tests', function() {
    b.boomFunction();
});

it('should show diff if objects have the same type', function() {
  assert.deepEqual({ a: { b: 'abc' }, d: 'abc', v: 'abc', z: 3}, { a: { b: '10' }, d: /abc/, v: 'adb', c: 11 });
});