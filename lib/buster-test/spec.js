var buster = buster || {};

(function () {
    function specContext(tests) {
        var context = {};

        var names = {
            "setUp": buster.spec.setUpName,
            "tearDown": buster.spec.tearDownName,
            "contextSetUp": buster.spec.contextSetUpName,
            "contextTearDown": buster.spec.contextTearDownName
        };

        for (var prop in names) {
            if (names.hasOwnProperty(prop)) {
                (function (property, method) {
                    context[method] = function (func) {
                        tests[property] = func;
                    };
                }(prop, names[prop]));
            }
        }

        return context;
    }

    buster.spec = function (name, spec) {
        if (!name || typeof name != "string") {
            throw new Error("Spec name required");
        }

        if (!spec || typeof spec != "function") {
            throw new Error("spec should be a function");
        }

        var tests = {};

        spec.call(specContext(tests), function (name, func) {
            tests[name] = func;
        });

        var spec = buster.testContext.create(name, tests);
        buster.spec.emit("create", spec);

        return spec;
    };
}());

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    buster.eventEmitter = require("buster-event-emitter");
    buster.testContext = require("buster-test/test-context");
    module.exports = buster.spec;
}

buster.util.extend(buster.spec, buster.eventEmitter);

buster.util.extend(buster.spec, {
    setUpName: "before",
    tearDownName: "after",
    contextSetUpName: "beforeSpec",
    contextTearDownName: "afterSpec"
});