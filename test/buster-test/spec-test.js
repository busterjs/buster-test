if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        spec: require("buster-test/spec")
    };
}

testCase("SpecTest", {
    tearDown: function () {
        delete buster.spec.listeners;
    },

    "should throw without name": function () {
        buster.assert.exception(function () {
            var spec = buster.spec();
        });
    },

    "should throw if name is not a string": function () {
        buster.assert.exception(function () {
            var spec = buster.spec({});
        });
    },

    "should throw if name is empty": function () {
        buster.assert.exception(function () {
            var spec = buster.spec("");
        });
    },

    "should throw without spec": function () {
        buster.assert.exception(function () {
            var spec = buster.spec("Some test");
        });
    },

    "should throw if specs is not a function": function () {
        buster.assert.exception(function () {
            var spec = buster.spec("Some test", {});
        });
    },

    "should return context object": function () {
        var spec = buster.spec("Some test", function () {});

        buster.assert.isObject(spec);
        buster.assert.equals("Some test", spec.name);
        buster.assert.equals(0, spec.tests().length);
        buster.assert.isUndefined(spec.getSetUp());
    },

    "should emit create event when a spec is created": function () {
        var callback = sinon.spy();
        buster.spec.on("create", callback);

        var spec = buster.spec("Some test", function () {});

        buster.assert(callback.calledOnce);
        buster.assert.equals(spec, callback.args[0][0]);
    }
});

testCase("SpecCallbackTest", {
    setUp: function () {
        this.setUpName = buster.spec.setUpName;
        this.contextSetUpName = buster.spec.contextSetUpName;
        this.tearDownName = buster.spec.tearDownName;
        this.contextTearDownName = buster.spec.contextTearDownName;
    },

    tearDown: function () {
        buster.spec.setUpName = this.setUpName;
        buster.spec.contextSetUpName = this.contextSetUpName;
        buster.spec.tearDownName = this.tearDownName;
        buster.spec.contextTearDownName = this.contextTearDownName;
    },

    "should invoke spec context callback with a should function": function () {
        var contextCallback = sinon.spy();

        var spec = buster.spec("Stuff", contextCallback);

        buster.assert(contextCallback.calledOnce);
        buster.assert.isFunction(contextCallback.args[0][0]);
    },

    "should add test function by calling should": function () {
        var test = function () {};
        var contextCallback = sinon.stub().yields("do it", test);

        var spec = buster.spec("Stuff", contextCallback);

        buster.assert.equals(1, spec.tests().length);
        buster.assert.equals("do it", spec.tests()[0].name);
        buster.assert.equals(test, spec.tests()[0].func);
    },

    "should add setUp function by calling this.before": function () {
        var setUp = function () {};

        var spec = buster.spec("Stuff", function (should) {
            this.before(setUp);
        });

        buster.assert.equals(setUp, spec.getSetUp());
    },

    "should add tearDown function by calling this.after": function () {
        var tearDown = function () {};

        var spec = buster.spec("Stuff", function (should) {
            this.after(tearDown);
        });

        buster.assert.equals(tearDown, spec.getTearDown());
    },

    "should add contextSetUp function by calling this.beforeSpec": function () {
        var contextSetUp = function () {};

        var spec = buster.spec("Stuff", function (should) {
            this.beforeSpec(contextSetUp);
        });

        buster.assert.equals(contextSetUp, spec.getContextSetUp());
    },

    "should add contextTearDown function by calling this.afterSpec": function () {
        var contextTearDown = function () {};

        var spec = buster.spec("Stuff", function (should) {
            this.afterSpec(contextTearDown);
        });

        buster.assert.equals(contextTearDown, spec.getContextTearDown());
    },

    "should add setUp function by calling custom method on this": function () {
        var setUp = function () {};
        buster.spec.setUpName = "startWith";

        var spec = buster.spec("Stuff", function (should) {
            this.startWith(setUp);
        });

        buster.assert.equals(setUp, spec.getSetUp());
    },

    "should add tearDown function by calling custom method on this": function () {
        var tearDown = function () {};
        buster.spec.tearDownName = "endWith";

        var spec = buster.spec("Stuff", function (should) {
            this.endWith(tearDown);
        });

        buster.assert.equals(tearDown, spec.getTearDown());
    },

    "should add contextSetUp function by calling custom method on this": function () {
        var contextSetUp = function () {};
        buster.spec.contextSetUpName = "startSpecWith";

        var spec = buster.spec("Stuff", function (should) {
            this.startSpecWith(contextSetUp);
        });

        buster.assert.equals(contextSetUp, spec.getContextSetUp());
    },

    "should add contextTearDown function by calling custom method on this": function () {
        var contextTearDown = function () {};
        buster.spec.contextTearDownName = "endSpecWith";

        var spec = buster.spec("Stuff", function (should) {
            this.endSpecWith(contextTearDown);
        });

        buster.assert.equals(contextTearDown, spec.getContextTearDown());
    }
});
