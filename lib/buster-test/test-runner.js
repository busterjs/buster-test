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
    buster.eventedLogger = require("./evented-logger");
    sys = require("sys");
}

(function (B) {
    var thenable = buster.promise.thenable;
    var sequential = buster.promise.sequential;
    var bind = B.util.bind;

    function processAll(opt, method, items) {
        var i = 0, args = Array.prototype.slice.call(arguments, 3);
        var runner = this;

        return sequential({
            shift: function () {
                var item = items[i++];

                if (item) {
                    return function () {
                        return runner[method].apply(runner, [item].concat(args));
                    };
                } else {
                    return null;
                }
            }
        }, opt);
    }

    function all() {
        var args = Array.prototype.slice.call(arguments);
        return processAll.apply(this, [{ error: function () {} }].concat(args));
    }

    function noisyAll() {
        var args = Array.prototype.slice.call(arguments);
        return processAll.apply(this, [null].concat(args));
    }

    function asyncFunction(func, thisObj) {
        var promise, arg;

        if (func.length == 1) {
            promise = buster.promise.create();

            arg = function (err) {
                try {
                    if (err) {
                        promise.reject(err);
                    } else {
                        promise.resolve();
                    }
                } catch (e) {}
            };
        }

        return func.call(thisObj, arg) || promise;
    }

    function getAll(context, getter, appendMethod) {
        var func, funcs = [];

        while (context) {
            func = context[getter]();
            
            if (typeof func == "function") {
                funcs[appendMethod](func);
            }

            context = context.parent;
        }

        return funcs;
    }

    function getResults(runner) {
        if (!runner.results) {
            runner.results = {
                contexts: 0,
                tests: 0,
                errors: 0,
                failures: 0,
                assertions: 0,
                timeouts: 0
            };
        }

        return runner.results;
    }

    B.testRunner = B.util.extend(B.util.create(B.eventEmitter), {
        failOnNoAssertions: true,
        timeout: 250,

        create: function (opt) {
            opt = opt || {};
            var runner = buster.util.create(this);
            runner.console = opt.logger || buster.eventedLogger.create();
            runner.timeout = opt.timeout || runner.timeout;

            return runner;
        },

        runSuite: function (contexts) {
            this.emit("suite:start");
            var self = this, i = 0;
            var results = getResults(this);
            var promise = buster.promise.create();

            sequential({
                shift: function () {
                    var context = contexts[i++];

                    if (context) {
                        results.contexts += 1;
                        return bind(self, "run", context);
                    } else {
                        return null;
                    }
                }
            }).then(function () {
                self.emit("suite:end", results);
                promise.resolve();
            });

            return promise;
        },

        run: function (context) {
            this.emit("context:start", context);
            var promise = buster.promise.create();
            var self = this;

            if (!context) {
                return promise.reject();
            }

            var setUps = getAll(context, "getSetUp", "unshift");
            var tearDowns = getAll(context, "getTearDown", "push");
            var tests = context.tests();
            var testCase = context.testCase;

            sequential([
                bind(this, all, "runTest", tests, setUps, tearDowns, testCase),
                bind(this, all, "run", context.contexts())
            ]).then(function () {
                self.emit("context:end", context);
                promise.resolve();
            });

            return promise;
        },

        runTest: function (test, setUps, tearDowns, testCase) {
            var promise = buster.promise.create();
            var self = this, results = getResults(this);
            testCase = B.util.create(testCase);
            testCase.console = this.console;

            function cleanUp(err) {
                function done(err2) {
                    var assertions = self.assertionCount();
                    var error = err || err2 || self.verifyAssertionCount(testCase);
                    delete testCase.expectedAssertions;

                    if (!error) {
                        results.assertions += assertions;

                        self.emit("test:success", {
                            name: test.name,
                            assertions: assertions
                        });
                    } else {
                        self.error(error, test);
                    }

                    results.tests += 1;
                    promise.resolve();
                }

                self.runTearDowns(tearDowns, test, testCase).then(done, done);
            }

            sequential([
                bind(this, "runSetUps", setUps, test, testCase),
                bind(this, "emit", "test:start", { name: test.name }),
                bind(this, "runTestFunction", test, testCase)
            ]).then(cleanUp, cleanUp);

            return promise;
        },

        runTestFunction: function (test, testCase) {
            var result = asyncFunction(test.func, testCase);

            if (result && result.then) {
                if (!test.asyncEmitted) {
                    this.emit("test:async", { name: test.name });
                }

                this.timebox(test, result);
            }

            return thenable(result);
        },

        runSetUps: function (setUps, test, testCase) {
            this.emit("test:setUp", { name: test.name });
            return noisyAll.call(this, "runSetUp", setUps, test, testCase);
        },

        runSetUp: function (setUp, test, testCase) {
            var promise = this.timebox(test, asyncFunction(setUp, testCase));

            if (promise && !test.asyncEmitted) {
                test.asyncEmitted = true;
                this.emit("test:async", { name: test.name });
            }

            return promise;
        },

        runTearDowns: function (tearDowns, test, testCase) {
            this.emit("test:tearDown", { name: test.name });
            return noisyAll.call(this, "runTearDown", tearDowns, test, testCase);
        },

        runTearDown: function (tearDown, test, testCase) {
            var promise = this.timebox(test, asyncFunction(tearDown, testCase));

            if (promise && !test.asyncEmitted) {
                this.emit("test:async", { name: test.name });
            }

            return promise;
        },

        timebox: function (test, promise) {
            if (!promise) {
                return;
            }

            var self = this;

            var timer = setTimeout(function () {
                try {
                    promise.resolve();
                    self.emit("test:timeout", { name: test.name });
                    getResults(self).timeouts += 1;
                } catch (e) {}
            }, this.timeout);

            promise.then(function () {
                clearTimeout(timer);
            });

            return promise;
        },

        error: function (error, test) {
            var data = {
                name: test.name,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            };

            var results = getResults(this);

            if (error.name == "AssertionError") {
                results.failures += 1;
                this.emit("test:failure", data);
            } else {
                results.errors += 1;
                this.emit("test:error", data);
            }
        },

        assertionCount: function () {},

        verifyAssertionCount: function (testCase) {
            var message, assertions = this.assertionCount();
            var expected = testCase.expectedAssertions;

            if (this.failOnNoAssertions && assertions == 0) {
                message = "No assertions!";
            }

            if (expected && assertions != expected) {
                message = "Expected " + expected + " assertions, ran " + assertions;
            }

            if (message) {
                try {
                    var error = new Error(message);
                    error.name = "AssertionError";
                    throw error;
                } catch (e) {
                    return e;
                }
            }
        }
    });
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.testRunner
}
