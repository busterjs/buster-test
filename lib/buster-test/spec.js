var buster = buster || {};

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    buster.eventEmitter = require("buster-event-emitter");
}

(function (B) {
    B.describe = function (name, spec) {
        var context = B.describe.context.create(name, spec);
        B.describe.emit("create", context);

        return context;
    };

    B.util.extend(B.describe, B.eventEmitter);

    if (typeof module != "undefined") {
        module.exports = B.describe;
    }

    function specContext(tests) {
        var context = {};

        var names = {
            "setUp": tests.setUpName,
            "tearDown": tests.tearDownName,
            "contextSetUp": tests.contextSetUpName,
            "contextTearDown": tests.contextTearDownName
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

        context.describe = function (name, func) {
            tests.contextObjects.push(B.describe.context.create(name, func, tests));
        };

        return context;
    }

    B.describe.context = {
        specPrefix: "should ",
        setUpName: "before",
        tearDownName: "after",
        contextSetUpName: "beforeSpec",
        contextTearDownName: "afterSpec",

        create: function (name, spec, parent) {
            if (!name || typeof name != "string") {
                throw new Error("Spec name required");
            }

            if (!spec || typeof spec != "function") {
                throw new Error("spec should be a function");
            }

            var context = B.util.create(this);
            context.name = name;
            context.parent = parent;
            context.spec = spec;

            return context;
        },

        tests: function () {
            this.run();
            return this.testFunctions;
        },

        contexts: function () {
            this.run();
            return this.contextObjects;
        },

        getSetUp: function () {
            this.run();
            return this.setUp;
        },

        getContextSetUp: function () {
            this.run();
            return this.contextSetUp;
        },

        getTearDown: function () {
            this.run();
            return this.tearDown;
        },

        getContextTearDown: function () {
            this.run();
            return this.contextTearDown;
        },

        run: function () {
            if (!this.spec) {
                return;
            }

            this.testFunctions = [];
            this.testCase = specContext(this);
            this.contextObjects = [];
            var context = this;

            this.spec.call(context.testCase, function (name, func) {
                context.testFunctions.push({
                    name: context.specPrefix + name,
                    func: func,
                    context: context
                });
            });

            delete this.spec;
        }
    };
}(buster));
