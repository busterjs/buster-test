var buster = buster || {};

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    buster.eventEmitter = require("buster-event-emitter");
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
        testCase.emit("create", context);

        return context;
    };

    if (typeof module != "undefined") {
        module.exports = B.testCase;
    }

    B.util.extend(testCase, B.eventEmitter);

    function nonTestNames(context) {
        if (!context.nonTestNames) {
            var keys = ["setUp", "contextSetUp", "tearDown", "contextTearDown"];
            context.nonTestNames = {};

            for (var i = 0, l = keys.length; i < l; ++i) {
                context.nonTestNames[context[keys[i] + "Name"]] = true;
            }
        }

        return context.nonTestNames;
    }

    testCase.context = {
        contextSetUpName: "contextSetUp",
        setUpName: "setUp",
        tearDownName: "tearDown",
        contextTearDownName: "contextTearDown",

        create: function (name, tests, parent) {
            var context = B.util.create(this);
            context.name = name;
            context.content = tests;
            context.parent = parent;
            context.testCase = {};

            return context;
        },

        tests: function () {
            var tests = [];

            for (var prop in this.content) {
                if (this.isTest(prop)) {
                    tests.push({
                        name: prop,
                        func: this.content[prop],
                        parent: this
                    });
                }
            }

            return tests;
        },

        contexts: function () {
            var contexts = [];

            for (var prop in this.content) {
                if (this.isContext(prop)) {
                    contexts.push(testCase.context.create(prop, this.content[prop], this));
                }
            }

            return contexts;
        },

        getSetUp: function () {
            return this.content[this.setUpName];
        },

        getContextSetUp: function () {
            return this.content[this.contextSetUpName];
        },

        getTearDown: function () {
            return this.content[this.tearDownName];
        },

        getContextTearDown: function () {
            return this.content[this.contextTearDownName];
        },

        isTest: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "function" &&
                !nonTestNames(this)[prop];
        },

        isContext: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "object" &&
                !!this.content[prop];
        }
    };
}(buster));
