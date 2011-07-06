var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.promise = require("buster-promise");
}

(function (B) {
    var thenable = buster.promise.thenable;
    var sequential = buster.promise.sequential;
    var __uid = 0;

    function uid(object) {
        if (!object.__uid) {
            object.__uid = __uid++;
        }

        return object.__uid;
    }

    function processAll(opt, method, items) {
        var i = 0, args = Array.prototype.slice.call(arguments, 3);
        var runner = this;
        items = items || [];

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

            arg = function (callback) {
                var error;

                if (callback) {
                    try {
                        callback();
                    } catch (e) {
                        error = e;
                    }
                }

                try {
                    if (error) {
                        promise.reject(error);
                    } else {
                        promise.resolve();
                    }
                } catch (e2) {}
            };
        }

        return func.call(thisObj, arg) || promise;
    }

    function getAll(context, getter, appendMethod) {
        var funcs = [];

        while (context) {
            if (typeof context[getter] == "function") {
                funcs[appendMethod](context[getter]);
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
                timeouts: 0,
                deferred: 0
            };
        }

        return runner.results;
    }

    function fireOnCreate(instance, runner) {
        var callbacks = instance.callbacks || [];

        for (var i = 0, l = callbacks.length; i < l; ++i) {
            callbacks[i](runner);
        }
    }

    var exceptionListener = {};
    var windowListener;

    function uncaughtListener(err) {
        if (typeof exceptionListener.listener == "function") {
            exceptionListener.listener(err);
            return false;
        }

        return true;
    }

    function catchUncaughtExceptions(listener) {
        if (typeof process != "undefined" && !exceptionListener.listener) {
            process.on("uncaughtException", uncaughtListener);
        }

        if (typeof window != "undefined" && !exceptionListener.listener) {
            windowListener = window.onerror;
            window.onerror = function (message) {
                var name = /(AssertionError)|(\[assert)/.test(message) ?
                    "AssertionError" : "UncaughtError";

                return uncaughtListener({ name: name, message: message });
            };
        }

        exceptionListener.listener = listener;
    }

    function releaseUncaughtExceptions() {
        if (typeof process != "undefined") {
            process.removeListener("uncaughtException", uncaughtListener);
        }

        if (typeof window != "undefined") {
            window.onerror = windowListener;
        }

        delete exceptionListener.listener;
    }

    B.testRunner = B.extend(B.create(B.eventEmitter), {
        failOnNoAssertions: true,
        timeout: 250,
        handleUncaughtExceptions: true,

        create: function (opt) {
            opt = opt || {};
            var runner = buster.create(this);

            if (typeof opt.timeout == "number") {
                runner.timeout = opt.timeout;
            }

            if (typeof opt.failOnNoAssertions == "boolean") {
                runner.failOnNoAssertions = opt.failOnNoAssertions;
            }

            if (typeof opt.handleUncaughtExceptions == "boolean") {
                runner.handleUncaughtExceptions = opt.handleUncaughtExceptions;
            }

            if (!runner.handleUncaughtExceptions) {
                releaseUncaughtExceptions();
            }

            fireOnCreate(this, runner);

            return runner;
        },

        onCreate: function (callback) {
            this.callbacks = this.callbacks || [];

            if (typeof callback == "function") {
                this.callbacks.push(callback);
            } else {
                throw new TypeError("onCreate callback " + callback + " is not a function");
            }
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
                        return B.bind(self, "run", context);
                    } else {
                        return null;
                    }
                }
            }).then(function () {
                results.ok = results.errors == 0 && results.failures == 0 &&
                    results.timeouts == 0;

                if (self.failOnNoAssertions && results.assertions == 0) {
                    results.ok = false;
                }

                self.emit("suite:end", results);
                releaseUncaughtExceptions();
                promise.resolve();
            });

            return promise;
        },

        run: function (context) {
            var promise = buster.promise.create();
            if (!context) return promise.reject();
            var failed = this.failedRequirements(context);

            if (failed) {
                this.failSupportRequirements(context, failed);
                return promise.resolve();
            }

            this.emit("context:start", context);
            var self = this;
            this.errors = {};

            if (this.handleUncaughtExceptions) {
                catchUncaughtExceptions(function (err) {
                    if (err.name == "AssertionError") {
                        self.error(err, self.currentTest);
                    } else {
                        self.emit("uncaughtException", err);
                    }
                });
            }

            var setUps = getAll(context, "setUp", "unshift");
            var tearDowns = getAll(context, "tearDown", "push");
            var testCase = context.testCase;

            sequential([
                B.bind(this, all, "runTest", context.tests, setUps, tearDowns, testCase),
                B.bind(this, all, "run", context.contexts)
            ]).then(function () {
                self.emit("context:end", context);
                promise.resolve();
            });

            return promise;
        },

        runTest: function (test, setUps, tearDowns, testCase) {
            if (test.deferred) {
                return this.deferTest(test);
            }

            this.currentTest = test;
            var self = this, results = getResults(this);
            var promise = buster.promise.create();
            testCase = B.create(testCase);

            function cleanUp(err) {
                function done(err2) {
                    var assertions = self.assertionCount();
                    var error = err || err2 || self.verifyAssertionCount(testCase);
                    delete testCase.expectedAssertions;

                    if (!error && !self.errors[uid(test)]) {
                        if (!test.timeout) {
                            results.assertions += assertions;

                            self.emit("test:success", {
                                name: test.name,
                                assertions: assertions
                            });
                        }
                    } else {
                        self.error(error, test);
                    }

                    delete self.currentTest;
                    results.tests += 1;
                    promise.resolve();
                }

                self.runTearDowns(tearDowns, test, testCase).then(done, done);
            }

            sequential([
                B.bind(this, "runSetUps", setUps, test, testCase),
                B.bind(this, "emit", "test:start", { name: test.name, testCase: testCase }),
                B.bind(this, "runTestFunction", test, testCase)
            ]).then(cleanUp, cleanUp);

            return promise;
        },

        runTestFunction: function (test, testCase) {
            var result = asyncFunction(test.func, testCase);

            if (result && result.then) {
                if (!test.asyncEmitted && !this.errors[uid(test)]) {
                    this.emit("test:async", { name: test.name });
                    test.asyncEmitted = true;
                }

                this.timebox(test, result);
            }

            return thenable(result);
        },

        runSetUps: function (setUps, test, testCase) {
            this.emit("test:setUp", { name: test.name, testCase: testCase });
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
            this.emit("test:tearDown", { name: test.name, testCase: testCase });
            return noisyAll.call(this, "runTearDown", tearDowns, test, testCase);
        },

        runTearDown: function (tearDown, test, testCase) {
            var promise = this.timebox(test, asyncFunction(tearDown, testCase));

            if (promise && !test.asyncEmitted && !this.errors[uid(test)]) {
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

                    if (!self.errors[uid(test)]) {
                        self.emit("test:timeout", { name: test.name });
                        test.timeout = true;
                        getResults(self).timeouts += 1;
                    }
                } catch (e) {}
            }, this.timeout);

            promise.then(function () {
                clearTimeout(timer);
            });

            return promise;
        },

        deferTest: function (test) {
            this.emit("test:deferred", test);
            getResults(this).deferred += 1;
        },

        error: function (error, test) {
            if (!test) {
                return;
            }

            if (this.errors[uid(test)]) {
                return;
            }

            this.errors[uid(test)] = true;

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

        assertionFailure: function (error) {
            this.error(error, this.currentTest);
        },

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
        },

        failedRequirements: function (context) {
            var support = context.requiresSupportForAll ||
                context.requiresSupportForAny;

            if (!support) return null;
            var requireAll = support == context.requiresSupportForAll;
            var requirements = [];

            for (var prop in support) {
                var req = support[prop];
                var supported = !(!req || (typeof req == "function" && !req()));

                if (requireAll && !supported) return [prop];
                if (!requireAll && supported) return null;
                requirements.push(prop);
            }

            return requireAll ? null : requirements;
        },

        failSupportRequirements: function (context, requirements) {
            this.emit("context:unsupported", {
                context: context,
                unsupported: requirements
            });
        }
    });
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.testRunner
}
