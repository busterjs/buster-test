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
    buster.util = require("./util");
    buster.eventEmitter = require("buster-event-emitter");
    buster.promise = require("./promise");
    sys = require("sys");
}

(function (B) {
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

    function getResults(run) {
        if (!run.results) {
            run.results = {
                contexts: 0,
                tests: 0,
                errors: [],
                failures: [],
                assertions: 0,
                ok: false
            };
        }

        return run.results;
    }

    B.testRunner = B.util.extend(B.util.create(B.eventEmitter),{
        failOnNoAssertions: true,

        runSuite: function (contexts) {
            this.emit("suite:start");
            var self = this;

            return B.promise.sync(contexts, {
                method: this.run,
                thisObj: this
            }).then(function () {
                var results = getResults(self);
                results.contexts = contexts.length;

                results.ok = results.errors.length == 0 &&
                    results.failures.length == 0 && results.tests > 0;
                self.emit("suite:end", results);
            });
        },

        run: function (context) {
            this.emit("context:start", context);
            var promise = B.promise.create();

            if (context) {
                var self = this;

                this.runTests(context).then(function () {
                    var contexts = context.contexts().slice();

                    B.promise.sync(contexts, {
                        method: self.run,
                        thisObj: self
                    }).then(function () {
                        self.emit("context:end", context);
                        promise.resolve();
                    });
                });
            } else {
                promise.reject("Provide a context object");
            }

            return promise;
        },

        runTests: function (context) {
            var setUps = getAll(context, "setUp", "unshift");
            var tearDowns = getAll(context, "tearDown", "push");

            return B.promise.sync(context.tests().slice(), {
                args: [context.testCase, setUps, tearDowns],
                thisObj: this,
                method: this.runTest
            });
        },

        runTest: function (test, testCase, setUps, tearDowns) {
            var promise = B.promise.create();
            var self = this;

            B.util.nextTick(function () {
                var testResult, err, results = getResults(self);
                results.tests += 1;

                try {
                    self.emit("test:setUp", { name: test.name });
                    for (var i = 0, l = setUps.length; i < l; ++i) {
                        setUps[i].call(testCase);
                    }

                    self.emit("test:start", { name: test.name });
                    testResult = test.func.call(testCase);
                } catch (e) {
                    err = e;
                }
                
                try {
                    self.emit("test:tearDown", { name: test.name });
                    for (var i = 0, l = tearDowns.length; i < l; ++i) {
                        tearDowns[i].call(testCase);
                    }
                } catch (e2) {
                    err = e2;
                }

                var assertions = self.assertionCount(), error;

                if (!err && self.failOnNoAssertions && assertions == 0) {
                    try {
                        error = new Error("No assertions!");
                        error.name = "AssertionError";
                        throw error;
                    } catch (e3) {
                        err = e3;
                    }
                }

                var expected = testCase.expectedAssertions;
                delete testCase.expectedAssertions;

                if (!err && typeof expected == "number" && expected != assertions) {
                    try {
                        error = new Error("Expected " + expected +
                                          " assertions, ran " + assertions);
                        error.name = "AssertionError";
                        throw error;
                    } catch (e4) {
                        err = e4;
                    }
                }

                if (err) {
                    var event = "test:";

                    if (err.name == "AssertionError") {
                        event += "failure";
                        results.failures.push(err);
                    } else {
                        event += "error";
                        results.errors.push(err);
                    }

                    self.emit(event, {
                        name: test.name,
                        error: {
                            name: err.name,
                            message: err.message,
                            stack: err.stack
                        }
                    });
                } else {
                    results.assertions += assertions;

                    self.emit("test:success", {
                        name: test.name,
                        assertions: assertions
                    });
                }

                if (testResult && testResult.then) {
                    testResult.then(function () { promise.resolve(); });
                } else {
                    promise.resolve();
                }
            });

            return promise;
        },

        assertionCount: function () {}
    });
}(buster));

if (typeof module != "undefined") {
    module.exports = {
        testCaseRunner: buster.testCaseRunner,
        testRunner: buster.testRunner
    };
}
