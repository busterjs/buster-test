((typeof require === "function" && function (reqs, callback) {
    callback.apply(this, reqs.map(function (req) { return require(req); }));
}) || define)([
    "when",
    "sinon",
    "referee",
    "../lib/test-case",
    "../lib/test-context",
    "./test-helper"
], function (when, sinon, referee, testCase, testContext, helper) {
    var assert = referee.assert;
    var refute = referee.refute;

    helper.testCase("ContextFilterTest", {
        "returns unfiltered context": function () {
            var context = testCase("Some tests", {
                "test": function () {}
            });

            var context2 = testContext.filter(context);

            assert.equals(context.tests, context2.tests);
        },

        "excludes tests that don't match string filter": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {}
            });

            var context2 = testContext.filter(context, "test ");

            assert.equals(context2.tests.length, 2);
            assert.equals(context2.tests[0].name, "test 1");
            assert.equals(context2.tests[1].name, "test 2");
        },

        "excludes nested tests that don't match string filter": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {},
                "context": {
                    "test inner 1": function () {},
                    "some stuff": function () {},
                    "test inner 2": function () {}
                }
            });

            var context2 = testContext.filter(context, "test ");

            assert.equals(context2.contexts[0].tests.length, 2);
            assert.equals(context2.contexts[0].tests[0].name, "test inner 1");
            assert.equals(context2.contexts[0].tests[1].name, "test inner 2");
        },

        "excludes nested tests that don't match either filter": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {},
                "context": {
                    "test inner 1": function () {},
                    "some stuff": function () {},
                    "test inner 2": function () {}
                }
            });

            var context2 = testContext.filter(context, ["test 1", "test 2"]);

            assert.equals(context2.tests.length, 2);
            assert.equals(context2.tests[0].name, "test 1");
            assert.equals(context2.tests[1].name, "test 2");
        },

        "matchs with multiple string and regexp filters": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {},
                "context": {
                    "test inner 1": function () {},
                    "some stuff": function () {},
                    "test inner 2": function () {}
                }
            });

            var context2 = testContext.filter(context, [/test (1|2)/, "stuff"]);

            assert.equals(context2.tests.length, 2);
            assert.equals(context2.contexts.length, 1);
            assert.equals(context2.contexts[0].tests.length, 1);
            assert.equals(context2.contexts[0].tests[0].name, "some stuff");
        },

        "filters nested tests based on full name": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {},
                "context": {
                    "test inner 1": function () {},
                    "some stuff": function () {},
                    "test inner 2": function () {}
                }
            });

            var context2 = testContext.filter(context, "context test");

            assert.equals(context2.tests.length, 0);
            assert.equals(context2.contexts[0].tests.length, 2);
        },

        "filters nested tests based on deeply nested full name": function () {
            var context = testCase("Some tests", {
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

            var context2 = testContext.filter(context, "context deep test");

            assert.equals(context2.tests.length, 0);
            assert.equals(context2.contexts[0].tests.length, 0);
            assert.equals(context2.contexts[0].contexts[0].tests.length, 2);
        },

        "excludes tests that don't match regexp filter": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {}
            });

            var context2 = testContext.filter(context, /\d/);

            assert.equals(context2.tests.length, 2);
            assert.equals(context2.tests[0].name, "test 1");
            assert.equals(context2.tests[1].name, "test 2");
        },

        "excludes nested tests that don't match regexp filter": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {},
                "context": {
                    "test inner 1": function () {},
                    "some stuff": function () {},
                    "test inner 2": function () {}
                }
            });

            var context2 = testContext.filter(context, /\d/);

            assert.equals(context2.contexts[0].tests.length, 2);
            assert.equals(context2.contexts[0].tests[0].name, "test inner 1");
            assert.equals(context2.contexts[0].tests[1].name, "test inner 2");
        },

        "filters nested tests with regexp based on full name": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {},
                "context": {
                    "test inner 1": function () {},
                    "some stuff": function () {},
                    "test inner 2": function () {}
                }
            });

            var context2 = testContext.filter(context, /context test/);

            assert.equals(context2.tests.length, 0);
            assert.equals(context2.contexts[0].tests.length, 2);
        },

        "applys filter case insensitively": function () {
            var context = testCase("Some tests", {
                "test 1": function () {}
            });

            var context2 = testContext.filter(context, "TEST");

            assert.equals(context2.tests.length, 1);
        },

        "excludes empty sub-contexts": function () {
            var context = testCase("Some tests", {
                "something": {}
            });

            var context2 = testContext.filter(context, "something");

            assert.equals(context2.contexts.length, 0);
        },

        "does not exclude sub-context with tests": function () {
            var context = testCase("Some tests", {
                "something": { "test": function () {} }
            });

            var context2 = testContext.filter(context, "something");

            assert.equals(context2.contexts.length, 1);
        },

        "treats empty array as pass-all filter": function () {
            var context = testCase("Some tests", {
                "something": { "test": function () {} }
            });

            var context2 = testContext.filter(context, []);

            assert.equals(context2.contexts.length, 1);
        },

        "excludes tests from filter when compiling": function () {
            var contexts = testContext.compile([testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {}
            })], "test ");

            assert.equals(contexts.length, 1);
            assert.equals(contexts[0].tests.length, 2);
        },

        "excludes empty contexts in compile output": function () {
            var input = [testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {}
            }), testCase("Other tests", {
                "test A": function () {},
                "test B": function () {}
            })];

            var contexts = testContext.compile(input, /\d/);

            assert.equals(contexts.length, 1);
            assert.equals(contexts[0].tests.length, 2);
        },

        "returns promise for promise input": function () {
            var context = testCase("Some tests", {
                "test 1": function () {},
                "test 2": function () {},
                "should be dropped": function () {}
            });
            var promise = when(context);
            var contexts = testContext.compile([promise], "test ");

            assert.equals(contexts.length, 1);
            assert.isFunction(contexts[0].then);
        },

        "returned promise has context name": function () {
            var context = testCase("Some tests", {
                "test 1": function () {}
            });
            var promise = when(context);
            promise.name = context.name;

            var contexts = testContext.compile([promise], "test ");

            assert.equals(contexts[0].name, "Some tests");
        }
    });
});