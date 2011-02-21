var buster = require("../../lib/buster-test");

var testCase = buster.testCase("Sample test", {
    setUp: function () {
        this.a = 1;
    },

    "should pass simple assertion": function () {
        buster.assert(true);
    },

    "should fail when test throws": function () {
        throw new Error("Ooops!");
    },

    "should fail test": function () {
        buster.assert.equals("Something", "Other");
    },

    "context": {
        "should be awesome": function () {
            buster.assert.equals(1, 1);
        },

        "inside here": {
            setUp: function () {
                this.a += 1;
            },

            "should do it more": function () {
                buster.assert.equals(2, this.a);
            }
        }
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
var reporter = buster.xUnitConsoleReporter.create(runner, { color: true, bright: true });
runner.runSuite([testCase, testCase2]);
