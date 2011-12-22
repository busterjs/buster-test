var buster = buster || {};

(function (B) {
    var isNode = typeof require == "function" && typeof module == "object";
    var when, onUncaught;

    if (isNode) {
        B = require("buster-core");
        when = require("when");
    }

    var partial = B.partial, bind = B.bind,
        each = B.each, map = B.map, series = B.series;

    testRunner = B.extend(B.eventEmitter.create(), {
        timeout: 250,
        onCreateListeners: [],

        create: function (opt) {
            var runner = B.create(this);
            triggerOnCreate(this.onCreateListeners, runner);
            runner.results = {
                contexts: 0, tests: 0, errors: 0, failures: 0,
                assertions: 0, timeouts: 0, deferred: 0
            };
            return B.extend(runner, {
                failOnNoAssertions: propWithDefault(opt, "failOnNoAssertions", false)
            });
        },

        onCreate: function (listener) {
            this.onCreateListeners.push(listener);
        },

        runSuite: function (contexts) {
            onUncaught(bind(this, function (err) {
                testResult(this, this.currentTest, err);
            }));
            var d = when.defer();
            this.emit("suite:start");
            this.results.contexts = contexts.length;
            this.runContexts(contexts).then(bind(this, function () {
                var res = prepareResults(this.results);
                this.emit("suite:end", res);
                d.resolver.resolve(res);
            }), d.resolver.reject);
            return d.promise;
        },

        runContexts: function (contexts) {
            contexts = (contexts || []).sort(byRandom);
            return when.all(map(contexts, bind(this, function (context) {
                return this.runContext(context);
            })));
        },

        runContext: function (context) {
            if (!context) { return rejected(); }
            var reqs = unsatiesfiedRequirements(context);
            if (reqs.length != 0) { return when(emitUnsupported(this, context, reqs)); }

            var d = when.defer();
            var s = this;
            this.emit("context:start", context);
            asyncWhen(context).then(function (c) {
                var runTests = chainPromises(
                    bind(s, "runTests", tests(c), setUps(c), tearDowns(c), c.testCase),
                    function () {
                        s.emit("context:end", context);
                        d.resolver.resolve();
                    });
                s.runContexts(c.contexts).then(runTests);
            });
            return d;
        },

        runTests: function (tests, setUps, tearDowns, thisp) {
            return when.all(map(tests, bind(this, function (test) {
                return this.runTest(test, setUps, tearDowns, B.create(thisp));
            })));
        },

        callSetUps: function (test, setUps, thisp) {
            emit(this, "test:setUp", test, null, thisp);
            return callSerially(setUps, thisp, thisp.timeout || this.timeout).then(
                partial(emitIfAsync, this, test));
        },

        callTearDowns: function (test, tearDowns, thisp) {
            emit(this, "test:tearDown", test, null, thisp);
            return callSerially(tearDowns, thisp, thisp.timeout || this.timeout).then(
                partial(emitIfAsync, this, test));
         },

        runTest: function (test, setUps, tearDowns, thisp) {
            var d = when.defer();
            test = B.create(test);
            this.currentTest = test;
            var callSetUps = bind(this, "callSetUps", test, setUps, thisp);
            var callTearDowns = bind(this, "callTearDowns", test, tearDowns, thisp);
            var callTest = partial(callTestFn, this, test, thisp);
            var tearDownEmitAndResolve = bind(this, function (err) {
                var resolution = bind(this, function (err2) {
                    testResult(
                        this, test,
                        err || err2 || checkAssertions(this, thisp.expectedAssertions));
                    delete this.currentTest;
                    d.resolver.resolve();
                });
                callTearDowns().then(partial(resolution, null), resolution);
            });
            var callTestAndTearDowns = partial(callTest, tearDownEmitAndResolve);
            callSetUps().then(callTestAndTearDowns, tearDownEmitAndResolve);
            return d.promise;
        },

        assertionCount: function () {
            return 0;
        },

        assertionFailure: function (error) {
            testResult(this, this.currentTest, error);
        }
    });

    // Private runner functions

    function callTestFn(runner, test, thisp, next) {
        emit(runner, "test:start", test, null, thisp);
        if (test.deferred) { return next({ name: "DeferredTestError", }); }

        try {
            var promise = asyncFunction(test.func, thisp);
            if (when.isPromise(promise)) { emitTestAsync(runner, test); }
            timebox(promise, thisp.timeout || runner.timeout, {
                resolve: next, reject: next, timeout: next
            });
        } catch (e) {
            next(e);
        }
    }

    function checkAssertions(runner, expected) {
        if (runner.failOnNoAssertions && runner.assertionCount() == 0) {
            return { name: "AssertionError", message: "No assertions!" };
        }
        var actual = runner.assertionCount();
        if (typeof expected == "number" && actual != expected) {
            return {
                name: "AssertionError",
                message: "Expected " + expected + " assertions, ran " + actual
            };
        }
    }

    function triggerOnCreate(listeners, runner) {
        each(listeners, function (listener) {
            listener(runner);
        });
    }

    // Events

    var errorEvents = {
        "TimeoutError": "test:timeout",
        "AssertionError": "test:failure",
        "DeferredTestError": "test:deferred"
    };

    function testResult(runner, test, err) {
        if (!test) { return runner.emit("uncaughtException", err); }
        if (test.complete) { return; }
        test.complete = true;
        var event = err ? (errorEvents[err.name] || "test:error") : "test:success";
        emit(runner, event, test, err);

        if (event == "test:error") { runner.results.errors += 1; }
        if (event == "test:failure") { runner.results.failures += 1; }
        if (event == "test:timeout") { runner.results.timeouts += 1; }
        if (event == "test:deferred") {
            runner.results.deferred += 1;
        } else {
            runner.results.assertions += runner.assertionCount();
            runner.results.tests += 1;
        }
    }

    function emitTestAsync(runner, test) {
        if (!test.async) {
            test.async = true;
            emit(runner, "test:async", test);
        }
    }

    function emitIfAsync(runner, test, isAsync) {
        if (isAsync) {
            emitTestAsync(runner, test)
        }
    }

    function emitUnsupported(runner, context, requirements) {
        runner.emit("context:unsupported", {
            context: context,
            unsupported: requirements
        });
    }

    function emit(runner, event, test, err, thisp) {
        var data = { name: test.name };
        if (err) { data.error = err; }
        if (typeof test.func == "string") { data.comment = test.func; }
        if (thisp) { data.testCase = thisp; }
        if (event == "test:success") { data.assertions = runner.assertionCount(); }
        runner.emit(event, data);
    }

    // Data helper functions
    function byRandom() {
        return Math.round(Math.random() * 2) - 1;
    }

    function tests(context) {
        return context.tests.sort(byRandom);
    }

    function setUps(context) {
        var setUps = [];
        while (context) {
            if (context.setUp) {
                setUps.unshift(context.setUp);
            }
            context = context.parent;
        }
        return setUps;
    }

    function tearDowns(context) {
        var tearDowns = [];
        while (context) {
            if (context.tearDown) {
                tearDowns.push(context.tearDown);
            }
            context = context.parent;
        }
        return tearDowns;
    }

    function unsatiesfiedRequirements(context) {
        var requirements = context.requiresSupportForAll || {};
        for (var name in requirements) {
            if (!satiesfiesRequirement(requirements[name])) {
                return [name];
            }
        }
        var unsatiesfied = [];
        requirements = context.requiresSupportForAny || {};
        for (name in requirements) {
            if (satiesfiesRequirement(requirements[name])) {
                return [];
            } else {
                unsatiesfied.push(name);
            }
        }
        return unsatiesfied;
    }

    function satiesfiesRequirement(requirement) {
        if (typeof requirement == "function") {
            return !!requirement();
        }
        return !!requirement;
    }

    function isAssertionError(err) {
        return err && err.name == "AssertionError";
    }

    function prepareResults(results) {
        return B.extend(results, {
            ok: results.failures + results.errors + results.timeouts == 0
        });
    }

    function propWithDefault(obj, prop, defaultValue) {
        return obj && obj.hasOwnProperty(prop) ? obj[prop] : defaultValue;
    }

    // Async flow

    function asyncFunction(fn, thisp) {
        if (fn.length > 0) {
            var deferred = when.defer();
            fn.call(thisp, asyncDone(deferred.resolver));
            return deferred.promise;
        }
        return fn.call(thisp);
    }

    function asyncDone(resolver) {
        return function (fn) {
            if (!fn) { return resolver.resolve(); }
            return function () {
                try {
                    var retVal = fn.apply(this, arguments);
                    resolver.resolve();
                    return retVal;
                } catch (up) {
                    resolver.reject(up);
                }
            };
        }
    }

    function timebox(promise, ms, callbacks) {
        var timedout, complete;
        function handler(method) {
            return function () {
                complete = true;
                clearTimeout(timer);
                if (!timedout) { callbacks[method].apply(this, arguments); }
            };
        }
        when(promise).then(handler("resolve"), handler("reject"));
        var timer = setTimeout(function () {
            timedout = true;
            if (!complete) { callbacks.timeout(timeoutError(ms)) }
        }, ms);
    }

    function timeoutError(ms) {
        return {
            name: "TimeoutError",
            message: "Timed out after " + ms + "ms"
        };
    }

    function callSerially(functions, thisp, timeout) {
        var d = when.defer();
        var fns = functions.slice();
        var isAsync = false;
        function next(err) {
            if (err) { return d.resolver.reject(err); }
            if (fns.length == 0) { return d.resolver.resolve(isAsync); }
            try {
                var promise = callAndWait(fns.shift(), thisp, timeout, next);
                isAsync = isAsync || when.isPromise(promise);
            } catch (e) {
                return d.resolver.reject(e);
            }
        }
        next();
        return d.promise;
    }

    function callAndWait(func, thisp, timeout, next) {
        var reject = function (err) { next(err || {}); };
        var promise = asyncFunction(func, thisp);
        timebox(promise, timeout, {
            resolve: partial(next, null), reject: reject, timeout: reject
        });
        return promise;
    }

    function asyncWhen(value) {
        if (when.isPromise(value)) {
            return value;
        } else {
            var d = when.defer();
            B.nextTick(partial(d.resolver.resolve, value));
            return d.promise;
        }
    }

    function chainPromises(fn, resolution) {
        var r = typeof resolution == "function" ? [resolution, resolution] : resolution;
        return function () {
            fn().then(partial(resolution, null), r[0], r[1]);
        };
    }

    function rejected(deferred) {
        if (!deferred) {
            deferred = when.defer();
        }
        deferred.resolver.reject();
        return deferred.promise;
    }

    function listenForUncaughtExceptions() {
        var listener;
        process.on("uncaughtException", function (e) {
            listener && listener(e);
        });
        onUncaught = function (l) { listener = l; };
    }

    // Export module

    if (isNode) {
        listenForUncaughtExceptions();
        module.exports = testRunner;
    } else {
        B.testRunner = testRunner;
    }
}(buster));
