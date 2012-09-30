if (typeof module === "object" && typeof require === "function") {
    module.exports = {
        testCase: require("./test-case"),
        spec: require("./spec"),
        testRunner: require("./test-runner"),
        testContext: require("./test-context"),
        reporters: require("./reporters"),
        autoRun: require("./auto-run")
    };
}
