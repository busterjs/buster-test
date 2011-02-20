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
                error = null;

                try {
                    this.emit("test:setUp", { name: tests[i].name });
                    callAllOn(setUps, context.testCase);
                    this.emit("test:start", { name: tests[i].name });
                    tests[i].func.call(context.testCase);
                } catch (e) {
                    error = e;
                }

                try {
                    this.emit("test:tearDown", { name: tests[i].name });
                    callAllOn(tearDowns, context.testCase);
                } catch (err) {
                    error = err;
                }

                if (!error) {
                    try {
                        if (this.failOnNoAssertions && this.assertionCount() == 0) {
                            var zeroAssertError = new Error("0 assertions");
                            zeroAssertError.name = "AssertionError";
                            throw zeroAssertError;
                        }
                    } catch (ae) {
                        error = ae;
                    }
                }

                if (error) {
                    event = error.name == "AssertionError" ? "fail" : "error";

                    this.emit("test:" + event, {
                        name: tests[i].name,
                        error: {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        }
                    });
                } else {
                    this.emit("test:success", {
                        name: tests[i].name,
                        assertions: this.assertionCount()
                    });
                }
            }

            var contexts = context.contexts();

            for (i = 0, l = contexts.length; i < l; ++i) {
                this.run(contexts[i]);
            }

            this.emit("context:end", context);
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
