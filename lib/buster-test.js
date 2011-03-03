var path = require("path");
require.paths.unshift(path.join(__dirname + "/../deps/buster-util/lib/"));
require.paths.unshift(path.join(__dirname + "/../deps/buster-event-emitter/lib/"));

var buster = module.exports = {
    assert: require("../deps/buster-assert/lib/buster-assert"),
    util: require("buster-util"),
    format: require("../deps/buster-object-format/lib/buster-object-format"),
    testCase: require("./buster-test/test-case"),
    describe: require("./buster-test/spec"),
    testRunner: require("./buster-test/test-runner"),
    xUnitConsoleReporter: require("./buster-test/reporters/xunit-console")
};

buster.assert.format = buster.format.ascii;
var assertions = 0;

buster.assert.pass = function () {
    assertions += 1;
};

buster.testRunner.on("test:start", function () {
    assertions = 0;
});

buster.testRunner.assertionCount = function () {
    return assertions;
};
