if (typeof module === "object" && typeof require === "function") {
    var helper = require("./test-helper");
    var assert = require("referee").assert;
    var reporters = require("../lib/reporters");

    helper.testCase("Reporters test", {
        "loads built-in reporter": function () {
            assert.equals(reporters.xml, reporters.load("xml"));
        }
    });
}
