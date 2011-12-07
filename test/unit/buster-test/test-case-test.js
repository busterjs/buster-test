if (typeof require != "undefined") {
    var sinon = require("sinon");

    var buster = {
        assertions: require("buster-assertions"),
        testCase: require("../../../lib/buster-test/test-case")
    };

    buster.util = require("buster-util");
}

var assert = buster.assertions.assert;
var refute = buster.assertions.refute;

buster.util.testCase("BusterTestCaseTest", {
    tearDown: function () {
        delete buster.testCase.listeners;
    },

    "should throw without name": function () {
        assert.exception(function () {
            var testCase = buster.testCase();
        });
    },

    "should throw if name is not a string": function () {
        assert.exception(function () {
            var testCase = buster.testCase({});
        });
    },

    "should throw if name is empty": function () {
        assert.exception(function () {
            var testCase = buster.testCase("");
        });
    },

    "should throw without tests": function () {
        assert.exception(function () {
            var testCase = buster.testCase("Some test");
        });
    },

    "should throw if tests is not an object": function () {
        assert.exception(function () {
            var testCase = buster.testCase("Some test", function () {});
        });
    },

    "should throw if tests is null": function () {
        assert.exception(function () {
            var testCase = buster.testCase("Some test", null);
        });
    },

    "should return context object": function () {
        var setUp = function () {};
        var test = function () {};

        var testCase = buster.testCase("Some test", {
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

    "should call create callback when a test case is created": function () {
        buster.testCase.onCreate = sinon.spy();

        var testCase = buster.testCase("Some test", {});

        assert(buster.testCase.onCreate.calledOnce);
        assert.equals(buster.testCase.onCreate.args[0][0], testCase);
    }
});

buster.util.testCase("TestCaseContextTest", {
    "should have name property": function () {
        var context = buster.testCase("Name", {});

        assert.equals(context.name, "Name");
    }
});

buster.util.testCase("TestContextTestsTest", {
    tearDown: function () {
        buster.testCase.context.setUpName = "setUp";
        buster.testCase.context.contextSetUpName = "contextSetUp";
        buster.testCase.context.tearDownName = "tearDown";
        buster.testCase.context.contextTearDownName = "contextTearDown";
    },

    "should get tests": function () {
        var test = function () {};
        var context = buster.testCase("Name", {
            "test 1": test
        });

        assert.equals(context.tests.length, 1);
        assert.equals(context.tests[0].name, "test 1");
        assert.equals(context.tests[0].func, test);
    },

    "should exclude setUp": function () {
        var context = buster.testCase("Name", {
            setUp: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude tearDown": function () {
        var context = buster.testCase("Name", {
            tearDown: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude non-function property": function () {
        var context = buster.testCase("Name", {
            id: 42
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude custom setUp and tearDown": function () {
        buster.testCase.context.setUpName = "before";
        buster.testCase.context.tearDownName = "after";

        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude custom setUp and tearDown from nested context": function () {
        buster.testCase.context.setUpName = "before";
        buster.testCase.context.tearDownName = "after";

        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {},
            context: {
                before: function () {},
                someTest: function () {}
            }
        });

        assert.equals(context.contexts[0].tests.length, 1);
        assert.equals(context.contexts[0].tests[0].name, "someTest");
    },

    "should exclude instance-custom setUp and tearDown": function () {
        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {}
        }, {
            setUpName: "before",
            tearDownName: "after"
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude instance-custom setUp and tearDown from nested context": function () {
        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {},
            context: {
                before: function () {},
                someTest: function () {}
            }
        }, {
            setUpName: "before",
            tearDownName: "after"
        });

        assert.equals(context.contexts[0].tests.length, 1);
        assert.equals(context.contexts[0].tests[0].name, "someTest");
    },

    "should exclude contextSetUp": function () {
        var context = buster.testCase("Name", {
            contextSetUp: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude contextTearDown": function () {
        var context = buster.testCase("Name", {
            contextTearDown: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude custom contextSetUp": function () {
        buster.testCase.context.contextSetUpName = "beforeContext";

        var context = buster.testCase("Name", {
            beforeContext: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude custom contextTearDown": function () {
        buster.testCase.context.contextTearDownName = "afterContext";

        var context = buster.testCase("Name", {
            afterContext: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude instance-custom contextSetUp": function () {
        var context = buster.testCase("Name", {
            beforeContext: function () {}
        }, {
            contextSetUpName: "beforeContext"
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude instance-custom contextSetUp in nested context": function () {
        var context = buster.testCase("Name", {
            beforeContext: function () {},
            context: {
                beforeContext: function () {},
                someTest: function () {}
            }
        }, {
            contextSetUpName: "beforeContext"
        });

        assert.equals(context.contexts[0].tests.length, 1);
    },

    "should exclude instance-custom contextTearDown": function () {
        var context = buster.testCase("Name", {
            afterContext: function () {}
        }, {
            contextTearDownName: "afterContext"
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude instance-custom contextSetUp in nested context": function () {
        var context = buster.testCase("Name", {
            afterContext: function () {},
            context: {
                afterContext: function () {},
                someTest: function () {}
            }
        }, {
            contextTearDownName: "afterContext"
        });

        assert.equals(context.contexts[0].tests.length, 1);
    },

    "should keep reference to parent context": function () {
        var context = buster.testCase("Name", {
            testIt: function () {}
        });

        assert.equals(context.tests[0].context, context);
    }
});

buster.util.testCase("TestContextContextsTest", {
    "should get contexts as list of context objects": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts;

        assert.equals(contexts.length, 1);
        assert.equals(contexts[0].name, "doingIt");
    },

    "should get contexts with context as parent": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts;

        assert.equals(contexts[0].parent, context);
    },

    "should not include null properties": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: null
        });

        var contexts = context.contexts;

        assert.equals(contexts.length, 0);
    },

    "should get tests from nested context": function () {
        var context = buster.testCase("Name", {
            someContext: { test: function () {} }
        });

        var tests = context.contexts[0].tests;

        assert.equals(tests.length, 1);
        assert.equals(tests[0].name, "test");
    },

    "should give contexts unique test case objects": function () {
        var context = buster.testCase("Name", {
            someContext: { test: function () {} }
        });

        var contexts = context.contexts;

        refute.same(contexts[0].testCase, context.testCase);
    }
});

buster.util.testCase("TestContextSetUpTearDownTest", {
    tearDown: function () {
        buster.testCase.context.setUpName = "setUp";
        buster.testCase.context.contextSetUpName = "contextSetUp";
        buster.testCase.context.tearDownName = "tearDown";
        buster.testCase.context.contextTearDownName = "contextTearDown";
    },

    "should keep reference to setUp method": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            setUp: setUp,
            test: function () {}
        });

        assert.equals(context.setUp, setUp);
    },

    "should keep reference to tearDown method": function () {
        var tearDown = function () {};

        var context = buster.testCase("Name", {
            tearDown: tearDown,
            test: function () {}
        });

        assert.equals(context.tearDown, tearDown);
    },

    "should keep reference to context setUp method": function () {
        var contextSetUp = function () {};

        var context = buster.testCase("Name", {
            contextSetUp: contextSetUp,
            test: function () {}
        });

        assert.equals(context.contextSetUp, contextSetUp);
    },

    "should keep reference to tearDown method": function () {
        var contextTearDown = function () {};

        var context = buster.testCase("Name", {
            contextTearDown: contextTearDown,
            test: function () {}
        });

        assert.equals(context.contextTearDown, contextTearDown);
    },

    "should keep reference to setUp and tearDown methods with custom names": function () {
        buster.testCase.context.setUpName = "before";
        buster.testCase.context.tearDownName = "after";
        buster.testCase.context.contextSetUpName = "beforeContext";
        buster.testCase.context.contextTearDownName = "afterContext";

        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {},
            beforeContext: function () {},
            afterContext: function () {},
            test: function () {}
        });

        assert.typeOf(context.setUp, "function");
        assert.typeOf(context.tearDown, "function");
        assert.typeOf(context.contextSetUp, "function");
        assert.typeOf(context.contextTearDown, "function");
    },

    "should keep reference to setUp and tearDown methods with instance-level custom names": function () {
        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {},
            beforeContext: function () {},
            afterContext: function () {},
            test: function () {}
        }, {
            setUpName: "before",
            tearDownName: "after",
            contextSetUpName: "beforeContext",
            contextTearDownName: "afterContext"
        });

        assert.typeOf(context.setUp, "function");
        assert.typeOf(context.tearDown, "function");
        assert.typeOf(context.contextSetUp, "function");
        assert.typeOf(context.contextTearDown, "function");
    }
});

buster.util.testCase("TestContextRequiresSupportTest", {
    "should keep reference to requiresSupportForAll": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAll: { featureA: true },
            test: function () {}
        });

        assert.equals(context.requiresSupportForAll, { featureA: true });
    },

    "should not use requiresSupportForAll as context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAll: { featureA: true },
            test: function () {}
        });

        assert.equals(context.contexts.length, 0);
    },

    "should alias requiresSupportFor as requiresSupportForAll": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportFor: { featureA: true },
            test: function () {}
        });

        assert.equals(context.requiresSupportForAll, { featureA: true });
    },

    "should not use requiresSupportFor as context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportFor: { featureA: true },
            test: function () {}
        });

        assert.equals(context.contexts.length, 0);
    },

    "should keep reference to requiresSupportForAny": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAny: { featureA: true },
            test: function () {}
        });

        assert.equals(context.requiresSupportForAny, { featureA: true });
    },

    "should not use requiresSupportForAny as context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAny: { featureA: true },
            test: function () {}
        });

        assert.equals(context.contexts.length, 0);
    },

    "should set requiresSupportForAll on nested context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            someContext: {
                requiresSupportForAny: { featureA: true},
                test: function () {}
            }
        });

        assert.equals(context.contexts[0].requiresSupportForAny, { featureA: true });
        assert.equals(context.contexts[0].contexts.length, 0);
    }
});

buster.util.testCase("TestContextTestDeferredTest", {
    "should set deferred flag when name starts with //": function () {
        var context = buster.testCase("Name", {
            "//test": function () {}
        });

        assert(context.tests[0].deferred);
    },

    "should set deferred flag when test is a string": function () {
        var context = buster.testCase("Name", {
            "test": "Later, peeps"
        });

        assert(context.tests[0].deferred);
    },

    "should use deferred test string as comment": function () {
        var context = buster.testCase("Name", {
            "test": "Later, peeps"
        });

        assert.equals(context.tests[0].comment, "Later, peeps");
    },

    "should set deferred flag when // is the first non-white-space characters in name": function () {
        var context = buster.testCase("Name", {
            "   // test": function () {}
        });

        assert(context.tests[0].deferred);
    },

    "should clean cruft from name": function () {
        var context = buster.testCase("Name", {
            "   // test": function () {}
        });

        assert.equals(context.tests[0].name, "test");
    },

    "should defer entire context": function () {
        var context = buster.testCase("Name", {
            "// up next": {
                "cool feature A": function () {},
                "cool feature B": function () {},
                "cool feature C": function () {}
            }
        });

        var context = context.contexts[0];
        assert.equals(context.name, "up next");
        assert(context.tests[0].deferred);
        assert(context.tests[1].deferred);
        assert(context.tests[2].deferred);
    }
});
