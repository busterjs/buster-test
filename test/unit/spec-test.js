if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        describe: require("buster-test/spec")
    };
}

testCase("SpecTest", {
    tearDown: function () {
        delete buster.describe.listeners;
    },

    "should throw without name": function () {
        buster.assert.exception(function () {
            var spec = buster.describe();
        });
    },

    "should throw if name is not a string": function () {
        buster.assert.exception(function () {
            var spec = buster.describe({});
        });
    },

    "should throw if name is empty": function () {
        buster.assert.exception(function () {
            var spec = buster.describe("");
        });
    },

    "should throw without spec": function () {
        buster.assert.exception(function () {
            var spec = buster.describe("Some test");
        });
    },

    "should throw if specs is not a function": function () {
        buster.assert.exception(function () {
            var spec = buster.describe("Some test", {});
        });
    },

    "should return context object": function () {
        var spec = buster.describe("Some test", function () {});

        buster.assert.isObject(spec);
        buster.assert.equals("Some test", spec.name);
        buster.assert.equals(0, spec.tests().length);
        buster.assert.isUndefined(spec.getSetUp());
    },

    "should emit create event when a spec is created": function () {
        var callback = sinon.spy();
        buster.describe.on("create", callback);

        var spec = buster.describe("Some test", function () {});

        buster.assert(callback.calledOnce);
        buster.assert.equals(spec, callback.args[0][0]);
    }
});

testCase("SpecCallbackTest", {
    setUp: function () {
        this.setUpName = buster.describe.context.setUpName;
        this.contextSetUpName = buster.describe.context.contextSetUpName;
        this.tearDownName = buster.describe.context.tearDownName;
        this.contextTearDownName = buster.describe.context.contextTearDownName;
    },

    tearDown: function () {
        buster.describe.context.setUpName = this.setUpName;
        buster.describe.context.contextSetUpName = this.contextSetUpName;
        buster.describe.context.tearDownName = this.tearDownName;
        buster.describe.context.contextTearDownName = this.contextTearDownName;
    },

    "should invoke spec context callback with a should function": function () {
        var contextCallback = sinon.spy();

        var spec = buster.describe("Stuff", contextCallback);
        spec.run();

        buster.assert(contextCallback.calledOnce);
        buster.assert.isFunction(contextCallback.args[0][0]);
    },

    "should add test function by calling should": function () {
        var test = function () {};
        var contextCallback = sinon.stub().yields("do it", test);

        var spec = buster.describe("Stuff", contextCallback);

        buster.assert.equals(1, spec.tests().length);
        buster.assert.equals("should do it", spec.tests()[0].name);
        buster.assert.equals(test, spec.tests()[0].func);
    },

    "should give test custom prefix": function () {
        var test = function () {};
        var contextCallback = sinon.stub().yields("do it", test);

        var spec = buster.describe("Stuff", contextCallback);
        spec.specPrefix = "";

        buster.assert.equals("do it", spec.tests()[0].name);
    },

    "should add setUp function by calling this.before": function () {
        var setUp = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.before(setUp);
        });

        buster.assert.equals(setUp, spec.getSetUp());
    },

    "should add tearDown function by calling this.after": function () {
        var tearDown = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.after(tearDown);
        });

        buster.assert.equals(tearDown, spec.getTearDown());
    },

    "should add contextSetUp function by calling this.beforeSpec": function () {
        var contextSetUp = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.beforeSpec(contextSetUp);
        });

        buster.assert.equals(contextSetUp, spec.getContextSetUp());
    },

    "should add contextTearDown function by calling this.afterSpec": function () {
        var contextTearDown = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.afterSpec(contextTearDown);
        });

        buster.assert.equals(contextTearDown, spec.getContextTearDown());
    },

    "should add setUp function by calling custom method on this": function () {
        var setUp = function () {};
        buster.describe.context.setUpName = "startWith";

        var spec = buster.describe("Stuff", function (should) {
            this.startWith(setUp);
        });

        buster.assert.equals(setUp, spec.getSetUp());
    },

    "should add tearDown function by calling custom method on this": function () {
        var tearDown = function () {};
        buster.describe.context.tearDownName = "endWith";

        var spec = buster.describe("Stuff", function (should) {
            this.endWith(tearDown);
        });

        buster.assert.equals(tearDown, spec.getTearDown());
    },

    "should add contextSetUp function by calling custom method on this": function () {
        var contextSetUp = function () {};
        buster.describe.context.contextSetUpName = "startSpecWith";

        var spec = buster.describe("Stuff", function (should) {
            this.startSpecWith(contextSetUp);
        });

        buster.assert.equals(contextSetUp, spec.getContextSetUp());
    },

    "should add contextTearDown function by calling custom method on this": function () {
        var contextTearDown = function () {};
        buster.describe.context.contextTearDownName = "endSpecWith";

        var spec = buster.describe("Stuff", function (should) {
            this.endSpecWith(contextTearDown);
        });

        buster.assert.equals(contextTearDown, spec.getContextTearDown());
    },

    "should add setUp function by calling custom method on instance": function () {
        var setUp = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.startWith(setUp);
        });

        spec.setUpName = "startWith";

        buster.assert.equals(setUp, spec.getSetUp());
    },

    "should add tearDown function by calling custom method on instance": function () {
        var tearDown = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.endWith(tearDown);
        });

        spec.tearDownName = "endWith";

        buster.assert.equals(tearDown, spec.getTearDown());
    },

    "should add contextSetUp function by calling custom method on instance": function () {
        var contextSetUp = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.startSpecWith(contextSetUp);
        });

        spec.contextSetUpName = "startSpecWith";

        buster.assert.equals(contextSetUp, spec.getContextSetUp());
    },

    "should add contextTearDown function by calling custom method on instance": function () {
        var contextTearDown = function () {};

        var spec = buster.describe("Stuff", function (should) {
            this.endSpecWith(contextTearDown);
        });

        spec.contextTearDownName = "endSpecWith";

        buster.assert.equals(contextTearDown, spec.getContextTearDown());
    }
});

testCase("SpecContextTestsTest", {
    "should extract only test functions": function () {
        var funcs = [function () {}, function () {}, function () {}];

        var spec = buster.describe("Spec", function (should) {
            this.before(function () {});
            this.after(function () {});

            should("test1", funcs[0]);
            should("test2", funcs[1]);
            should("test3", funcs[2]);
        });

        var tests = spec.tests();

        buster.assert.equals(3, tests.length);
        buster.assert.equals("should test1", tests[0].name);
        buster.assert.equals(funcs[0], tests[0].func);
        buster.assert.equals("should test2", tests[1].name);
        buster.assert.equals(funcs[1], tests[1].func);
    },

    "should keep reference to parent context": function () {
        var spec = buster.describe("Spec", function (should) {
            should("test1", function () {});
        });

        var tests = spec.tests();

        buster.assert.equals(spec, tests[0].context);
    }
});

testCase("SpecContextContextsTest", {
    "should get contexts as list of context objects": function () {
        var spec = buster.describe("Spec", function (should) {
            this.describe("Some context", function (should) {});
        });

        var contexts = spec.contexts();

        buster.assert.equals(1, contexts.length);
        buster.assert.equals("Some context", contexts[0].name);
    },

    "should get contexts with current context as parent": function () {
        var spec = buster.describe("Name", function (should) {
            this.describe("doingIt", function () {});
        });

        var contexts = spec.contexts();

        buster.assert.equals(spec, contexts[0].parent);
    },

    "should fail for non-function contexts": function () {
        var spec = buster.describe("Name", function (should) {
            var self = this;

            buster.assert.exception(function () {
                self.context("doingIt", {});
            });
        });

        spec.run();
    },

    "should get tests from nested context": function () {
        var spec = buster.describe("Name", function (should) {
            this.describe("someContext", function (should) {
                should("do it", function () {});
            });
        });

        var tests = spec.contexts()[0].tests();

        buster.assert.equals(1, tests.length);
        buster.assert.equals("should do it", tests[0].name);
    },

    "should give contexts different testCase instances": function () {
        var spec = buster.describe("Name", function (should) {
            this.describe("someContext", function (should) {});
        });

        var contexts = spec.contexts();

        buster.assert.notEquals(spec.testCase, contexts[0].testCase);
    },

    "should return the same context instance each time": function () {
        var context = buster.describe("Name", function (should) {
            this.describe("someContext", function () {});
        });

        var contexts = context.contexts();
        var contexts2 = context.contexts();

        buster.assert.same(contexts, contexts2);
    }
});
