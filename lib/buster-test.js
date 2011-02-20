var path = require("path");
require.paths.unshift(path.join(__dirname + "/../deps/buster-util/lib/"));
require.paths.unshift(path.join(__dirname + "/../deps/buster-event-emitter/lib/"));

var buster = module.exports = {
    assert: require("../deps/buster-assert/lib/buster-assert"),
    util: require("buster-util"),
    format: require("../deps/buster-object-format/lib/buster-object-format"),
    testCase: require("../lib/buster-test/test-case"),
    spec: require("../lib/buster-test/spec"),
    testRunner: require("../lib/buster-test/test-runner"),
    consoleReporter: require("../lib/buster-test/console-reporter")
};

buster.assert.format = buster.format.ascii;
