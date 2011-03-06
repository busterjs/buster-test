var buster = require("buster-core");

module.exports = buster.extend(buster, {
    assert: require("buster-assert"),
    format: require("buster-format"),
    testCase: require("./buster-test/test-case"),
    describe: require("./buster-test/spec"),
    testRunner: require("./buster-test/test-runner"),
    xUnitConsoleReporter: require("./buster-test/reporters/xunit-console")
});

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
