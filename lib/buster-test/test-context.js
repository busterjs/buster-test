var buster = buster || {};

(function (B) {
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

    var testFunc = {
        create: function (name, func, parent) {
            var tf = B.util.create(this);
            tf.name = name;
            tf.func = func;
            tf.parent = parent;

            return tf;
        },

        fullName: function () {
            return this.parent.fullName() + " " + this.name;
        }
    };

    B.testContext = {
        contextSetUpName: "contextSetUp",
        setUpName: "setUp",
        tearDownName: "tearDown",
        contextTearDownName: "contextTearDown",

        create: function (name, tests, parent) {
            var context = B.util.create(this);
            context.name = name;
            context.content = tests;
            context.parent = parent;

            return context;
        },

        tests: function () {
            var tests = [];

            for (var prop in this.content) {
                if (this.isTest(prop)) {
                    tests.push(testFunc.create(prop, this.content[prop], this));
                }
            }

            return tests;
        },

        contexts: function () {
            var contexts = [];

            for (var prop in this.content) {
                if (this.isContext(prop)) {
                    contexts.push(B.testContext.create(prop, this.content[prop], this));
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

        fullName: function () {
            return (this.parent ? this.parent.fullName() + " " : "") + this.name;
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

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    module.exports = buster.testContext;
}
