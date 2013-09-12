((typeof require === "function" && function (reqs, callback) {
    callback.apply(this, reqs.map(function (req) { return require(req); }));
}) || define)([
    "sinon",
    "referee",
    "../lib/test-case",
    "../lib/test-context",
    "./test-helper"
], function (sinon, referee, bTestCase, testContext, helper) {
    var assert = referee.assert;
    var refute = referee.refute;

    helper.testCase("BusterTestCaseTest", {
        tearDown: function () {
            delete bTestCase.listeners;
        },

        "throws without name": function () {
            assert.exception(function () {
                var testCase = bTestCase();
            });
        },

        "throws if name is not a string": function () {
            assert.exception(function () {
                var testCase = bTestCase({});
            });
        },

        "throws if name is empty": function () {
            assert.exception(function () {
                var testCase = bTestCase("");
            });
        },

        "throws without tests": function () {
            assert.exception(function () {
                var testCase = bTestCase("Some test");
            });
        },

        "throws if tests is not an object": function () {
            assert.exception(function () {
                var testCase = bTestCase("Some test", 42);
            });
        },

        "throws if tests is null": function () {
            assert.exception(function () {
                var testCase = bTestCase("Some test", null);
            });
        },

        "returns context object": function () {
            var setUp = function () {};
            var test = function () {};

            var testCase = bTestCase("Some test", {
                setUp: setUp,
                testSomething: test
            });

            assert.isObject(testCase);
            assert.equals(testCase.name, "Some test");
            assert.equals(testCase.tests.length, 1);
            assert.equals(testCase.tests[0].name, "testSomething");
            assert.equals(testCase.tests[0].func, test);
            assert.equals(testCase.setUp, setUp);
        },

        "calls create callback when a test case is created": function () {
            var spy = sinon.spy();
            testContext.on("create", spy);

            var testCase = bTestCase("Some test", {});

            assert(spy.calledOnce);
            assert.equals(spy.args[0][0], testCase);
        }
    });

    helper.testCase("TestCaseContextTest", {
        "has name property": function () {
            var context = bTestCase("Name", {});

            assert.equals(context.name, "Name");
        }
    });

    helper.testCase("TestContextTestsTest", {
        "gets tests": function () {
            var test = function () {};
            var context = bTestCase("Name", {
                "test 1": test
            });

            assert.equals(context.tests.length, 1);
            assert.equals(context.tests[0].name, "test 1");
            assert.equals(context.tests[0].func, test);
        },

        "excludes setUp": function () {
            var context = bTestCase("Name", {
                setUp: function () {}
            });

            assert.equals(context.tests.length, 0);
        },

        "excludes tearDown": function () {
            var context = bTestCase("Name", {
                tearDown: function () {}
            });

            assert.equals(context.tests.length, 0);
        },

        "excludes prepare": function () {
            var context = bTestCase("Name", {
                prepare: function () {}
            });

            assert.equals(context.tests.length, 0);
        },

        "excludes conclude": function () {
            var context = bTestCase("Name", {
                conclude: function () {}
            });

            assert.equals(context.tests.length, 0);
        },

        "excludes non-function property": function () {
            var context = bTestCase("Name", {
                id: 42
            });

            assert.equals(context.tests.length, 0);
        },

        "keeps reference to parent context": function () {
            var context = bTestCase("Name", {
                testIt: function () {}
            });

            assert.equals(context.tests[0].context, context);
        }
    });

    helper.testCase("TestContextContextsTest", {
        "gets contexts as list of context objects": function () {
            var context = bTestCase("Name", {
                test: function () {},
                doingIt: {}
            });

            var contexts = context.contexts;

            assert.equals(contexts.length, 1);
            assert.equals(contexts[0].name, "doingIt");
        },

        "gets contexts with context as parent": function () {
            var context = bTestCase("Name", {
                test: function () {},
                doingIt: {}
            });

            var contexts = context.contexts;

            assert.equals(contexts[0].parent, context);
        },

        "does not include null properties": function () {
            var context = bTestCase("Name", {
                test: function () {},
                doingIt: null
            });

            var contexts = context.contexts;

            assert.equals(contexts.length, 0);
        },

        "gets tests from nested context": function () {
            var context = bTestCase("Name", {
                someContext: { test: function () {} }
            });

            var tests = context.contexts[0].tests;

            assert.equals(tests.length, 1);
            assert.equals(tests[0].name, "test");
        },

        "gives contexts unique test case objects": function () {
            var context = bTestCase("Name", {
                someContext: { test: function () {} }
            });

            var contexts = context.contexts;

            refute.same(contexts[0].testCase, context.testCase);
        },

        "context test case object has name function": function () {
            var context = bTestCase("Name", {});

            assert.isFunction(context.testCase.name);
            assert.equals(context.testCase.name("contextSetUp"), "prepare");
        }
    });

    helper.testCase("TestContextSetUpTearDownTest", {
        "keeps reference to setUp method": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                setUp: setUp,
                test: function () {}
            });

            assert.equals(context.setUp, setUp);
        },

        "keeps reference to tearDown method": function () {
            var tearDown = function () {};

            var context = bTestCase("Name", {
                tearDown: tearDown,
                test: function () {}
            });

            assert.equals(context.tearDown, tearDown);
        },

        "keeps reference to prepare method": function () {
            var prepare = function () {};

            var context = bTestCase("Name", {
                prepare: prepare,
                test: function () {}
            });

            assert.equals(context.contextSetUp, prepare);
        },

        "keeps reference to conclude method": function () {
            var conclude = function () {};

            var context = bTestCase("Name", {
                conclude: conclude,
                test: function () {}
            });

            assert.equals(context.contextTearDown, conclude);
        }
    });

    helper.testCase("TestContextRequiresSupportTest", {
        "keeps reference to requiresSupportForAll": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                requiresSupportForAll: { featureA: true },
                test: function () {}
            });

            assert.equals(context.requiresSupportForAll, { featureA: true });
        },

        "does not use requiresSupportForAll as context": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                requiresSupportForAll: { featureA: true },
                test: function () {}
            });

            assert.equals(context.contexts.length, 0);
        },

        "aliases requiresSupportFor as requiresSupportForAll": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                requiresSupportFor: { featureA: true },
                test: function () {}
            });

            assert.equals(context.requiresSupportForAll, { featureA: true });
        },

        "does not use requiresSupportFor as context": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                requiresSupportFor: { featureA: true },
                test: function () {}
            });

            assert.equals(context.contexts.length, 0);
        },

        "keeps reference to requiresSupportForAny": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                requiresSupportForAny: { featureA: true },
                test: function () {}
            });

            assert.equals(context.requiresSupportForAny, { featureA: true });
        },

        "does not use requiresSupportForAny as context": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                requiresSupportForAny: { featureA: true },
                test: function () {}
            });

            assert.equals(context.contexts.length, 0);
        },

        "sets requiresSupportForAll on nested context": function () {
            var setUp = function () {};

            var context = bTestCase("Name", {
                someContext: {
                    requiresSupportForAny: { featureA: true},
                    test: function () {}
                }
            });

            var ctx = context.contexts[0];
            assert.equals(ctx.requiresSupportForAny, { featureA: true });
            assert.equals(ctx.contexts.length, 0);
        }
    });

    helper.testCase("TestContextTestDeferredTest", {
        "sets deferred flag when name starts with //": function () {
            var context = bTestCase("Name", {
                "//test": function () {}
            });

            assert(context.tests[0].deferred);
        },

        "sets deferred flag when test is a string": function () {
            var context = bTestCase("Name", {
                "test": "Later, peeps"
            });

            assert(context.tests[0].deferred);
        },

        "uses deferred test string as comment": function () {
            var context = bTestCase("Name", {
                "test": "Later, peeps"
            });

            assert.equals(context.tests[0].comment, "Later, peeps");
        },

        "sets deferred flag name starts with white-space and //": function () {
            var context = bTestCase("Name", {
                "   // test": function () {}
            });

            assert(context.tests[0].deferred);
        },

        "cleans cruft from name": function () {
            var context = bTestCase("Name", {
                "   // test": function () {}
            });

            assert.equals(context.tests[0].name, "test");
        },

        "defers entire context": function () {
            var context = bTestCase("Name", {
                "// up next": {
                    "cool feature A": function () {},
                    "cool feature B": function () {},
                    "cool feature C": function () {}
                }
            });

            var ctx = context.contexts[0];
            assert.equals(ctx.name, "up next");
            assert(ctx.tests[0].deferred);
            assert(ctx.tests[1].deferred);
            assert(ctx.tests[2].deferred);
        },

        "defers nested context": function () {
            var context = bTestCase("//Name", {
                "up next": {
                    "cool feature A": function () {},
                    "cool feature B": function () {},
                    "cool feature C": function () {}
                }
            });

            var ctx = context.contexts[0];
            assert(ctx.deferred);
            assert(ctx.tests[0].deferred);
            assert(ctx.tests[1].deferred);
            assert(ctx.tests[2].deferred);
        }

    });

    helper.testCase("AsyncTestContextTest", {
        "makes context promise": function () {
            var testCase = bTestCase("Some test", function () {});

            assert.equals(typeof testCase.then, "function");
            assert.defined(testCase.name);
            refute.defined(testCase.tests);
            refute.defined(testCase.setUp);
            refute.defined(testCase.tearDown);
        },

        "gives context promise name": function () {
            var testCase = bTestCase("Some test", function () {});

            assert.equals(testCase.name, "Some test");
        },

        "calls async context with run argument": function () {
            var spy = sinon.spy();
            var testCase = bTestCase("Some test", spy);

            assert(spy.calledOnce);
            assert.isFunction(spy.args[0][0]);
        },

        "calling run should resolve promise": function (done) {
            var spy = sinon.spy();

            bTestCase("Some test", spy).then(done);

            spy.args[0][0]({});
        },

        "resolves promise with test context data": function (done) {
            var setUp = function () {};
            var testFn = function () {};

            var testCase = bTestCase("Some test", function (run) {
                run({
                    setUp: setUp,
                    testSomething: testFn
                });
            });

            testCase.then(done(function (ctx) {
                assert.isObject(ctx);
                assert.equals(ctx.name, "Some test");
                assert.equals(ctx.tests.length, 1);
                assert.equals(ctx.tests[0].name, "testSomething");
                assert.equals(ctx.tests[0].func, testFn);
                assert.equals(ctx.setUp, setUp);
            }));
        },

        "passes deferred context promise to create event": function () {
            var context;
            testContext.on("create", function (ctx) { context = ctx; });

            var promise = bTestCase("Some spec", function (run) {
                run({ "Does stuff": function () {} });
            });

            assert.same(context, promise);
        },

        "does not pass context to create event when it resolves": function () {
            var listener = sinon.spy();
            testContext.on("create", listener);

            var promise = bTestCase("Some spec", function (run) {
                run({ "Does stuff": function () {} });
            });

            assert(listener.calledOnce,
                   listener.printf("Expected once, but was called %c"));
        }
    });

    helper.testCase("FocusedTestTest", {
        "does not be focused by default": function () {
            var testCase = bTestCase("Some test", {
                "focus here": function () {}
            });

            refute(testCase.tests[0].focused);
        },

        "marks test as focused when starting with =>": function () {
            var testCase = bTestCase("Some test", {
                "=> focus here": function () {}
            });

            assert(testCase.focused);
        },

        "marks test's containing context as focused": function () {
            var testCase = bTestCase("Some test", {
                "=> focus here": function () {}
            });

            assert(testCase.tests[0].focused);
        },

        "marks all test's containing contexts as focused": function () {
            var testCase = bTestCase("Some test", {
                "nested": {
                    "=> focus here": function () {}
                }
            });

            assert(testCase.focused);
            assert(testCase.contexts[0].focused);
            assert(testCase.contexts[0].tests[0].focused);
        },

        "does not mark all test's sibling tests as focused": function () {
            var testCase = bTestCase("Some test", {
                "nested": {
                    "=> focus here": function () {},
                    "not here": function () {}
                }
            });

            assert.equals(testCase.contexts[0].tests[1].name, "not here");
            refute(testCase.contexts[0].tests[1].focused);
        },

        "marks all tests in context as focused": function () {
            var testCase = bTestCase("Some test", {
                "=> nested": {
                    "focus here": function () {},
                    "not here": function () {}
                }
            });

            assert(testCase.contexts[0].tests[0].focused);
            assert(testCase.contexts[0].tests[1].focused);
        },

        "marks all nested tests in context as focused": function () {
            var testCase = bTestCase("Some test", {
                "=> nested": {
                    "focus here": function () {},
                    "and here": function () {},
                    "more nesting": {
                        "focus here": function () {}
                    }
                }
            });

            assert(testCase.contexts[0].contexts[0].tests[0].focused);
        },

        "marks all tests in test case as focused": function () {
            var testCase = bTestCase("=> Some test", {
                "nested": {
                    "focus here": function () {},
                    "not here": function () {}
                }
            });

            assert(testCase.contexts[0].tests[0].focused);
            assert(testCase.contexts[0].tests[1].focused);
        },

        "does not mark nested tests focused when one is focused": function () {
            var testCase = bTestCase("Some test", {
                "nested": {
                    "=> focus here": function () {},
                    "not here": function () {},
                    "more nesting": {
                        "not here please": function () {}
                    }
                }
            });

            refute(testCase.contexts[0].contexts[0].tests[0].focused);
        },

        "strips rocket from context name": function () {
            var testCase = bTestCase("Some test", {
                "=> nested": {
                    "focus here": function () {},
                    "and here": function () {}
                }
            });

            assert.equals(testCase.contexts[0].name, "nested");
        },

        "strips rocket from focused test name": function () {
            var testCase = bTestCase("Some test", {
                "=> focus here": function () {}
            });

            assert.equals(testCase.tests[0].name, "focus here");
        },

        "strips rocket and surrounding white-space from name": function () {
            var testCase = bTestCase("Some test", {
                "   =>  focus here": function () {}
            });

            assert.equals(testCase.tests[0].name, "focus here");
        }
    });
});
