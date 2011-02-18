if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        testCase: require("buster-test/test-case")
    };
}

testCase("BusterTestCaseTest", {
    tearDown: function () {
        delete buster.testCase.listeners;
    },

    "should throw without name": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase();
        });
    },

    "should throw if name is not a string": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase({});
        });
    },

    "should throw if name is empty": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase("");
        });
    },

    "should throw without tests": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase("Some test");
        });
    },

    "should throw if tests is not an object": function () {
        buster.assert.exception(function () {
            var testCase = buster.testCase("Some test", function () {});
        });
    },

    "should throw if tests is null": function () {
        buster.assert.exception(function () {
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

        buster.assert.isObject(testCase);
        buster.assert.equals("Some test", testCase.name);
        buster.assert.equals(1, testCase.tests().length);
        buster.assert.equals("testSomething", testCase.tests()[0].name);
        buster.assert.equals(test, testCase.tests()[0].func);
        buster.assert.equals(setUp, testCase.getSetUp());
    },

    "should emit create event when a test case is created": function () {
        var callback = sinon.spy();
        buster.testCase.on("create", callback);

        var testCase = buster.testCase("Some test", {});

        buster.assert(callback.calledOnce);
        buster.assert.equals(testCase, callback.args[0][0]);
    }
});

testCase("TestCaseContextTest", {
    "should have name property": function () {
        var context = buster.testCase("Name", {});

        buster.assert.equals("Name", context.name);
    }
});

testCase("TestContextTestsTest", {
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

        buster.assert.equals(1, context.tests().length);
        buster.assert.equals("test 1", context.tests()[0].name);
        buster.assert.equals(test, context.tests()[0].func);
    },

    "should exclude setUp": function () {
        var context = buster.testCase("Name", {
            setUp: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude tearDown": function () {
        var context = buster.testCase("Name", {
            tearDown: function () {}
        });

        buster.assert.equals(0, context.tests());
    },

    "should exclude non-function property": function () {
        var context = buster.testCase("Name", {
            id: 42
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude custom setUp and tearDown": function () {
        buster.testCase.context.setUpName = "before";
        buster.testCase.context.tearDownName = "after";

        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude instance-custom setUp and tearDown": function () {
        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {}
        });

        context.setUpName = "before";
        context.tearDownName = "after";

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude contextSetUp": function () {
        var context = buster.testCase("Name", {
            contextSetUp: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude contextTearDown": function () {
        var context = buster.testCase("Name", {
            contextTearDown: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude custom contextSetUp": function () {
        buster.testCase.context.contextSetUpName = "beforeContext";

        var context = buster.testCase("Name", {
            beforeContext: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude custom contextTearDown": function () {
        buster.testCase.context.contextTearDownName = "afterContext";

        var context = buster.testCase("Name", {
            afterContext: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude instance-custom contextSetUp": function () {
        var context = buster.testCase("Name", {
            beforeContext: function () {}
        });

        context.contextSetUpName = "beforeContext";

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude instance-custom contextTearDown": function () {
        var context = buster.testCase("Name", {
            afterContext: function () {}
        });

        context.contextTearDownName = "afterContext";

        buster.assert.equals(0, context.tests().length);
    }
});

testCase("TestContextContextsTest", {
    "should get contexts as list of context objects": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts();

        buster.assert.equals(1, contexts.length);
        buster.assert.equals("doingIt", contexts[0].name);
    },

    "should get contexts with context as parent": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts();

        buster.assert.equals(context, contexts[0].parent);
    },

    "should not include null properties": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: null
        });

        var contexts = context.contexts();

        buster.assert.equals(0, contexts.length);
    },

    "should get tests from nested context": function () {
        var context = buster.testCase("Name", {
            someContext: { test: function () {} }
        });

        var tests = context.contexts()[0].tests();

        buster.assert.equals(1, tests.length);
        buster.assert.equals("test", tests[0].name);
    }
});

testCase("TestContextSetUpTearDownTest", {
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

        buster.assert.equals(setUp, context.getSetUp());
    },

    "should keep reference to tearDown method": function () {
        var tearDown = function () {};

        var context = buster.testCase("Name", {
            tearDown: tearDown,
            test: function () {}
        });

        buster.assert.equals(tearDown, context.getTearDown());
    },

    "should keep reference to context setUp method": function () {
        var contextSetUp = function () {};

        var context = buster.testCase("Name", {
            contextSetUp: contextSetUp,
            test: function () {}
        });

        buster.assert.equals(contextSetUp, context.getContextSetUp());
    },

    "should keep reference to tearDown method": function () {
        var contextTearDown = function () {};

        var context = buster.testCase("Name", {
            contextTearDown: contextTearDown,
            test: function () {}
        });

        buster.assert.equals(contextTearDown, context.getContextTearDown());
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

        buster.assert.isFunction(context.getSetUp());
        buster.assert.isFunction(context.getTearDown());
        buster.assert.isFunction(context.getContextSetUp());
        buster.assert.isFunction(context.getContextTearDown());
    },

    "should keep reference to setUp and tearDown methods with instance-level custom names": function () {
        var context = buster.testCase("Name", {
            before: function () {},
            after: function () {},
            beforeContext: function () {},
            afterContext: function () {},
            test: function () {}
        });

        context.setUpName = "before";
        context.tearDownName = "after";
        context.contextSetUpName = "beforeContext";
        context.contextTearDownName = "afterContext";

        buster.assert.isFunction(context.getSetUp());
        buster.assert.isFunction(context.getTearDown());
        buster.assert.isFunction(context.getContextSetUp());
        buster.assert.isFunction(context.getContextTearDown());
    }
});
