if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");

    var buster = {
        assert: require("buster-assert"),
        testCase: require("buster-test-case")
    };
}

testCase("TestCaseTest", {
    "should throw without name": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase();
        });
    }
});
