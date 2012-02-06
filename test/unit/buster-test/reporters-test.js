if (typeof module === "object" && typeof require === "function") {
    var buster = { reporters: require("../../../lib/buster-test/reporters") };
    buster.util = require("buster-util");
    buster.moduleLoader = require("buster-module-loader");
    var assert = require("buster-assertions").assert;
    var sinon = require("sinon");

    buster.util.testCase("Reporters test", sinon.testCase({
        "should load built-in reporter": function () {
            assert.equals(buster.reporters.xml, buster.reporters.load("xml"));
        },

        "should get reporter through the moduleLoader": function () {
            this.stub(buster.moduleLoader, "load");
            buster.reporters.load("my-custom#reporter");

            assert(buster.moduleLoader.load.calledOnce);
            assert(buster.moduleLoader.load.calledWith("my-custom#reporter"));
        }
    }, "should"));
}