if (typeof require != "undefined") {
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        spec: require("../../../lib/buster-test/spec")
    };

    buster.util = require("buster-util");
}

buster.util.testCase("SpecTest", {
    "should throw without name": function () {
        buster.assert.exception(function () {
            var spec = buster.spec.describe();
        });
    },

    "should throw if name is not a string": function () {
        buster.assert.exception(function () {
            var spec = buster.spec.describe({});
        });
    },

    "should throw if name is empty": function () {
        buster.assert.exception(function () {
            var spec = buster.spec.describe("");
        });
    },

    "should throw without spec": function () {
        buster.assert.exception(function () {
            var spec = buster.spec.describe("Some test");
        });
    },

    "should throw if specs is not a function": function () {
        buster.assert.exception(function () {
            var spec = buster.spec.describe("Some test", {});
        });
    },

    "should return context object": function () {
        var spec = buster.spec.describe("Some test", function () {});

        buster.assert.isObject(spec);
        buster.assert.equals("Some test", spec.name);
        buster.assert.equals(0, spec.tests.length);
        buster.assert.isUndefined(spec.setUp);
    },

    "should call create callback when a spec is created": function () {
        buster.spec.describe.onCreate = sinon.spy();

        var spec = buster.spec.describe("Some test", function () {});

        buster.assert(buster.spec.describe.onCreate.calledOnce);
        buster.assert.equals(buster.spec.describe.onCreate.args[0][0], spec);
    }
});

buster.util.testCase("SpecCallbackTest", {
    "should add test function by calling should": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.should("do it", test);
        });

        buster.assert.equals(1, spec.tests.length);
        buster.assert.equals("should do it", spec.tests[0].name);
        buster.assert.equals(test, spec.tests[0].func);
    },

    "should add test function by calling this.should": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            this.should("do it", test);
        });

        buster.assert.equals(1, spec.tests.length);
        buster.assert.equals("should do it", spec.tests[0].name);
        buster.assert.equals(test, spec.tests[0].func);
    },

    "should convert shouldEventually test to deferred test": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.shouldEventually("do it", test);
        });

        buster.assert.equals("should do it", spec.tests[0].name);
        buster.assert(spec.tests[0].deferred);
    },

    "should convert this.shouldEventually test to deferred test": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            this.shouldEventually("do it", test);
        });

        buster.assert(spec.tests[0].deferred);
    },

    "should add setUp function by calling buster.spec.before": function () {
        var setUp = function () {};

        var spec = buster.spec.describe("Stuff", function (should) {
            buster.spec.before(setUp);
        });

        buster.assert.equals(setUp, spec.setUp);
    },

    "should add setUp function by calling this..before": function () {
        var setUp = function () {};

        var spec = buster.spec.describe("Stuff", function (should) {
            this.before(setUp);
        });

        buster.assert.equals(setUp, spec.setUp);
    },

    "should add tearDown function by calling buster.spec.after": function () {
        var tearDown = function () {};

        var spec = buster.spec.describe("Stuff", function (should) {
            buster.spec.after(tearDown);
        });

        buster.assert.equals(tearDown, spec.tearDown);
    },

    "should add tearDown function by calling this.after": function () {
        var tearDown = function () {};

        var spec = buster.spec.describe("Stuff", function (should) {
            this.after(tearDown);
        });

        buster.assert.equals(tearDown, spec.tearDown);
    }
});

buster.util.testCase("SpecContextTestsTest", {
    "should extract only test functions": function () {
        var funcs = [function () {}, function () {}, function () {}];

        var spec = buster.spec.describe("Spec", function (should) {
            buster.spec.before(function () {});
            buster.spec.after(function () {});

            buster.spec.should("test1", funcs[0]);
            buster.spec.should("test2", funcs[1]);
            buster.spec.should("test3", funcs[2]);
        });

        var tests = spec.tests;

        buster.assert.equals(3, tests.length);
        buster.assert.equals("should test1", tests[0].name);
        buster.assert.equals(funcs[0], tests[0].func);
        buster.assert.equals("should test2", tests[1].name);
        buster.assert.equals(funcs[1], tests[1].func);
    },

    "should keep reference to parent context": function () {
        var spec = buster.spec.describe("Spec", function (should) {
            buster.spec.should("test1", function () {});
        });

        var tests = spec.tests;

        buster.assert.equals(spec, tests[0].context);
    }
});

buster.util.testCase("SpecContextContextsTest", {
    "should get contexts as list of context objects": function () {
        var spec = buster.spec.describe("Spec", function (should) {
            buster.spec.describe("Some context", function (should) {});
        });

        buster.assert.equals(1, spec.contexts.length);
        buster.assert.equals("Some context", spec.contexts[0].name);
    },

    "should get contexts with current context as parent": function () {
        var spec = buster.spec.describe("Name", function (should) {
            buster.spec.describe("doingIt", function () {});
        });

        var contexts = spec.contexts;

        buster.assert.equals(spec, contexts[0].parent);
    },

    "should fail for non-function contexts": function () {
        var spec = buster.spec.describe("Name", function (should) {
            buster.assert.exception(function () {
                buster.spec.context("doingIt", {});
            });
        });

        spec.parse();
    },

    "should get tests from nested context": function () {
        var spec = buster.spec.describe("Name", function () {
            buster.spec.describe("someContext", function () {
                buster.spec.should("do it", function () {});
            });
        });

        var tests = spec.contexts[0].tests;
        buster.assert.equals(1, tests.length);
        buster.assert.equals("should do it", tests[0].name);
    },

    "should give contexts different buster.util.testCase instances": function () {
        var spec = buster.spec.describe("Name", function () {
            buster.spec.describe("someContext", function () {});
        });

        buster.assert.notSame(spec.testCase, spec.contexts[0].testCase);
    }
});

buster.util.testCase("SpecExposeTest", {
    setUp: function () {
        this.env = {};
        buster.spec.expose(this.env);
    },

    "should call exposed describe, should, shouldEventually, before and after": function () {
        var env = this.env;
        var test = function () {};
        var before = function () {};
        var after = function () {};
        var eventually = function () {};

        var spec = env.describe("Stuff", function () {
            env.before(before);
            env.after(after);
            env.should("do it", test);
            env.shouldEventually("sometime", eventually);
        });

        buster.assert.equals(2, spec.tests.length);
        buster.assert.equals("should do it", spec.tests[0].name);
        buster.assert.equals(test, spec.tests[0].func);
        buster.assert.equals(eventually, spec.tests[1].func);
        buster.assert.equals(before, spec.setUp);
        buster.assert.equals(after, spec.tearDown);
    },

    "should properly parse nested spec": function () {
        var env = this.env;

        var spec = env.describe("Sample spec", function () {
            env.should("pass simple assertion", function () {});
            env.should("fail when test throws", function () {});
            env.should("fail test", function () {});
            env.describe("nested", function () {
                env.should("do it", function () {});
            });
        });

        buster.assert.equals(spec.tests.length, 3);
        buster.assert.equals(spec.contexts.length, 1);
        buster.assert.equals(spec.contexts[0].tests.length, 1);
    }
});

buster.util.testCase("SpecRequiresSupportForTest", {
    "should set requiresSupportForAll property": function () {
        var spec = buster.spec.ifSupported({ "feature A": true }).describe("some cross-platform feature", function () {
        });

        buster.assert.equals(spec.requiresSupportForAll, { "feature A": true });
    },

    "should explicitly set requiresSupportForAll property": function () {
        var spec = buster.spec.ifAllSupported({ "feature A": true }).describe("some cross-platform feature", function () {
        });

        buster.assert.equals(spec.requiresSupportForAll, { "feature A": true });
    },

    "should set requiresSupportForAny property": function () {
        var spec = buster.spec.ifAnySupported({ "feature A": true }).describe("some cross-platform feature", function () {
        });

        buster.assert.equals(spec.requiresSupportForAny, { "feature A": true });
    },

    "should set requiresSupportForAny property on nested context": function () {
        var spec = buster.spec.describe("some cross-platform feature", function () {
            buster.spec.ifAnySupported({ "feature A": true }).describe("Something", function () {});
        });

        buster.assert.equals(spec.contexts[0].requiresSupportForAny, { "feature A": true });
    }
});
