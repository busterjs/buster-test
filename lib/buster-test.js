if (typeof require != "undefined") {
    var buster = require("buster-core");

    module.exports = buster.extend(buster, {
        assert: require("buster-assert"),
        format: require("buster-format"),
        testCase: require("./buster-test/test-case"),
        spec: require("./buster-test/spec"),
        testRunner: require("./buster-test/test-runner"),
        filteredRunner: require("./buster-test/filtered-runner"),
        xUnitConsoleReporter: require("./buster-test/reporters/xunit-console"),
        bddConsoleReporter: require("./buster-test/reporters/bdd-console"),
        quietConsoleReporter: require("./buster-test/reporters/quiet-console")
    });
}

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

buster.spec.describe.onCreate = buster.testCase.onCreate;

setTimeout(function () {
    var reporter;

    if (instances == 0 && testCases.length > 0) {
        var runner = buster.testRunner.create({
            timeout: 750,
            failOnNoAssertions: false
        });

        var opt = {
            color: true,
            bright: true
        };

        if (typeof document != "undefined") {
            reporter = "htmlReporter";
            opt.root = document.getElementById("buster");
        } else {
            var env = process && process.env;
            reporter = env && env.BUSTER_REPORTER || "xUnitConsoleReporter";
        }

        buster[reporter].create(opt).listen(runner);
        runner.runSuite(testCases);
    }
}, typeof document == "undefined" ? 0 : 100);
