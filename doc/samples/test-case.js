var buster = require("../../lib/buster-test");

var testCase = buster.testCase("Sample test", {
    "should pass simple assertion": function () {
        buster.assert(true);
    },

    "should fail when test throws": function () {
        throw new Error("Ooops!");
    },

    "should fail test": function () {
        buster.assert.equals("Something", "Other");
    }
});

var testCase2 = buster.testCase("Another test", {
    "should pass simple assertion": function () {
        buster.assert(true);
    },

    "should fail when test throws": function () {
        throw new Error("Ooops!");
    },

    "should fail test": function () {
        buster.assert.equals("Something", "Other");
    }
});

var runner = buster.util.create(buster.testRunner);
var reporter = buster.consoleReporter.create(runner, { color: true, bright: true });

runner.run(testCase);
runner.run(testCase2);
reporter.printStats();
