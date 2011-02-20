var buster = buster || {};
var sys = {
    puts: function (str) {
        jstestdriver.console.log(str);
    },

    inspect: function (obj) {
        if (typeof obj == "fuction") {
            return obj.toString();
        } else {
            return JSON.stringify(obj);
        }
    }
};

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    buster.eventEmitter = require("buster-event-emitter");
    sys = require("sys");
}

(function () {
    function getAll(context, method, appendMethod) {
        var func, funcs = [], ctx = context;
        var getter = "get" + method.substr(0, 1).toUpperCase () + method.substr(1);

        while (ctx) {
            func = ctx[getter]();

            if (typeof func == "function") {
                funcs[appendMethod](func);
            }

            ctx = ctx.parent;
        }

        return funcs;
    }

    function callAllOn(funcs, ctx) {
        for (var i = 0, l = funcs.length; i < l; ++i) {
            funcs[i].call(ctx);
        }
    }

    buster.testRunner = buster.util.extend(buster.util.create(buster.eventEmitter), {
        failOnNoAssertions: true,

        run: function (context) {
            if (!context || !context.tests) {
                throw new TypeError("Pass in a test context to run");
            }

            this.emit("context:start", context);
            var tests = context.tests();
            var setUps = this.getSetUps(context);
            var tearDowns = this.getTearDowns(context);
            var error, event;

            for (var i = 0, l = tests.length; i < l; ++i) {
                error = this.runTest(tests[i], setUps, tearDowns);

                if (!error) {
                    error = this.checkAssertionCount(tests[i]);
                }

                delete context.testCase.expectedAssertions;
                this.emitResult(tests[i], error);
            }

            var contexts = context.contexts();

            for (i = 0, l = contexts.length; i < l; ++i) {
                this.run(contexts[i]);
            }

            this.emit("context:end", context);
        },

        runTest: function (test, setUps, tearDowns) {
            var error, testCase = test.context.testCase;

            try {
                this.emit("test:setUp", { name: test.name });
                callAllOn(setUps, testCase);
                this.emit("test:start", { name: test.name });
                test.func.call(testCase);
            } catch (e) {
                error = e;
            }

            try {
                this.emit("test:tearDown", { name: test.name });
                callAllOn(tearDowns, testCase);
            } catch (err) {
                error = err;
            }

            return error;
        },

        checkAssertionCount: function (test) {
            var assertionCount = this.assertionCount();

            try {
                if (this.failOnNoAssertions && assertionCount == 0) {
                    var zeroAssertError = new Error("0 assertions");
                    zeroAssertError.name = "AssertionError";
                    throw zeroAssertError;
                }
            } catch (err) {
                return err;
            }

            try {
                var expected = test.context.testCase.expectedAssertions;

                if (typeof expected == "number" && assertionCount != expected) {
                    var assertCountError = new Error("Expected " + expected +
                                                     " assertions, ran " +
                                                     assertionCount);
                    assertCountError.name = "AssertionError";
                    throw assertCountError;
                }
            } catch (err2) {
                return err2;
            }
        },

        emitResult: function (test, err) {
            if (err) {
                var type = err.name == "AssertionError" ? "fail" : "error";

                this.emit("test:" + type, {
                    name: test.name,
                    error: {
                        name: err.name,
                        message: err.message,
                        stack: err.stack
                    }
                });
            } else {
                this.emit("test:success", {
                    name: test.name,
                    assertions: this.assertionCount()
                });
            }
        },

        getSetUps: function (context) {
            return getAll(context, "setUp", "unshift");
        },

        getTearDowns: function (context) {
            return getAll(context, "tearDown", "push");
        },

        assertionCount: function () {}
    });
}());

if (typeof module != "undefined") {
    module.exports = buster.testRunner;
}
