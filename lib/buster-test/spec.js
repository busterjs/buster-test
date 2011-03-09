var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.eventEmitter = require("buster-event-emitter");
}

(function (B) {
    B.describe = function (name, spec, opt) {
        var context = buster.extend(B.describe.context.create(name, spec), opt || {});
        context.parse();

        if (B.describe.onCreate) {
            B.describe.onCreate(context);
        }

        return context;
    };

    B.extend(B.describe, B.eventEmitter);

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
            tests.contexts.push(B.describe.context.create(name, func, tests).parse());
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

            var context = B.create(this);
            context.name = name;
            context.parent = parent;
            context.spec = spec;

            if (parent) {
                context.specPrefix = parent.specPrefix;
                context.setUpName = parent.setUpName;
                context.tearDownName = parent.tearDownName;
                context.contextSetUpName = parent.contextSetUpName;
                context.contextTearDownName = parent.contextTearDownName;
            }

            return context;
        },

        parse: function () {
            if (!this.spec) {
                return;
            }

            this.tests = [];
            this.testCase = specContext(this);
            this.contexts = [];
            var context = this;

            this.spec.call(context.testCase, function (name, func) {
                context.tests.push({
                    name: context.specPrefix + name,
                    func: func,
                    context: context
                });
            });

            delete this.spec;
            return this;
        }
    };
}(buster));
