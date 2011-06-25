if (typeof require != "undefined") {
    var sinon = require("sinon");
    var buster = require("buster-core");

    buster.extend(buster, {
        assert: require("buster-assert"),
        testCase: require("../../../lib/buster-test/test-case"),
        testContextFilter: require("../../../lib/buster-test/test-context-filter")
    });

    buster.util = require("buster-util");
}

Function.prototype.bind = function (obj) {
    var fn = this;

    return function () {
        return fn.call(obj);
    };
};

buster.util.testCase("ContextFilterTest", {
    "should return unfiltered context": function () {
        var context = buster.testCase("Some tests", {
            "test": function () {}
        });

        var context2 = buster.testContextFilter(context);

        buster.assert.equals(context.tests, context2.tests);
    },

    "should exclude tests that don't match string filter": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {},
            "test 2": function () {},
            "should be dropped": function () {}
        });

        var context2 = buster.testContextFilter(context, "test ");

        buster.assert.equals(context2.tests.length, 2);
        buster.assert.equals(context2.tests[0].name, "test 1");
        buster.assert.equals(context2.tests[1].name, "test 2");
    },

    "should exclude nested tests that don't match string filter": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {},
            "test 2": function () {},
            "should be dropped": function () {},
            "context": {
                "test inner 1": function () {},
                "some stuff": function () {},
                "test inner 2": function () {}
            }
        });

        var context2 = buster.testContextFilter(context, "test ");

        buster.assert.equals(context2.contexts[0].tests.length, 2);
        buster.assert.equals(context2.contexts[0].tests[0].name, "test inner 1");
        buster.assert.equals(context2.contexts[0].tests[1].name, "test inner 2");
    },

    "should filter nested tests based on full name": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {},
            "test 2": function () {},
            "should be dropped": function () {},
            "context": {
                "test inner 1": function () {},
                "some stuff": function () {},
                "test inner 2": function () {}
            }
        });

        var context2 = buster.testContextFilter(context, "context test");

        buster.assert.equals(context2.tests.length, 0);
        buster.assert.equals(context2.contexts[0].tests.length, 2);
    },

    "should filter nested tests based on deeply nested full name": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {},
            "test 2": function () {},
            "should be dropped": function () {},
            "context": {
                "test inner 1": function () {},
                "some stuff": function () {},
                "test inner 2": function () {},
                "deep": {
                    "test inner 1": function () {},
                    "some stuff": function () {},
                    "test inner 2": function () {}
                }
            }
        });

        var context2 = buster.testContextFilter(context, "context deep test");

        buster.assert.equals(context2.tests.length, 0);
        buster.assert.equals(context2.contexts[0].tests.length, 0);
        buster.assert.equals(context2.contexts[0].contexts[0].tests.length, 2);
    },

    "should exclude tests that don't match regexp filter": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {},
            "test 2": function () {},
            "should be dropped": function () {}
        });

        var context2 = buster.testContextFilter(context, /\d/);

        buster.assert.equals(context2.tests.length, 2);
        buster.assert.equals(context2.tests[0].name, "test 1");
        buster.assert.equals(context2.tests[1].name, "test 2");
    },

    "should exclude nested tests that don't match regexp filter": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {},
            "test 2": function () {},
            "should be dropped": function () {},
            "context": {
                "test inner 1": function () {},
                "some stuff": function () {},
                "test inner 2": function () {}
            }
        });

        var context2 = buster.testContextFilter(context, /\d/);

        buster.assert.equals(context2.contexts[0].tests.length, 2);
        buster.assert.equals(context2.contexts[0].tests[0].name, "test inner 1");
        buster.assert.equals(context2.contexts[0].tests[1].name, "test inner 2");
    },

    "should filter nested tests with regexp based on full name": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {},
            "test 2": function () {},
            "should be dropped": function () {},
            "context": {
                "test inner 1": function () {},
                "some stuff": function () {},
                "test inner 2": function () {}
            }
        });

        var context2 = buster.testContextFilter(context, /context test/);

        buster.assert.equals(context2.tests.length, 0);
        buster.assert.equals(context2.contexts[0].tests.length, 2);
    },

    "should apply filter case insensitively": function () {
        var context = buster.testCase("Some tests", {
            "test 1": function () {}
        });

        var context2 = buster.testContextFilter(context, "TEST");

        buster.assert.equals(context2.tests.length, 1);
    },

    "should exclude empty sub-contexts": function () {
        var context = buster.testCase("Some tests", {
            "something": {}
        });

        var context2 = buster.testContextFilter(context, "something");

        buster.assert.equals(context2.contexts.length, 0);
    },

    "should not exclude sub-context with tests": function () {
        var context = buster.testCase("Some tests", {
            "something": { "test": function () {} }
        });

        var context2 = buster.testContextFilter(context, "something");

        buster.assert.equals(context2.contexts.length, 1);
    }
});
