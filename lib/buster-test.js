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

var create = buster.testRunner.create;
var instances = 0;

buster.testRunner.create = function () {
    instances += 1;
    return create.apply(this, arguments);
};

var testCases = [];

buster.testCase.onCreate = function (tc) {
    testCases.push(tc);
};

buster.describe.onCreate = buster.testCase.onCreate;

buster.nextTick(function () {
    if (instances == 0 && testCases.length > 0) {
        var runner = buster.testRunner.create({
            timeout: 750,
            failOnNoAssertions: false
        });

        buster.xUnitConsoleReporter.create({
            color: true,
            bright: true
        }).listen(runner);

        runner.runSuite(testCases);
    }
});
