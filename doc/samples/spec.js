var buster = require("../../lib/buster-test");
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

var runner = buster.util.create(buster.testRunner);
runner.failOnNoAssertions = false;
var reporter = require("../../lib/buster-test/reporters/quiet-console").create(runner, { color: true });
runner.runSuite([spec, spec2, spec3]);
