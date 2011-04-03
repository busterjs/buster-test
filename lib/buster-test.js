if (typeof require != "undefined") {
    module.exports = {
        testCase: require("./buster-test/test-case"),
        spec: require("./buster-test/spec"),
        testRunner: require("./buster-test/test-runner"),
        filteredRunner: require("./buster-test/filtered-runner"),
        testContextFilter: require("./buster-test/test-context-filter"),
        reporters: require("./buster-test/reporters"),
        test: require("./buster-test/test"),
        stackFilter: require("./buster-test/stack-filter")
    };
}
