// Forcibly monkey-patch `nes-test` to be this module, even when we're running in this module. 
// This is the secret sauce that makes this work as a binary with pkg.
const Module = require('module'),
    NesTest = require('../index'),
    originalRequire = Module.prototype.require;

Module.prototype.require = function(name){
    if (name === 'nes-test') {
        return NesTest;
    }

  return originalRequire.apply(this, arguments);
};

beforeAll(() => {
    require('./jasmine-matchers').installMatchers();
});

