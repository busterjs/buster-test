var buster = require("../../lib/buster-test");

var spec = buster.spec("Sample spec", function (should) {
    should("pass simple assertion", function () {
        buster.assert(true);
    });

    should("fail when test throws", function () {
        throw new Error("Ooops!");
    });

    should("fail test", function () {
        buster.assert.equals("Something", "Other");
    });
});

var spec2 = buster.spec("Another test", function (should) {
    should("pass simple assertion", function () {
        buster.assert(true);
    });

    should("fail when test throws", function () {
        throw new Error("Ooops!");
    });

    should("fail test", function () {
        buster.assert.equals("Something", "Other");
    });
});

var runner = buster.util.create(buster.testRunner);
var reporter = buster.consoleReporter.create(runner, { color: true });
runner.runSuite([spec, spec2]);
