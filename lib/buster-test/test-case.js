var buster = buster || {};

buster.testCase = function (name, tests) {
    if (!name || typeof name != "string") {
        throw new Error("Test case name required");
    }

    if (!tests || typeof tests != "object") {
        throw new Error("Tests should be an object");
    }

    var testCase = buster.testContext.create(name, tests);
    buster.testCase.emit("create", testCase);

    return testCase;
};

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    buster.eventEmitter = require("buster-event-emitter");
    buster.testContext = require("buster-test/test-context");
    module.exports = buster.testCase;
}

buster.util.extend(buster.testCase, buster.eventEmitter);
