if (typeof require != "undefined") {
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assertions: require("buster-assertions"),
        spec: require("../../../lib/buster-test/spec")
    };

    buster.util = require("buster-util");
}

var assert = buster.assertions.assert;
var refute = buster.assertions.refute;

buster.util.testCase("SpecTest", {
    "throws without name": function () {
        assert.exception(function () {
            var spec = buster.spec.describe();
        });
    },

    "throws if name is not a string": function () {
        assert.exception(function () {
            var spec = buster.spec.describe({});
        });
    },

    "throws if name is empty": function () {
        assert.exception(function () {
            var spec = buster.spec.describe("");
        });
    },

    "throws without spec": function () {
        assert.exception(function () {
            var spec = buster.spec.describe("Some test");
        });
    },

    "throws if specs is not a function": function () {
        assert.exception(function () {
            var spec = buster.spec.describe("Some test", {});
        });
    },

    "returns context object": function () {
        var spec = buster.spec.describe("Some test", function () {});

        assert.isObject(spec);
        assert.equals("Some test", spec.name);
        assert.equals(0, spec.tests.length);
        refute.defined(spec.setUp);
    },

    "calls create callback when a spec is created": function () {
        buster.spec.describe.onCreate = sinon.spy();

        var spec = buster.spec.describe("Some test", function () {});

        assert(buster.spec.describe.onCreate.calledOnce);
        assert.equals(buster.spec.describe.onCreate.args[0][0], spec);
    }
});

buster.util.testCase("SpecCallbackTest", {
    "adds test function by calling it": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.it("does it", test);
        });

        assert.equals(1, spec.tests.length);
        assert.equals("does it", spec.tests[0].name);
        assert.equals(test, spec.tests[0].func);
    },

    "adds test function by calling this.it": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            this.it("does it", test);
        });

        assert.equals(1, spec.tests.length);
        assert.equals("does it", spec.tests[0].name);
        assert.equals(test, spec.tests[0].func);
    },

    "converts test without callback to deferred test": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.it("does it");
        });

        assert.equals("does it", spec.tests[0].name);
        assert(spec.tests[0].deferred);
    },

    "converts test without callback but with comment to deferred": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.it("does it", "Cause it's important");
        });

        assert.equals("does it", spec.tests[0].name);
        assert(spec.tests[0].deferred);
        assert.equals(spec.tests[0].comment, "Cause it's important");
    },

    "makes deferred test with itEventually": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.itEventually("does it", function () {});
        });

        assert.equals("does it", spec.tests[0].name);
        assert(spec.tests[0].deferred);
    },

    "makes commented deferred test with itEventually": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.itEventually("does it", "Because it should", function () {});
        });

        assert(spec.tests[0].deferred);
        assert.equals("Because it should", spec.tests[0].comment);
        assert.isFunction(spec.tests[0].func);
    },

    "makes commented deferred test with itEventually with no function": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.itEventually("does it", "Because it should");
        });

        assert(spec.tests[0].deferred);
        assert.equals("Because it should", spec.tests[0].comment);
    },

    "converts this.itEventually test to deferred test": function () {
        var test = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            this.itEventually("does it", test);
        });

        assert(spec.tests[0].deferred);
    },

    "adds setUp function by calling buster.spec.before": function () {
        var setUp = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.before(setUp);
        });

        assert.equals(setUp, spec.setUp);
    },

    "adds setUp function by calling this..before": function () {
        var setUp = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            this.before(setUp);
        });

        assert.equals(setUp, spec.setUp);
    },

    "adds tearDown function by calling buster.spec.after": function () {
        var tearDown = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            buster.spec.after(tearDown);
        });

        assert.equals(tearDown, spec.tearDown);
    },

    "adds tearDown function by calling this.after": function () {
        var tearDown = function () {};

        var spec = buster.spec.describe("Stuff", function () {
            this.after(tearDown);
        });

        assert.equals(tearDown, spec.tearDown);
    }
});

buster.util.testCase("SpecContextTestsTest", {
    "extracts only test functions": function () {
        var funcs = [function () {}, function () {}, function () {}];

        var spec = buster.spec.describe("Spec", function () {
            buster.spec.before(function () {});
            buster.spec.after(function () {});

            buster.spec.it("test1", funcs[0]);
            buster.spec.it("test2", funcs[1]);
            buster.spec.it("test3", funcs[2]);
        });

        var tests = spec.tests;

        assert.equals(3, tests.length);
        assert.equals("test1", tests[0].name);
        assert.equals(funcs[0], tests[0].func);
        assert.equals("test2", tests[1].name);
        assert.equals(funcs[1], tests[1].func);
    },

    "keeps reference to parent context": function () {
        var spec = buster.spec.describe("Spec", function () {
            buster.spec.it("test1", function () {});
        });

        var tests = spec.tests;

        assert.equals(spec, tests[0].context);
    }
});

buster.util.testCase("SpecContextContextsTest", {
    "gets contexts as list of context objects": function () {
        var spec = buster.spec.describe("Spec", function () {
            buster.spec.describe("Some context", function () {});
        });

        assert.equals(1, spec.contexts.length);
        assert.equals("Some context", spec.contexts[0].name);
    },

    "gets contexts with current context as parent": function () {
        var spec = buster.spec.describe("Name", function () {
            buster.spec.describe("doingIt", function () {});
        });

        var contexts = spec.contexts;

        assert.equals(spec, contexts[0].parent);
    },

    "fails for non-function contexts": function () {
        var spec = buster.spec.describe("Name", function () {
            assert.exception(function () {
                buster.spec.context("doingIt", {});
            });
        });

        spec.parse();
    },

    "gets tests from nested context": function () {
        var spec = buster.spec.describe("Name", function () {
            buster.spec.describe("someContext", function () {
                buster.spec.it("does it", function () {});
            });
        });

        var tests = spec.contexts[0].tests;
        assert.equals(1, tests.length);
        assert.equals("does it", tests[0].name);
    },

    "gives contexts different buster.util.testCase instances": function () {
        var spec = buster.spec.describe("Name", function () {
            buster.spec.describe("someContext", function () {});
        });

        refute.same(spec.testCase, spec.contexts[0].testCase);
    }
});

buster.util.testCase("SpecExposeTest", {
    setUp: function () {
        this.env = {};
        buster.spec.expose(this.env);
    },

    "calls exposed describe, it, itEventually, before and after": function () {
        var env = this.env;
        var test = function () {};
        var before = function () {};
        var after = function () {};
        var eventually = function () {};

        var spec = env.describe("Stuff", function () {
            env.before(before);
            env.after(after);
            env.it("does it", test);
            env.itEventually("sometime", eventually);
        });

        assert.equals(2, spec.tests.length);
        assert.equals("does it", spec.tests[0].name);
        assert.equals(test, spec.tests[0].func);
        assert.equals("sometime", spec.tests[1].name);
        assert.equals(before, spec.setUp);
        assert.equals(after, spec.tearDown);
    },

    "parses nested spec properly": function () {
        var env = this.env;

        var spec = env.describe("Sample spec", function () {
            env.it("pass simple assertion", function () {});
            env.it("fail when test throws", function () {});
            env.it("fail test", function () {});
            env.describe("nested", function () {
                env.it("do it", function () {});
            });
        });

        assert.equals(spec.tests.length, 3);
        assert.equals(spec.contexts.length, 1);
        assert.equals(spec.contexts[0].tests.length, 1);
    }
});

buster.util.testCase("SpecRequiresSupportForTest", {
    "sets requiresSupportForAll property": function () {
        var spec = buster.spec.ifSupported({ "feature A": true }).describe("some cross-platform feature", function () {
        });

        assert.equals(spec.requiresSupportForAll, { "feature A": true });
    },

    "sets requiresSupportForAll property explicitly": function () {
        var spec = buster.spec.ifAllSupported({ "feature A": true }).describe("some cross-platform feature", function () {
        });

        assert.equals(spec.requiresSupportForAll, { "feature A": true });
    },

    "sets requiresSupportForAny property": function () {
        var spec = buster.spec.ifAnySupported({ "feature A": true }).describe("some cross-platform feature", function () {
        });

        assert.equals(spec.requiresSupportForAny, { "feature A": true });
    },

    "sets requiresSupportForAny property on nested context": function () {
        var spec = buster.spec.describe("some cross-platform feature", function () {
            buster.spec.ifAnySupported({ "feature A": true }).describe("Something", function () {});
        });

        assert.equals(spec.contexts[0].requiresSupportForAny, { "feature A": true });
    }
});
