if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        testContext: require("buster-test/test-context")
    };
}

testCase("TestContextTest", {
    "should return object": function () {
        var context = buster.testContext.create("Name", {});

        buster.assert.isObject(context);
    },

    "should have name property": function () {
        var context = buster.testContext.create("Name", {});

        buster.assert.equals("Name", context.name);
    }
});

testCase("TestContextTestsTest", {
    tearDown: function () {
        buster.testContext.setUpName = "setUp";
        buster.testContext.contextSetUpName = "contextSetUp";
        buster.testContext.tearDownName = "tearDown";
        buster.testContext.contextTearDownName = "contextTearDown";
    },

    "should get tests": function () {
        var test = function () {};
        var context = buster.testContext.create("Name", {
            "test 1": test
        });

        buster.assert.equals(1, context.tests().length);
        buster.assert.equals("test 1", context.tests()[0].name);
        buster.assert.equals(test, context.tests()[0].func);
    },

    "should exclude setUp": function () {
        var context = buster.testContext.create("Name", {
            setUp: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude tearDown": function () {
        var context = buster.testContext.create("Name", {
            tearDown: function () {}
        });

        buster.assert.equals(0, context.tests());
    },

    "should exclude non-function property": function () {
        var context = buster.testContext.create("Name", {
            id: 42
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude custom setUp and tearDown": function () {
        buster.testContext.setUpName = "before";
        buster.testContext.tearDownName = "after";

        var context = buster.testContext.create("Name", {
            before: function () {},
            after: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude instance-custom setUp and tearDown": function () {
        var context = buster.testContext.create("Name", {
            before: function () {},
            after: function () {}
        });

        context.setUpName = "before";
        context.tearDownName = "after";

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude contextSetUp": function () {
        var context = buster.testContext.create("Name", {
            contextSetUp: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude contextTearDown": function () {
        var context = buster.testContext.create("Name", {
            contextTearDown: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude custom contextSetUp": function () {
        buster.testContext.contextSetUpName = "beforeContext";

        var context = buster.testContext.create("Name", {
            beforeContext: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude custom contextTearDown": function () {
        buster.testContext.contextTearDownName = "afterContext";

        var context = buster.testContext.create("Name", {
            afterContext: function () {}
        });

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude instance-custom contextSetUp": function () {
        var context = buster.testContext.create("Name", {
            beforeContext: function () {}
        });

        context.contextSetUpName = "beforeContext";

        buster.assert.equals(0, context.tests().length);
    },

    "should exclude instance-custom contextTearDown": function () {
        var context = buster.testContext.create("Name", {
            afterContext: function () {}
        });

        context.contextTearDownName = "afterContext";

        buster.assert.equals(0, context.tests().length);
    }
});

testCase("TestContextContextsTest", {
    "should get contexts as list of context objects": function () {
        var context = buster.testContext.create("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts();

        buster.assert.equals(1, contexts.length);
        buster.assert.equals("doingIt", contexts[0].name);
    },

    "should get contexts with context as parent": function () {
        var context = buster.testContext.create("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts();

        buster.assert.equals(context, contexts[0].parent);
    },

    "should not include null properties": function () {
        var context = buster.testContext.create("Name", {
            test: function () {},
            doingIt: null
        });

        var contexts = context.contexts();

        buster.assert.equals(0, contexts.length);
    },

    "should get tests from nested context": function () {
        var context = buster.testContext.create("Name", {
            someContext: { test: function () {} }
        });

        var tests = context.contexts()[0].tests();

        buster.assert.equals(1, tests.length);
        buster.assert.equals("test", tests[0].name);
    }
});

testCase("TestContextNameTest", {
    "should be name when no parent": function () {
        var context = buster.testContext.create("Name", {});

        buster.assert.equals(context.name, context.fullName());
    },

    "should include parent name": function () {
        var context = buster.testContext.create("Name", {
            doingIt: {}
        });

        var contexts = context.contexts();

        buster.assert.equals("Name doingIt", contexts[0].fullName());
    },

    "should include all parent's names": function () {
        var context = buster.testContext.create("Name", {
            doingIt: {
                slowly: {
                    yup: {}
                }
            }
        });

        var contexts = context.contexts()[0].contexts()[0].contexts();

        buster.assert.equals("Name doingIt slowly yup", contexts[0].fullName());
    }
});

testCase("TestFunctionNameTest", {
    "should include context's name": function () {
        var context = buster.testContext.create("Name", {
            test: function () {}
        });

        var test = context.tests()[0];

        buster.assert.equals("Name test", test.fullName());
    },

    "should include context's full name": function () {
        var context = buster.testContext.create("Name", {
            doingIt: { slowly: function () {} }
        });

        var test = context.contexts()[0].tests()[0];

        buster.assert.equals("Name doingIt slowly", test.fullName());
    }
});

testCase("TestContextSetUpTearDownTest", {
    tearDown: function () {
        buster.testContext.setUpName = "setUp";
        buster.testContext.contextSetUpName = "contextSetUp";
        buster.testContext.tearDownName = "tearDown";
        buster.testContext.contextTearDownName = "contextTearDown";
    },

    "should keep reference to setUp method": function () {
        var setUp = function () {};

        var context = buster.testContext.create("Name", {
            setUp: setUp,
            test: function () {}
        });

        buster.assert.equals(setUp, context.getSetUp());
    },

    "should keep reference to tearDown method": function () {
        var tearDown = function () {};

        var context = buster.testContext.create("Name", {
            tearDown: tearDown,
            test: function () {}
        });

        buster.assert.equals(tearDown, context.getTearDown());
    },

    "should keep reference to context setUp method": function () {
        var contextSetUp = function () {};

        var context = buster.testContext.create("Name", {
            contextSetUp: contextSetUp,
            test: function () {}
        });

        buster.assert.equals(contextSetUp, context.getContextSetUp());
    },

    "should keep reference to tearDown method": function () {
        var contextTearDown = function () {};

        var context = buster.testContext.create("Name", {
            contextTearDown: contextTearDown,
            test: function () {}
        });

        buster.assert.equals(contextTearDown, context.getContextTearDown());
    },

    "should keep reference to setUp and tearDown methods with custom names": function () {
        buster.testContext.setUpName = "before";
        buster.testContext.tearDownName = "after";
        buster.testContext.contextSetUpName = "beforeContext";
        buster.testContext.contextTearDownName = "afterContext";

        var context = buster.testContext.create("Name", {
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
        var context = buster.testContext.create("Name", {
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
