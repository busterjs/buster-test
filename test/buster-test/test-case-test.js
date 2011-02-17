if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        testCase: require("buster-test/test-case")
    };
}

testCase("BusterTestCaseTest", {
    tearDown: function () {
        delete buster.testCase.listeners;
    },

    "should throw without name": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase();
        });
    },

    "should throw if name is not a string": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase({});
        });
    },

    "should throw if name is empty": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase("");
        });
    },

    "should throw without tests": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase("Some test");
        });
    },

    "should throw if tests is not an object": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase("Some test", function () {});
        });
    },

    "should throw if tests is null": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase("Some test", null);
        });
    },

    "should return object": function () {
        var testCase = buster.testCase("Some test", {});

        buster.assert.isObject(testCase);
    },

    "returned object should have name and tests properties": function () {
        var test = function () {};
        var testCase = buster.testCase("Some test", {
            "should keep it": test
        });

        buster.assert.equals("Some test", testCase.name);
        buster.assert.equals({ "should keep it": test }, testCase.tests);
    },

    "should emit create event when a test case is created": function () {
        var callback = sinon.spy();
        buster.testCase.on("create", callback);

        var testCase = buster.testCase("Some test", {});

        buster.assert(callback.calledOnce);
        buster.assert.equals(testCase, callback.args[0][0]);
    }
});
