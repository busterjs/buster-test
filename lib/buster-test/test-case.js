var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

(function (B) {
    var testCase = B.testCase = function (name, tests) {
        if (!name || typeof name != "string") {
            throw new Error("Test case name required");
        }

        if (!tests || typeof tests != "object") {
            throw new Error("Tests should be an object");
        }

        var context = testCase.context.create(name, tests);
        context.parse();

        if (typeof B.testCase.onCreate == "function") {
            B.testCase.onCreate(context);
        }

        return context;
    };

    if (typeof module != "undefined") {
        module.exports = B.testCase;
    }

    B.extend(testCase, B.eventEmitter);

    function nonTestNames(context) {
        return {
            setUp: true,
            tearDown: true,
            requiresSupportFor: true,
            requiresSupportForAll: true
        };
    }

    var DEFERRED_PREFIX = /^\s*\/\/\s*/;

    testCase.context = {
        contextSetUpName: "contextSetUp",
        setUpName: "setUp",
        tearDownName: "tearDown",
        contextTearDownName: "contextTearDown",

        create: function (name, tests, parent) {
            var context = B.create(this);
            context.name = name;
            context.content = tests;
            context.parent = parent;
            context.testCase = {};

            return context;
        },

        parse: function () {
            this.getSupportRequirements();
            this.deferred = DEFERRED_PREFIX.test(this.name);
            this.name = this.name.replace(DEFERRED_PREFIX, "");
            this.tests = this.getTests();
            this.contexts = this.getContexts();
            this.setUp = this.getSetUp();
            this.tearDown = this.getTearDown();
            return this;
        },

        getSupportRequirements: function () {
            this.requiresSupportForAll = this.content.requiresSupportForAll || this.content.requiresSupportFor;
            delete this.content.requiresSupportForAll;
            delete this.content.requiresSupportFor;
            this.requiresSupportForAny = this.content.requiresSupportForAny;
            delete this.content.requiresSupportForAny;
        },

        getTests: function () {
            var tests = [], isFunc;

            for (var prop in this.content) {
                isFunc = typeof this.content[prop] == "function";
                if (this.isTest(prop)) {
                    tests.push({
                        name: prop.replace(/^\s*\/\/\s*/, ""),
                        func: this.content[prop],
                        context: this,
                        deferred: this.deferred || DEFERRED_PREFIX.test(prop) || !isFunc,
                        comment: !isFunc ? this.content[prop] : ""
                    });
                }
            }

            return tests;
        },

        getContexts: function () {
            var contexts = [], ctx;

            for (var prop in this.content) {
                if (!this.isContext(prop)) { continue; }

                ctx = testCase.context.create(prop, this.content[prop], this);
                contexts.push(ctx.parse());
            }

            return contexts;
        },

        getSetUp: function () {
            return this.content.setUp;
        },

        getTearDown: function () {
            return this.content.tearDown;
        },

        isTest: function (prop) {
            var type = typeof this.content[prop];
            return this.content.hasOwnProperty(prop) &&
                (type == "function" || type == "string") &&
                !nonTestNames(this)[prop];
        },

        isContext: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "object" &&
                !!this.content[prop];
        }
    };
}(buster));
