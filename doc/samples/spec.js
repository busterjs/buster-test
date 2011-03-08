var buster = require("../../lib/buster-test");
buster.promise = require("../../lib/buster-test/promise");
var describe = buster.describe;
var assert = require("assert");

var spec = describe("Sample spec", function (should) {
    should("pass simple assertion", function () {
        buster.assert(true);
    });

    should("fail when test throws", function () {
        throw new Error("Ooops!");
    });

    should("fail test", function () {
        buster.assert.equals("Something", "Other");
    });

    this.describe("nested", function (should) {
        should("do it", function () {
            buster.assert(true);
        });
    });
});

var spec2 = describe("Another test", function (it) {
    this.before(function () {
        this.value = 42;
    });

    it("passes simple assertion", function () {
        buster.assert.equals(42, this.value);
    });

    it("passes true assertion", function () {
        buster.assert(true);
    });

    it("passes node assertion", function () {
        assert.ok(true);
    });

    it("fails node assertion", function () {
        assert.ok(false);
    });

    it("is asynchronous", function () {
        var promise = buster.promise.create(function () {
            setTimeout(function () {
                console.log("Async");
                promise.resolve();
            }, 1000);
        });

        return promise;
    }),

    it("puts the lotion on its skin or else it gets the hose again", function () {
        buster.assert(true);
    });
});

var spec3 = describe("Third one", function (it) {
    it("should do #1", function () { buster.assert(true); });
    it("should do #2", function () { buster.assert(true); });
    it("should do #3", function () { buster.assert(true); });
    it("should do #4", function () { buster.assert(true); });
    it("should do #5", function () { buster.assert(true); });
    it("should do #6", function () { buster.assert(true); });
    it("should do #7", function () { buster.assert(true); });
    it("should do #8", function () { buster.assert(true); });
});

spec2.specPrefix = "";

var runner = buster.create(buster.testRunner);
runner.failOnNoAssertions = false;
runner.timeout = 1500;

var quietReporter = require("../../lib/buster-test/reporters/quiet-console");
var reporter = quietReporter.create(runner, { color: true });

// var xUnitConsoleReporter = require("../../lib/buster-test/reporters/xunit-console");
// var reporter = xUnitConsoleReporter.create(runner, { color: true, bright: true });

runner.runSuite([spec, spec2, spec3]);
