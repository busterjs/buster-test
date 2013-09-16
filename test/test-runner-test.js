/*jslint maxlen: 100*/
((typeof require === "function" && function (reqs, callback) {
    callback.apply(this, reqs.map(function (req) { return require(req); }));
}) || define)([
    "when",
    "sinon",
    "referee",
    "../lib/test-case",
    "../lib/test-runner",
    "./test-helper"
], function (when, sinon, referee, testCase, testRunner, helper) {
    var assert = referee.assert;
    var refute = referee.refute;

    function assertionError(message) {
        var error = new Error(message);
        error.name = "AssertionError";
        return error;
    }

    function spyOnPromise(promise) {
        var promiseResolution = sinon.spy();
        promise.then(promiseResolution);
        return promiseResolution;
    }

    function numericSort(a, b) {
        return a === b ? 0 : (a < b ? -1 : 1);
    }

    function tick(times, fn) {
        function next() {
            if (times === 0) {
                fn();
            } else {
                times -= 1;
                testRunner.nextTick(next);
            }
        }

        next();
    }

    function runnerEventsSetUp() {
        this.runner = testRunner.create({
            runtime: "Node 8.10"
        });
        this.runner.failOnNoAssertions = false;
        this.assertionError = new Error("Oh, crap");
        this.assertionError.name = "AssertionError";

        this.listeners = {
            "suite:start": sinon.spy(),
            "context:start": sinon.spy(),
            "context:unsupported": sinon.spy(),
            "test:setUp": sinon.spy(),
            "test:start": sinon.spy(),
            "test:tearDown": sinon.spy(),
            "test:failure": sinon.spy(),
            "test:error": sinon.spy(),
            "test:success": sinon.spy(),
            "context:end": sinon.spy(),
            "suite:end": sinon.spy(),
            "test:deferred": sinon.spy(),
            "uncaughtException": sinon.spy()
        };

        this.runner.on("suite:start", this.listeners["suite:start"]);
        this.runner.on("context:start", this.listeners["context:start"]);
        this.runner.on("test:setUp", this.listeners["test:setUp"]);
        this.runner.on("test:start", this.listeners["test:start"]);
        this.runner.on("test:tearDown", this.listeners["test:tearDown"]);
        this.runner.on("test:success", this.listeners["test:success"]);
        this.runner.on("test:failure", this.listeners["test:failure"]);
        this.runner.on("test:error", this.listeners["test:error"]);
        this.runner.on("test:deferred", this.listeners["test:deferred"]);
        this.runner.on("context:end", this.listeners["context:end"]);
        this.runner.on("context:unsupported", this.listeners["context:unsupported"]);
        this.runner.on("suite:end", this.listeners["suite:end"]);
        this.runner.on("uncaughtException", this.listeners.uncaughtException);

        this.myCase = testCase("My case", {});
        this.otherCase = testCase("Other", {});
        this.simpleCase = testCase("One test", {
            setUp: sinon.spy(),
            tearDown: sinon.spy(),
            testIt: sinon.spy()
        });

        var self = this;
        this.runSuite = function (suite, callback) {
            self.runner.runSuite(suite).then(function () {
                callback(self.listeners);
            });
        };
    }

    helper.testCase("TestRunnerCreateTest", {
        "emits newly created object to callback": function () {
            var listener = sinon.spy();
            testRunner.onCreate(listener);
            var runner = testRunner.create();

            assert(listener.calledOnce);
            assert(listener.calledWith(runner));
        },

        "allows many listeners to onCreate callback": function () {
            var listeners = [sinon.spy(), sinon.spy()];
            testRunner.onCreate(listeners[0]);
            testRunner.onCreate(listeners[1]);
            var runner = testRunner.create();

            assert(listeners[0].calledOnce);
            assert(listeners[1].calledOnce);
        },

        "is not concurrent": function () {
            var runner = testRunner.create();

            refute(runner.concurrent);
            assert.equals(runner.clients, 1);
        }
    });

    helper.testCase("TestRunnerRunContextTest", {
        setUp: function () {
            this.runner = testRunner.create({
                random: false
            });
        },

        "returns promise": function () {
            var promise = this.runner.runContext();

            assert.isObject(promise);
            assert(promise.then);
        },

        "rejects without context": function (done) {
            var rejection = sinon.spy();
            this.runner.runContext().then(function () {}, function () {
                done();
            });
        },

        "runs single test function": function (done) {
            var testFn = sinon.spy();
            var context = testCase("Test", { test: testFn });

            this.runner.runContext(context).then(done(function () {
                assert(testFn.calledOnce);
                assert(context.testCase.isPrototypeOf(testFn.thisValues[0]));
            }));
        },

        "runs test asynchronously": function (done) {
            var testFn = sinon.spy();
            var context = testCase("Test", { test: testFn });
            var runnerResult = this.runner.runContext(context);

            assert(!testFn.called);

            runnerResult.then(done(function () {
                assert(testFn.calledOnce);
            }));
        },

        "does not reject if test throws": function (done) {
            var context = testCase("Test", { test: sinon.stub().throws() });

            this.runner.runContext(context).then(done, done(function () {
                assert(false, "Promise rejected");
            }));
        },

        "calls setUp on same test case object as test": function (done) {
            var setUp = sinon.spy();
            var testFn = sinon.spy();
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(done(function () {
                assert(setUp.calledOnce);
                assert.same(testFn.thisValues[0], setUp.thisValues[0]);
            }));
        },

        "calls setUp before test": function (done) {
            var testFn = sinon.spy();
            var setUp = sinon.spy();
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(done(function () {
                assert(setUp.calledBefore(testFn));
            }));
        },

        "does not call test until setUp resolves": function (done) {
            var doneCb;
            var testFn = sinon.spy();

            var setUp = function (done) { doneCb = done; };
            var context = testCase("Test", { setUp: setUp, test: testFn });

            var testRun = this.runner.runContext(context).then(done(function () {
                assert(testFn.calledOnce);
            }));

            refute(testFn.calledOnce);
            testRunner.nextTick(function () {
                doneCb();
            });
        },

        "does not call test until setUp promise resolves": function (done) {
            var deferred = when.defer(), resolved = false, testFn = sinon.spy();

            var setUp = sinon.spy(function () {
                assert(!testFn.called);
                return deferred.promise;
            });

            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(done(function () {
                assert(resolved);
                assert(testFn.calledOnce);
            }));

            testRunner.nextTick(function () {
                resolved = true;
                deferred.resolve();
            });
        },

        "does not reject if setUp fails": function (done) {
            var setUp = sinon.stub().throws();
            var context = testCase("Test", { setUp: setUp, test: sinon.spy() });

            this.runner.runContext(context).then(function () {
                done();
            }, function () {
                assert.fail();
            });
        },

        "does not call test if setUp throws": function (done) {
            var testFn = sinon.spy();
            var setUp = sinon.stub().throws();
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(done(function () {
                assert(!testFn.called);
            }));
        },

        "does not call test if setUp rejects": function (done) {
            var deferred = when.defer();
            var testFn = sinon.spy();
            var setUp = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(done(function () {
                assert(!testFn.called);
            }));

            deferred.reject();
        },

        "calls tearDown on same test case object as test": function (done) {
            var fn = sinon.spy();
            var tearDown = sinon.spy();
            var context = testCase("Test", { tearDown: tearDown, test: fn });

            this.runner.runContext(context).then(done(function () {
                assert(tearDown.calledOnce);
                assert.same(fn.thisValues[0], tearDown.thisValues[0]);
            }));
        },

        "calls tearDown after test": function (done) {
            var fn = sinon.spy();
            var tearDown = sinon.spy();
            var context = testCase("Test", { tearDown: tearDown, test: fn });

            this.runner.runContext(context).then(done(function () {
                assert(tearDown.calledAfter(fn));
            }));
        },

        "not resolve until tearDown resolves": function (done) {
            var deferred = when.defer();
            var tearDown = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { tearDown: tearDown, test: sinon.spy() });
            var complete = sinon.spy(function () { testRunner.nextTick(done); });

            this.runner.runContext(context).then(complete);

            testRunner.nextTick(function () {
                assert(!complete.called);
                deferred.resolve();
            });
        },

        "does not throw if tearDown throws": function (done) {
            var fn = sinon.spy();
            var tearDown = sinon.stub().throws();
            var context = testCase("Test", { tearDown: tearDown, test: fn });

            this.runner.runContext(context).then(done, assert.fail);
        },

        "calls tearDown if setUp throws": function (done) {
            var tearDown = sinon.spy();
            var context = testCase("Test", {
                setUp: sinon.stub().throws(),
                tearDown: tearDown,
                test: sinon.spy()
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDown.calledOnce);
            }));
        },

        "calls tearDown if test throws": function (done) {
            var tearDown = sinon.spy();

            var context = testCase("Test", {
                setUp: sinon.spy(),
                tearDown: tearDown,
                test: sinon.stub().throws()
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDown.calledOnce);
            }));
        },

        "runs all tests": function (done) {
            var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(done(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
                assert(tests[2].calledOnce);
            }));
        },

        "runs all tests in series": function (done) {
            var events = [];

            var context = testCase("Test", {
                setUp: function () { events.push("setUp"); },
                tearDown: function () { events.push("tearDown"); },
                test1: function () { events.push("test1"); },
                test2: function (done) {
                    setTimeout(done(function () { events.push("test2"); }), 10);
                },
                test3: function (done) {
                    setTimeout(done(function () { events.push("test3"); }), 10);
                }
            });

            this.runner.runContext(context).then(done(function () {
                assert.equals(events, ["setUp", "test1", "tearDown",
                                       "setUp", "test2", "tearDown",
                                       "setUp", "test3", "tearDown"]);
            }));
        },

        "runs all contexts in series": function (done) {
            var events = [];

            var context = testCase("Test", {
                setUp: function () { events.push("su"); },
                tearDown: function () { events.push("td"); },
                context1: {
                    setUp: function () { events.push("su 1"); },
                    tearDown: function () { events.push("td 1"); },
                    test1: function () { events.push("test1"); }
                },
                context2: {
                    setUp: function () { events.push("su 2"); },
                    tearDown: function () { events.push("td 2"); },
                    test2: function (done) {
                        setTimeout(done(function () { events.push("test2"); }), 10);
                    }
                },
                context3: {
                    setUp: function () { events.push("su 3"); },
                    tearDown: function () { events.push("td 3"); },
                    test3: function (done) {
                        setTimeout(done(function () { events.push("test3"); }), 10);
                    }
                }
            });

            this.runner.runContext(context).then(done(function () {
                assert.equals(events, ["su", "su 1", "test1", "td 1", "td",
                                       "su", "su 2", "test2", "td 2", "td",
                                       "su", "su 3", "test3", "td 3", "td"]);
            }));
        },

        "runs tests in random order": function (done) {
            var order = [];
            var tests = [function () { order.unshift(1); },
                         function () { order.unshift(2); },
                         function () { order.unshift(3); },
                         function () { order.unshift(4); },
                         function () { order.unshift(5); }];

            var context = testCase("Test", {
                test1: tests[0],
                test2: tests[1],
                test3: tests[2],
                test4: tests[3],
                test5: tests[4]
            });

            testRunner.create().runContext(context).then(done(function () {
                refute.equals(order, [1, 2, 3, 4, 5]);
            }));
        },

        "runs tests in seeded random order": function (done) {
            var order = [];
            var tests = [function () { order.unshift(1); },
                         function () { order.unshift(2); },
                         function () { order.unshift(3); },
                         function () { order.unshift(4); },
                         function () { order.unshift(5); }];

            var context = testCase("Test", {
                test1: tests[0],
                test2: tests[1],
                test3: tests[2],
                test4: tests[3],
                test5: tests[4]
            });

            var runner = testRunner.create({ randomSeed: 1 });
            runner.runContext(context).then(function () {
                var order1 = order.slice();
                order = [];
                runner.runContext(context).then(done(function () {
                    assert.equals(order1, order);
                    refute.equals(order, [1, 2, 3, 4, 5]);
                    assert(runner.seed);
                }));
            });
        },

        "runs all tests even if one fails": function (done) {
            var tests = [sinon.spy(), sinon.stub().throws(), sinon.spy()];

            var context = testCase("Test", {
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(done(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
                assert(tests[2].calledOnce);
            }));
        },

        "runs setUp once for each test": function (done) {
            var setUp = sinon.spy();
            var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                setUp: setUp,
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(done(function () {
                var calls = [tests[0].callIds[0], tests[1].callIds[0], tests[2].callIds[0]];
                calls = calls.sort(numericSort);

                assert(setUp.callIds[0] < calls[0]);
                assert(setUp.callIds[1] > calls[0]);
                assert(setUp.callIds[1] < calls[1]);
                assert(setUp.callIds[2] > calls[1]);
                assert(setUp.callIds[2] < calls[2]);
            }));
        },

        "runs tearDown once for each test": function (done) {
            var tearDown = sinon.spy();
            var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                tearDown: tearDown,
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDown.calledThrice);

                var calls = [tests[0].callIds[0], tests[1].callIds[0],
                             tests[2].callIds[0]];
                calls = calls.sort(numericSort);

                assert(tearDown.callIds[0] > calls[0]);
                assert(tearDown.callIds[0] < calls[1]);
                assert(tearDown.callIds[1] > calls[1]);
                assert(tearDown.callIds[1] < calls[2]);
                assert(tearDown.callIds[2] > calls[2]);
            }));
        },

        "runs tests in sub context": function (done) {
            var fn = sinon.spy();
            var context = testCase("Test", { "context": { test1: fn } });

            this.runner.runContext(context).then(done(function () {
                assert(fn.calledOnce);
            }));
        },

        "does not fail without sub contexts": function (done) {
            var fn = sinon.spy();
            var context = { tests: [{ name: "sumptn", func: fn }] };
            var self = this;

            refute.exception(function () {
                self.runner.runContext(context).then(done(function () {
                    assert(fn.calledOnce);
                }));
            });
        },

        "runs tests in all sub contexts": function (done) {
            var tests = [sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                "context": { test1: tests[0] },
                "context2": { test1: tests[1] }
            });

            this.runner.runContext(context).then(done(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
            }));
        },

        "runs sub context setUp for test in sub context": function (done) {
            var setUp = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                "context": { setUp: setUp, test1: fn }
            });

            context.contexts[0].testCase.id = 42;

            this.runner.runContext(context).then(done(function () {
                assert(setUp.calledOnce);
                assert.same(fn.thisValues[0], setUp.thisValues[0]);
            }));
        },

        "runs parent setUp prior to local setUp": function (done) {
            var setUps = [sinon.spy(), sinon.spy()];
            var fn = sinon.spy();

            var context = testCase("Test", {
                setUp: setUps[0],
                "context": { setUp: setUps[1], test1: fn }
            });

            this.runner.runContext(context).then(done(function () {
                assert(setUps[0].calledOnce);
                assert(setUps[1].calledOnce);
                assert(setUps[0].calledBefore(setUps[1]));
            }));
        },

        "waits for setUp promises to resolve": function (done) {
            var deferreds = [when.defer(), when.defer()];
            var outerSetUp = sinon.stub().returns(deferreds[0].promise);
            var innerSetUp = sinon.stub().returns(deferreds[1].promise);
            var fn = sinon.spy();
            var context = testCase("Test", {
                setUp: outerSetUp,
                "context": { setUp: innerSetUp, test1: fn }
            });

            this.runner.runContext(context).then(done(function () {
                assert(fn.called);
            }));

            // One testRunner.nextTick per context
            tick(2, function () {
                assert(outerSetUp.calledOnce);
                assert(!innerSetUp.called);
                deferreds[0].resolver.resolve();
                assert(innerSetUp.calledOnce);
                assert(!fn.called);
                deferreds[1].resolver.resolve();
            });
        },

        "runs parent setUp on local test case object": function (done) {
            var setUp = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                setUp: setUp,
                "context": { test1: fn }
            });

            this.runner.runContext(context).then(done(function () {
                assert.same(fn.thisValues[0], setUp.thisValues[0]);
            }));
        },

        "stops running setUps if one fails": function (done) {
            var setUps = [sinon.stub().throws(), sinon.spy()];

            var context = testCase("Test", {
                setUp: setUps[0],
                "context": { setUp: setUps[1], test1: sinon.spy() }
            });

            this.runner.runContext(context).then(done(function () {
                assert(!setUps[1].called);
            }));
        },

        "runs sub context tearDown for test in sub context": function (done) {
            var tearDown = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                "context": { tearDown: tearDown, test1: fn }
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDown.calledOnce);
                assert.same(fn.thisValues[0], tearDown.thisValues[0]);
            }));
        },

        "runs parent tearDown after local tearDown": function (done) {
            var tearDowns = [sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                tearDown: tearDowns[0],
                "context": { tearDown: tearDowns[1], test1: sinon.spy() }
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDowns[0].calledOnce);
                assert(tearDowns[0].calledOnce);
                assert(tearDowns[1].calledOnce);
                assert(tearDowns[0].calledAfter(tearDowns[1]));
            }));
        },

        "runs parent tearDown on local test case object": function (done) {
            var tearDown = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                tearDown: tearDown,
                "context": { test1: fn }
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDown.calledOnce);
                assert.same(tearDown.thisValues[0], fn.thisValues[0]);
            }));
        },

        "runs tearDowns inner -> outer": function (done) {
            var tearDowns = [sinon.spy(), sinon.spy()];
            var fn = sinon.spy();

            var context = testCase("Test", {
                tearDown: tearDowns[0],
                "context": { tearDown: tearDowns[1], test1: fn }
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDowns[1].calledBefore(tearDowns[0]));
            }));
        },

        "stops running tearDowns if one fails": function (done) {
            var tearDowns = [sinon.spy(), sinon.stub().throws()];

            var context = testCase("Test", {
                tearDown: tearDowns[0],
                "context": { tearDown: tearDowns[1], test1: sinon.spy() }
            });

            this.runner.runContext(context).then(done(function () {
                assert(tearDowns[1].called);
                assert(!tearDowns[0].called);
            }));
        },

        "waits for tearDown promises to resolve": function (done) {
            var deferreds = [when.defer(), when.defer()];
            var innerTearDown = sinon.stub().returns(deferreds[0].promise);
            var outerTearDown = sinon.stub().returns(deferreds[1].promise);
            var fn = sinon.spy();
            var context = testCase("Test", {
                tearDown: outerTearDown,
                "context": { tearDown: innerTearDown, test1: fn }
            });

            this.runner.runContext(context).then(done);

            // One testRunner.nextTick per context
            tick(2, function () {
                assert(fn.called);
                assert(innerTearDown.calledOnce);
                assert(!outerTearDown.called);
                deferreds[0].resolver.resolve();
                assert(outerTearDown.calledOnce);
                deferreds[1].resolver.resolve();
            });
        },

        "skips deferred test": function (done) {
            var fn = sinon.spy();

            var context = testCase("Test", {
                "//should do this": fn
            });

            this.runner.runContext(context).then(done(function () {
                assert(!fn.called);
            }));
        },

        "waits for async context": function (done) {
            var runIt, completed = sinon.spy();
            var context = testCase("Test", function (run) {
                runIt = run;
            });

            this.runner.runContext(context).then(completed);

            testRunner.nextTick(done(function () {
                assert.isFunction(runIt);
                refute(completed.called);
                runIt({});
                assert(completed.calledOnce);
            }));
        }
    });

    helper.testCase("TestRunnerRunSuiteTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "runs all contexts": function (done) {
            var tests = [sinon.spy(), sinon.spy()];

            var contexts = [testCase("Test", { test1: tests[0] }),
                            testCase("Test other", { test2: tests[1] })];

            this.runner.runSuite(contexts).then(done(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
            }));
        }
    });

    helper.testCase("TestRunnerAsyncTest", {
        setUp: function () {
            this.runner = testRunner.create();
            this.deferred = when.defer();
            this.fn = sinon.stub().returns(this.deferred.promise);
            this.context = testCase("Test", { test: this.fn });
        },

        "resolves run when test has resolved": function (done) {
            var completed = sinon.spy();
            this.runner.runSuite([this.context]).then(completed);
            var deferred = this.deferred;

            testRunner.nextTick(done(function () {
                refute(completed.called);
                deferred.resolve();
                assert(completed.calledOnce);
            }));
        },

        "emits test:async event": function (done) {
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:async", listeners[0]);
            this.runner.on("test:success", listeners[1]);

            this.runner.runSuite([this.context]).then(done(function () {
                assert(listeners[0].calledOnce);
                assert.equals(listeners[0].args[0][0].name, "test");
                assert(listeners[0].calledBefore(listeners[1]));
            }));

            this.deferred.resolve();
        },

        "times out after 250ms": function (done) {
            var runnerResolution = sinon.spy();
            var promiseResolution = spyOnPromise(this.deferred.promise);
            this.runner.runSuite([this.context]).then(runnerResolution);

            setTimeout(done(function () {
                assert(runnerResolution.called);
                assert(!promiseResolution.called);
            }), 300); // Timers in browsers are inaccurate beasts
        },

        "times out after custom timeout": function (done) {
            var runnerResolution = sinon.spy();
            this.runner.timeout = 100;
            this.runner.runSuite([this.context]).then(runnerResolution);

            setTimeout(done(function () {
                assert(runnerResolution.called);
            }), 150);
        },

        "sets timeout as property on test case": function (done) {
            var runnerResolution = sinon.spy();
            this.runner.runSuite([testCase("Test", {
                test: function (test) {
                    this.timeout = 50;
                }
            })]).then(runnerResolution);

            setTimeout(done(function () {
                assert(runnerResolution.called);
            }), 100);
        },

        "emits timeout event": function (done) {
            var listener = sinon.spy();
            this.runner.timeout = 20;
            this.runner.on("test:timeout", listener);

            this.runner.runSuite([this.context]).then(done(function () {
                assert(listener.called);
                assert.match(listener.args[0], [{
                    name: "test",
                    error: { source: "test function" }
                }]);
            }));
        },

        "does not emit success when test times out": function (done) {
            var listener = sinon.spy();
            this.runner.timeout = 20;
            this.runner.on("test:success", listener);

            this.runner.runSuite([this.context]).then(done(function () {
                assert(!listener.called);
            }));
        },

        "does not emit test:success event until test has completed": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:success", listener);

            this.runner.runSuite([this.context]).then(done(function () {
                assert(listener.calledOnce);
            }));

            var deferred = this.deferred;

            setTimeout(function () {
                assert(!listener.called);
                deferred.resolve();
            }, 10);
        },

        "errors if test rejects its returned promise": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            this.runner.runSuite([this.context]).then(done(function (stats) {
                assert.equals(listener.args[0][0].error.message, "Oh no");
            }));

            this.deferred.reject(new Error("Oh no"));
        },

        "fails if test rejects with an AssertionError": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            this.runner.runSuite([this.context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oh no");
            }));

            this.deferred.reject({
                name: "AssertionError",
                message: "Oh no"
            });
        },

        "only emits one test:async event": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                tearDown: function (done) { done(); },
                test: function (done) { done(); }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        },

        "prefers test error over tearDown failure": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);
            this.runner.on("test:failure", listener);

            var a;
            var context = testCase("Test", {
                tearDown: function () { assert(false); },
                test: function () { a.b.c = 42; }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.name, "TypeError");
            }), assert.fail);
        },

        "prefers test error over tearDown failure with non-throwing assertion": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);
            this.runner.on("test:failure", listener);

            var a, runner = this.runner;
            var error = assertionError("Oops");
            var context = testCase("Test", {
                tearDown: function () { runner.error(error); },
                test: function () { a.b.c = 42; }
            });

            this.runner.runSuite([context]).then(done(function (results) {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.name, "TypeError");
            }), assert.fail);
        }
    });

    helper.testCase("TestRunnerImplicitAsyncTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "resolves run when test calls passed argument": function (done) {
            var callback, listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                test: function (done) {
                    callback = done;
                    testRunner.nextTick(function () {
                        callback.called = true;
                        callback();
                    });
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.called);
                assert.isFunction(callback);
                assert(callback.called);
            }));
        },

        "emits test:success when test calls passed argument": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:success", listener);

            var context = testCase("Test", {
                test: function (done) { testRunner.nextTick(done); }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));

            testRunner.nextTick(function () {
                assert(!listener.called);
            });
        },

        "done returns actual done if called with a function": function (done) {
            var innerDone;

            var context = testCase("Test", {
                test: function (done) {
                    testRunner.nextTick(done(function () {
                        innerDone = true;
                    }));
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(innerDone);
            }));

            testRunner.nextTick(function () {
                assert(!innerDone);
            });
        },

        "done completes test when called with non-function": function (tdone) {
            var context = testCase("Test", {
                test: function (done) {
                    testRunner.nextTick(function () {
                        done({ ok: function () {} });
                    });
                }
            });

            this.runner.runSuite([context]).then(tdone(function () {
                assert(true);
            }));
        },

        "done transparently proxies to its callback": function (done) {
            var innerDone = sinon.stub().returns(42);
            var thisp = { id: 42 };
            var returnValue;
            var fn = function (cb) {
                returnValue = cb.apply(thisp, [1, 2, 3]);
            };

            var context = testCase("Test", {
                test: function (done) { fn(done(innerDone)); }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(innerDone.calledOnce);
                assert.equals(returnValue, 42);
                assert(innerDone.calledOn(thisp));
                assert(innerDone.calledWithExactly(1, 2, 3));
            }));
        },

        "emits test:failure when AssertionError is thrown in callback": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                test: function (done) {
                    testRunner.nextTick(done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    }));
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "emits test:error when Error is thrown in done callback": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            var context = testCase("Test", {
                test: function (done) {
                    testRunner.nextTick(done(function () {
                        throw new Error("Oops");
                    }));
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "includes timeouts in suite:end results": function (done) {
            var listener = sinon.spy();
            this.runner.on("suite:end", listener);

            var context = testCase("My case", {
                test1: function (done) {}
            });

            this.runner.runSuite([context]).then(done(function () {
                assert.equals(listener.args[0][0].timeouts, 1);
            }));
        },

        "disarms callback when test times out": function (done) {
            var callback;
            var context = testCase("My case", {
                test1: function (done) { callback = done; }
            });

            this.runner.runSuite([context]).then(done(function () {
                refute.exception(function () {
                    callback();
                });
            }));
        }
    });

    helper.testCase("TestRunnerImplicitAsyncSetUpTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "resolves run when setUp calls passed argument": function (done) {
            var callback;
            var context = testCase("Test", {
                setUp: function (done) {
                    callback = done;
                    testRunner.nextTick(function () {
                        callback.called = true;
                        callback();
                    });
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert.defined(callback);
                assert(callback.called);
            }));
        },

        "emits test:start when setUp calls passed argument": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:start", listener);

            var context = testCase("Test", {
                setUp: function (done) {
                    testRunner.nextTick(done);
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));

            testRunner.nextTick(function () {
                assert(!listener.called);
            });
        },

        "emits test:failure when setUp done callback throws AssertionError": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                setUp: function (done) {
                    testRunner.nextTick(done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "emits test:error when setUp done callback throws Error": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            var context = testCase("Test", {
                setUp: function (done) {
                    testRunner.nextTick(done(function () {
                        throw new Error("Oops");
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "times out async setUp": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                setUp: function (done) {},
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "setUp");
            }));
        },

        "times out async setUp after custom timeout": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                setUp: function (done) { this.timeout = 100; },
                test: sinon.spy()
            });

            this.runner.runSuite([context]);
            setTimeout(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "setUp");
            }), 150);
        },

        "emits setUp, async, timeout for async setup": function (done) {
            var listeners = {
                timeout: sinon.spy(),
                async: sinon.spy(),
                setUp: sinon.spy()
            };

            this.runner.on("test:setUp", listeners.setUp);
            this.runner.on("test:async", listeners.async);
            this.runner.on("test:timeout", listeners.timeout);

            var context = testCase("Test", {
                setUp: function (done) {},
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listeners.setUp.calledOnce);
                assert(listeners.async.calledOnce);
                assert(listeners.timeout.calledOnce);
                assert(listeners.setUp.calledBefore(listeners.async));
                assert(listeners.async.calledBefore(listeners.timeout));
            }));
        },

        "emits test:async when setUp is async": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { testRunner.nextTick(done); },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        },

        "calling done synchronously does not make test asynchronous": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(!listener.calledOnce);
            }));
        },

        "does not emit test:async twice": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                test: function (done) { done(); }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit test:async more than once in nested async context": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                context1: {
                    setUp: function (done) { done(); },
                    test: function (done) { done(); }
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        }
    });

    helper.testCase("TestRunnerImplicitAsyncTearDownTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "resolves run when tearDown calls passed argument": function (done) {
            var callback;

            var context = testCase("Test", {
                tearDown: function (done) {
                    callback = done;
                    testRunner.nextTick(function () {
                        callback.called = true;
                        callback();
                    });
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(!!callback);
                assert(callback.called);
            }));
        },

        "emits test:success when tearDown calls passed argument": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:success", listener);

            var context = testCase("Test", {
                tearDown: function (done) {
                    testRunner.nextTick(function () {
                        done();
                    });
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));

            testRunner.nextTick(function () {
                assert(!listener.called);
            });
        },

        "emits test:failure when tearDown done callback throws AssertionError": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                tearDown: function (done) {
                    testRunner.nextTick(done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "emits test:error when tearDown done callback throws Error": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            var context = testCase("Test", {
                tearDown: function (done) {
                    testRunner.nextTick(done(function () {
                        throw new Error("Oops");
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "times out async tearDown": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                tearDown: function (done) {},
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "tearDown");
            }));
        },

        "times out async tearDown after custom timeout": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                tearDown: function (done) { this.timeout = 100; },
                test: sinon.spy()
            });

            this.runner.runSuite([context]);

            setTimeout(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "tearDown");
            }), 150);
        },

        "emits test:async when tearDown is async": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                tearDown: function (done) { testRunner.nextTick(done); },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit test:async more than once": function (done) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                tearDown: function (done) { done(); },
                test: function (done) { done(); }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit test:async after test failure": function (done) {
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:async", listeners[0]);
            this.runner.on("test:failure", listeners[1]);
            var runner = this.runner;

            var context = testCase("Test", {
                setUp: function () {},
                tearDown: function (done) { done(); },
                test: function (done) {
                    var e = new Error();
                    e.name = "AssertionError";
                    throw e;
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listeners[1].calledOnce);
                assert(!listeners[0].called);
            }));
        },

        "does not emit test:async for deferred test": function (done) {
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:async", listeners[0]);
            this.runner.on("test:deferred", listeners[1]);
            var runner = this.runner;
            var context = testCase("Test", {
                tearDown: function (done) { testRunner.nextTick(done); },
                "//test": function () {}
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(!listeners[0].called);
                assert(listeners[1].calledOnce);
            }));
        },

        "does not run setUp for deferred test": function (done) {
            var setUp = sinon.spy();
            var runner = this.runner;
            var context = testCase("Test", {
                setUp: setUp,
                "//test": function () {}
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(!setUp.called);
            }));
        },

        "does not run tearDown for deferred test": function (done) {
            var tearDown = sinon.spy();
            var runner = this.runner;
            var context = testCase("Test", {
                tearDown: tearDown,
                "//test": function () {}
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(!tearDown.called);
            }));
        }
    });

    helper.testCase("TestRunnerEventedAssertionsTest", {
        setUp: function () {
            var runner = this.runner = testRunner.create();

            this.assert = function (val) {
                if (!val) {
                    try {
                        throw assertionError("Assertion failed");
                    } catch (e) {
                        runner.assertionFailure(e);
                    }
                }
            };
        },

        "emits failure event": function (done) {
            var sAssert = this.assert;
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                "test it": function () { sAssert(false); }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                var args = listener.args;
                assert.equals(args[0][0].name, "test it");
                assert.equals(args[0][0].error.message, "Assertion failed");
            }));
        },

        "only emits failure event once per test": function (done) {
            var assert = this.assert;
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                "test it": function () {
                    assert(false);
                    assert(false);
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit error event after failures": function (done) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:error", listeners[1]);

            var context = testCase("Test", {
                "test it": function () {
                    assert(false);
                    throw new Error("WTF!");
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listeners[0].calledOnce);
                assert(!listeners[1].called);
            }));
        },

        "does not emit timeout event after failures": function (done) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:timeout", listeners[1]);

            var context = testCase("Test", {
                "test it": function (done) {
                    assert(false);
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(listeners[0].calledOnce);
                assert(!listeners[1].called);
            }));
        },

        "does not emit failure after timeout": function (done) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.timeout = 20;
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:timeout", listeners[1]);

            var context = testCase("Test", {
                "test it": function (done) {
                    setTimeout(function () {
                        assert(false);
                    }, 40);
                }
            });

            this.runner.runSuite([context]).then(function () {
                setTimeout(done(function () {
                    assert(!listeners[0].called);
                    assert(listeners[1].calledOnce);
                }), 20);
            });
        },

        "does not emit success after failure": function (done) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.timeout = 20;
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:success", listeners[1]);

            var context = testCase("Test", {
                "test it": function () { assert(false); }
            });

            this.runner.runSuite([context]).then(function () {
                setTimeout(done(function () {
                    assert(listeners[0].calledOnce);
                    assert(!listeners[1].called);
                }), 20);
            });
        }
    });

    helper.testCase("TestRunnerAssertionCountTest", {
        setUp: function () {
            this.context = testCase("Test + Assertions", { test1: function () {} });
            this.runner = testRunner.create({ failOnNoAssertions: true });
            this.listener = sinon.spy();
            this.runner.on("test:failure", this.listener);
        },

        "fails test if 0 assertions": function (done) {
            var listener = this.listener;

            this.runner.runSuite([this.context]).then(done(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not fail with 0 assertions if timing out": function (done) {
            var timeoutListener = sinon.spy();
            this.runner.on("test:timeout", timeoutListener);

            var context = testCase("Test + Assertions", {
                test1: function (done) {}
            });

            var listener = this.listener;

            this.runner.runSuite([context]).then(done(function () {
                assert(timeoutListener.calledOnce);
                refute(listener.called);
            }));
        },

        "does not fail test if 1 assertion": function (done) {
            var runner = this.runner;
            this.runner.on("test:start", function () {
                runner.assertionPass();
            });
            var listener = this.listener;

            this.runner.runSuite([this.context]).then(done(function () {
                assert(!listener.called);
            }));
        },

        "configures to not fail test if 0 assertions": function (done) {
            this.runner.failOnNoAssertions = false;
            var listener = this.listener;

            this.runner.runSuite([this.context]).then(done(function () {
                assert(!listener.called);
            }));
        },

        "fails for unexpected number of assertions": function (done) {
            var runner = this.runner;

            var context = testCase("Test Assertions", {
                test1: function () {
                    this.expectedAssertions = 2;
                    runner.assertionPass();
                    runner.assertionPass();
                    runner.assertionPass();
                }
            });
            var listener = this.listener;

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message,
                              "Expected 2 assertions, ran 3");
            }));
        },

        "only checks expected assertions for tests that explicitly define it": function (done) {
            var runner = this.runner;

            var context = testCase("Test Assertions", {
                test1: function () {
                    this.expectedAssertions = 2;
                    runner.assertionPass();
                    runner.assertionPass();
                    runner.assertionPass();
                },
                test2: function () {
                    runner.assertionPass();
                }
            });
            var listener = this.listener;

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].name, "test1");
            }));
        },

        "clears expected assertions when test fails for other reasons": function (done) {
            this.runner.on("test:error", this.listener);
            var runner = this.runner;

            var context = testCase("Test Assertions", {
                test1: function () {
                    this.expectedAssertions = 2;
                    throw new Error();
                },
                test2: function () {
                    runner.assertionPass();
                }
            });
            var listener = this.listener;

            this.runner.runSuite([context]).then(done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].name, "test1");
            }));
        },

        "counts assertions when asserting in callback to done": function (tdone) {
            var runner = this.runner;

            var context = testCase("Test Assertions", {
                test1: function (done) {
                    testRunner.nextTick(done(function () {
                        runner.assertionPass();
                        runner.assertionPass();
                    }));
                }
            });

            this.runner.runSuite([context]).then(tdone(function (result) {
                assert.equals(result.assertions, 2);
            }));
        }
    });

    helper.testCase("TestRunnerSupportRequirementsTest", {
        setUp: function () {
            this.runner = testRunner.create({
                handleUncaughtExceptions: false
            });

            this.test = sinon.spy();
        },

        "executes test normally when support is present": function (done) {
            var context = testCase("Test", {
                requiresSupportFor: { A: true },
                "should run this": this.test
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(test.calledOnce);
            }));
        },

        "does not execute test when support is absent": function (done) {
            var context = testCase("Test", {
                requiresSupportFor: { A: false },
                "does not run this": this.test
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(!test.called);
            }));
        },

        "does not execute test when support function returns falsy": function (done) {
            var context = testCase("Test", {
                requiresSupportFor: { A: function () { return; } },
                "does not run this": this.test
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(!test.called);
            }));
        },

        "executes test when support function returns truthy": function (done) {
            var context = testCase("Test", {
                requiresSupportFor: { A: function () { return "Ok"; } },
                "should run this": this.test
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(test.calledOnce);
            }));
        },

        "does not run test when not all support requirements are met": function (done) {
            var context = testCase("Test", {
                requiresSupportFor: {
                    A: function () { return "Ok"; },
                    B: function () { return false; }
                },
                "does not run this": this.test
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(!test.called);
            }));
        },

        "does not run test when no support requirements are met": function (done) {
            var context = testCase("Test", {
                requiresSupportForAny: {
                    A: function () { return; },
                    B: function () { return false; }
                },
                "does not run this": this.test
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(!test.called);
            }));
        },

        "runs test when at least one support requirement is met": function (done) {
            var context = testCase("Test", {
                requiresSupportForAny: {
                    A: function () { return true; },
                    B: function () { return false; }
                },
                "should run this": this.test
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(test.calledOnce);
            }));
        },

        "does not emit context:start event for unsupported context": function (done) {
            var listener = sinon.spy();
            this.runner.on("context:start", listener);

            var context = testCase("Test", {
                requiresSupportFor: { B: function () { return false; } },
                "should run this": this.test
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(!listener.called);
            }));
        },

        "does not run nested contexts in unsupported context": function (done) {
            var listener = sinon.spy();
            this.runner.on("context:start", listener);
            var context = testCase("Test", {
                requiresSupportFor: { B: function () { return false; } },
                something: {
                    "should run this": this.test
                }
            });

            var test = this.test;

            this.runner.runSuite([context]).then(done(function () {
                assert(!listener.called);
                assert(!test.called);
            }));
        }
    });

    helper.testCase("TestRunnerEventsTest", {
        setUp: function () {
            runnerEventsSetUp.call(this);
        },

        "emits event when starting suite": function (done) {
            this.runSuite([this.myCase], done(function (listeners) {
                assert(listeners["suite:start"].calledOnce);
            }));
        },

        "emit event when starting suite only once": function (done) {
            this.runSuite([this.myCase, this.otherCase], done(function (listeners) {
                assert(listeners["suite:start"].calledOnce);
            }));
        },

        "emits end suite event after context end": function (done) {
            this.runSuite([this.myCase], done(function (listeners) {
                assert(listeners["suite:end"].calledOnce);
                assert(listeners["suite:end"].calledAfter(
                    listeners["context:end"]
                ));
            }));
        },

        "emits event when starting context": function (done) {
            this.runSuite([this.myCase], done(function (listeners) {
                assert(listeners["context:start"].calledOnce);
            }));
        },

        "emits end context event after start context": function (done) {
            this.runSuite([this.myCase], done(function (listeners) {
                assert(listeners["context:end"].calledOnce);
                assert(listeners["context:end"].calledAfter(
                    listeners["context:start"]
                ));
            }));
        },

        "emits event when starting test": function (done) {
            this.runSuite([this.simpleCase], done(function (listeners) {
                assert(listeners["test:start"].calledOnce);
            }));
        },

        "emits setUp event before test:start": function (done) {
            this.runSuite([this.simpleCase], done(function (listeners) {
                assert(listeners["test:setUp"].calledOnce);
                assert(listeners["test:setUp"].calledBefore(
                    listeners["test:start"]
                ));
            }));
        },

        "emits tearDown event after test:start": function (done) {
            this.runSuite([this.simpleCase], done(function (listeners) {
                assert(listeners["test:tearDown"].calledOnce);
                assert(listeners["test:tearDown"].calledAfter(
                    listeners["test:start"]
                ));
            }));
        },

        "emits test:success when test passes": function (done) {
            this.runSuite([this.simpleCase], done(function (listeners) {
                assert(listeners["test:success"].calledOnce);
            }));
        },

        "does not emit test:success when setUp throws": function (done) {
            var context = testCase("My case", {
                setUp: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runSuite([context], done(function (listeners) {
                assert(!listeners["test:success"].called);
            }));
        },

        "does not emit test:success when test throws": function (done) {
            var context = testCase("My case", {
                setUp: sinon.spy(),
                testIt: sinon.stub().throws()
            });

            this.runSuite([context], done(function (listeners) {
                assert(!listeners["test:success"].called);
            }));
        },

        "does not emit test:success if tearDown throws": function (done) {
            var context = testCase("My case", {
                tearDown: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runSuite([context], done(function (listeners) {
                assert(!listeners["test:success"].called);
            }));
        },

        "emits test:fail when test throws assertion error": function (done) {
            var fn = sinon.stub().throws(this.assertionError);
            var context = testCase("My case", { testIt: fn });

            this.runSuite([context], done(function (listeners) {
                assert(listeners["test:failure"].calledOnce);
            }));
        },

        "emits test:fail if setUp throws assertion error": function (done) {
            var context = testCase("My case", {
                setUp: sinon.stub().throws(this.assertionError),
                testIt: sinon.spy()
            });

            this.runSuite([context], done(function (listeners) {
                assert(listeners["test:failure"].calledOnce);
            }));
        },

        "does not emit test:fail if test passes": function (done) {
            var context = testCase("My case", {
                setUp: sinon.spy(),
                testIt: sinon.stub()
            });

            this.runSuite([context], done(function (listeners) {
                assert(!listeners["test:failure"].called);
            }));
        },

        "emits test:fail if tearDown throws assertion error": function (done) {
            var context = testCase("My case", {
                tearDown: sinon.stub().throws(this.assertionError),
                testIt: sinon.spy()
            });

            this.runSuite([context], done(function (listeners) {
                assert(listeners["test:failure"].calledOnce);
            }));
        },

        "emits test:error when test throws": function (done) {
            var fn = sinon.stub().throws(new Error("Oops"));
            var context = testCase("My case", { testIt: fn });

            this.runSuite([context], done(function (listeners) {
                assert(listeners["test:error"].calledOnce);
            }));
        },

        "emits test:error if setUp throws": function (done) {
            var context = testCase("My case", {
                setUp: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runSuite([context], done(function (listeners) {
                assert(listeners["test:error"].calledOnce);
                assert(!listeners["test:failure"].called);
            }));
        },

        "does not emit test:error if test passes": function (done) {
            var context = testCase("My case", {
                setUp: sinon.spy(),
                testIt: sinon.stub()
            });

            this.runSuite([context], done(function (listeners) {
                assert(!listeners["test:error"].called);
            }));
        },

        "emits test:error if tearDown throws assertion error": function (done) {
            var context = testCase("My case", {
                tearDown: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runSuite([context], done(function (listeners) {
                assert(listeners["test:error"].calledOnce);
                assert(!listeners["test:failure"].called);
            }));
        },

        "emits test:deferred event": function (done) {
            var context = testCase("Test", {
                "// should do this": function () {}
            });

            var listener = this.listeners["test:deferred"];

            this.runSuite([context], done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].name, "should do this");
            }));
        },

        "emits test:deferred event with comment": function (done) {
            var context = testCase("Test", {
                "should do this": "Later, seriously"
            });

            var listener = this.listeners["test:deferred"];

            this.runSuite([context], done(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].comment, "Later, seriously");
            }));
        },

        "emits context:unsupported event": function (done) {
            var context = testCase("Test", {
                requiresSupportForAny: { A: false },
                "does not run this": this.test
            });

            this.runSuite([context], done(function (listeners) {
                assert(listeners["context:unsupported"].calledOnce);
            }));
        },

        "does not emit context:unsupported due to extended Object.prototype":
             function (done) {
                Object.prototype.mixin = function () {};

                var context = testCase("Test", {
                    "test": this.test
                });

                this.runSuite([context], done(function (listeners) {
                    assert(listeners["context:unsupported"].notCalled);
                }));
            }
    });

    helper.testCase("TestRunnerEventDataTest", {
        setUp: runnerEventsSetUp,

        "suite:start event data": function (done) {
            var context = testCase("My case", {});

            this.runSuite([context], done(function (listeners) {
                var ctx = listeners["suite:start"].args[0][0];
                assert.isObject(ctx.runtime);
            }));
        },

        "context:start event data": function (done) {
            var context = testCase("My case", {});

            this.runSuite([context], done(function (listeners) {
                var ctx = listeners["context:start"].args[0][0];
                assert.isObject(ctx.runtime);
                delete ctx.runtime;
                assert.equals(ctx, context);
            }));
        },

        "context:end event data": function (done) {
            var context = testCase("My case", {});

            this.runSuite([context], done(function (listeners) {
                var ctx = listeners["context:end"].args[0][0];
                assert.isObject(ctx.runtime);
                delete ctx.runtime;
                assert.equals(ctx, context);
            }));
        },

        "context:unsupported event data": function (done) {
            var context = testCase("My case", {
                requiresSupportFor: { "Feature A": false }
            });

            this.runSuite([context], done(function (listeners) {
                var arg = listeners["context:unsupported"].args[0][0];
                assert.isObject(arg.runtime);
                delete arg.runtime;
                assert.equals(arg, {
                    context: context,
                    unsupported: ["Feature A"]
                });
            }));
        },

        "test:setUp event data": function (done) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: function () {}
            });

            this.runSuite([context], done(function (listeners) {
                var args = listeners["test:setUp"].args;
                assert.isObject(args[0][0].runtime);
                assert.equals(args[0][0].name, "test1");
                assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            }));
        },

        "test:tearDown event data": function (done) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: function () {}
            });

            this.runSuite([context], done(function (listeners) {
                var args = listeners["test:tearDown"].args;
                assert.isObject(args[0][0].runtime);
                assert.equals("test1", args[0][0].name);
                assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            }));
        },

        "test:start event data": function (done) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: function () {}
            });

            this.runSuite([context], done(function (listeners) {
                var args = listeners["test:start"].args;
                assert.isObject(args[0][0].runtime);
                assert.equals(args[0][0].name, "test1");
                assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            }));
        },

        "test:error event data": function (done) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: sinon.stub().throws("TypeError")
            });

            this.runSuite([context], done(function (listeners) {
                var args = listeners["test:error"].args[0];
                assert.isObject(args[0].runtime);
                assert.equals(args[0].name, "test1");
                assert.equals(args[0].error.name, "TypeError");
                assert.equals(args[0].error.message, "");
                assert.match(args[0].error.stack, /\.js/);
            }));
        },

        "test:fail event data": function (done) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: sinon.stub().throws("AssertionError")
            });

            this.runSuite([context], done(function (listeners) {
                var args = listeners["test:failure"].args[0];
                assert.isObject(args[0].runtime);
                assert.equals(args[0].name, "test1");
                assert.equals(args[0].error.name, "AssertionError");
                assert.equals(args[0].error.message, "");
                assert.match(args[0].error.stack, /\.js/);
            }));
        },

        "test:success event data": function (done) {
            var runner = this.runner;

            var context = testCase("My case", {
                setUp: function () {},
                test1: function () {
                    runner.assertionPass();
                    runner.assertionPass();
                }
            });

            this.runSuite([context], done(function (listeners) {
                var args = listeners["test:success"].args[0];
                assert.isObject(args[0].runtime);
                delete args[0].runtime;
                assert.equals(args, [{ name: "test1", assertions: 2 }]);
            }));
        },

        "suite:end event data": function (done) {
            var runner = this.runner;

            var context = testCase("My case", {
                setUp: function () {},
                test1: function (done) {
                    runner.assertionPass();
                    runner.assertionPass();
                },
                test2: sinon.stub().throws(),
                "test3": sinon.spy(),
                test4: sinon.stub().throws("AssertionError"),
                inner: {
                    test5: sinon.spy()
                }
            });

            var context2 = testCase("My other case", {
                setUp: function () {},
                test1: function (done) {},
                test2: sinon.stub().throws(),
                "test3": sinon.spy(),
                test4: sinon.stub().throws("AssertionError"),
                inner: {
                    test5: sinon.spy()
                }
            });

            this.runner.timeout = 10;

            this.runSuite([context, context2], done(function (listeners) {
                var args = listeners["suite:end"].args[0];
                assert.isObject(args[0].runtime);
                assert.equals(args[0].contexts, 2);
                assert.equals(args[0].tests, 10);
                assert.equals(args[0].errors, 2);
                assert.equals(args[0].failures, 2);
                assert.equals(args[0].assertions, 2);
                assert.equals(args[0].timeouts, 2);
                assert.equals(args[0].deferred, 0);
                assert(!args[0].ok);
            }));
        },

        "suite:end event data passing test case": function (done) {
            var runner = this.runner;
            var test = function () { runner.assertionPass(); };

            var context = testCase("My case", {
                setUp: function () {},
                test1: test,
                test2: test,
                test3: test,
                test4: test,
                inner: {
                    test5: test
                }
            });

            this.runSuite([context, context], done(function (listeners) {
                var args = listeners["suite:end"].args[0];
                assert.equals(args[0].contexts, 2);
                assert.equals(args[0].tests, 10);
                assert.equals(args[0].errors, 0);
                assert.equals(args[0].failures, 0);
                assert.equals(args[0].assertions, 10);
                assert.equals(args[0].timeouts, 0);
                assert.equals(args[0].deferred, 0);
                assert(args[0].ok);
            }));
        },

        "suite:end event data deferred tests": function (done) {
            var runner = this.runner;
            var test = function () { runner.assertionPass(); };

            var context = testCase("My case", {
                setUp: function () {},
                "//test1": test,
                test2: test,
                test3: test,
                "//test4": test,
                inner: {
                    test5: test
                }
            });

            this.runSuite([context], done(function (listeners) {
                var args = listeners["suite:end"].args[0];
                assert.equals(args[0].contexts, 1);
                assert.equals(args[0].tests, 3);
                assert.equals(args[0].errors, 0);
                assert.equals(args[0].failures, 0);
                assert.equals(args[0].assertions, 3);
                assert.equals(args[0].timeouts, 0);
                assert.equals(args[0].deferred, 2);
                assert(args[0].ok);
            }));
        },

        "uncaughtException event data": function (done) {
            if (typeof document !== "undefined") {
                console.log("'uncaughtException event data':\n Aborting test, as " +
                            "browsers may not have enough information to extract " +
                            "useful event data");
                return done();
            }

            var context = testCase("My case", {
                "test1": function (done) {
                    setTimeout(function () {
                        throw new Error("Damnit");
                    }, 15);
                }
            });

            this.runner.handleUncaughtExceptions = true;
            this.runner.timeout = 5;
            var listener = this.listeners.uncaughtException;

            setTimeout(done(function () {
                assert(listener.calledOnce);
                assert.isObject(listener.args[0][0].runtime);
                assert.match(listener.args[0][0].message, /Damnit/);
            }), 25);

            this.runSuite([context]);
        }
    });

    helper.testCase("TestRunnerContextSetUpTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "contextSetUp this is prototype of test function this": function (done) {
            var prepare = sinon.spy();
            var testFn = sinon.spy();
            var context = testCase("Test", { prepare: prepare, test: testFn });

            this.runner.runContext(context).then(done(function () {
                assert(prepare.calledOnce);
                assert.hasPrototype(testFn.thisValues[0], prepare.thisValues[0]);
            }));
        },

        "contextSetUp this is prototype of nested test this": function (done) {
            var prepare = sinon.spy();
            var testFn = sinon.spy();
            var context = testCase("Test", {
                prepare: prepare,
                context: { test: testFn }
            });

            this.runner.runContext(context).then(done(function () {
                assert(prepare.calledOnce);
                assert.hasPrototype(testFn.thisValues[0], prepare.thisValues[0]);
            }));
        },

        "contextSetUp is only called once": function (done) {
            var prepare = sinon.spy();
            var context = testCase("Test", {
                prepare: prepare,
                test1: function () {},
                test2: function () {},
                test3: function () {},
                ctx2: {
                    test4: function () {},
                    test5: function () {}
                }
            });

            this.runner.runContext(context).then(done(function () {
                assert(prepare.calledOnce);
            }));
        },

        "calls prepare before setUp": function (done) {
            var prepare = sinon.spy();
            var setUp = sinon.spy();
            var context = testCase("Test", {
                prepare: prepare,
                setUp: setUp,
                test: function () {}
            });

            this.runner.runContext(context).then(done(function () {
                assert(prepare.calledBefore(setUp));
            }));
        },

        "does not call setUp until prepare resolves": function (done) {
            var doneCb;
            var setUp = sinon.spy();
            var prepare = function (done) { doneCb = done; };
            var context = testCase("Test", {
                prepare: prepare,
                setUp: setUp,
                test: function () {}
            });

            var testRun = this.runner.runContext(context).then(done(function () {
                assert(setUp.calledOnce);
            }));

            refute(setUp.calledOnce);
            testRunner.nextTick(function () {
                doneCb();
            });
        },

        "does not reject if contextSetUp fails": function (done) {
            var prepare = sinon.stub().throws();
            var context = testCase("Test", {
                prepare: prepare,
                test: sinon.spy()
            });

            this.runner.runContext(context).then(function () {
                done();
            }, function () {
                assert.fail();
            });
        },

        "does not call setUp if prepare throws": function (done) {
            var setUp = sinon.spy();
            var prepare = sinon.stub().throws();
            var context = testCase("Test", {
                setUp: setUp,
                prepare: prepare,
                test: function () {}
            });

            this.runner.runContext(context).then(done(function () {
                assert(!setUp.called);
            }));
        },

        "does not call setUp if prepare rejects": function (done) {
            var deferred = when.defer();
            var setUp = sinon.spy();
            var prepare = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", {
                prepare: prepare,
                setUp: setUp,
                test: function () {}
            });

            this.runner.runContext(context).then(done(function () {
                assert(!setUp.called);
            }));

            deferred.reject();
        },

        "emits uncaughtException if prepare rejects": function (done) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var prepare = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { prepare: prepare });

            this.runner.runContext(context).then(done(function () {
                assert(listener.called);
            }));

            deferred.reject();
        },

        "emits uncaughtException if prepare throws": function (done) {
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var prepare = sinon.stub().throws();
            var context = testCase("Test", { prepare: prepare });

            this.runner.runContext(context).then(done(function () {
                assert(listener.called);
            }));
        },

        "emits uncaughtException if prepare times out": function (done) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var prepare = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { prepare: prepare });

            this.runner.runContext(context).then(done(function () {
                assert(listener.called);
            }));
        },

        "times out prepare after custom timeout": function (done) {
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var context = testCase("Test", {
                prepare: function (done) { this.timeout = 100; }
            });

            this.runner.runContext(context);

            setTimeout(done(function () {
                assert(listener.called);
            }), 150);
        }
    });

    helper.testCase("TestRunnerContextTearDownTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "contextTearDown this is prototype of test function this": function (done) {
            var conclude = sinon.spy();
            var tfn = sinon.spy();
            var context = testCase("Test", { conclude: conclude, test: tfn });

            this.runner.runContext(context).then(done(function () {
                assert(conclude.calledOnce);
                assert.hasPrototype(tfn.thisValues[0], conclude.thisValues[0]);
            }));
        },

        "contextTearDown is only called once": function (done) {
            var conclude = sinon.spy();
            var context = testCase("Test", {
                conclude: conclude,
                test1: function () {},
                test2: function () {},
                test3: function () {},
                ctx2: {
                    test4: function () {},
                    test5: function () {}
                }
            });

            this.runner.runContext(context).then(done(function () {
                assert(conclude.calledOnce);
            }));
        },

        "calls conclude after tearDown": function (done) {
            var conclude = sinon.spy();
            var tearDown = sinon.spy();
            var context = testCase("Test", {
                conclude: conclude,
                tearDown: tearDown,
                test: function () {}
            });

            this.runner.runContext(context).then(done(function () {
                assert(conclude.calledAfter(tearDown));
            }));
        },

        "does not finish until conclude resolves": function (done) {
            var listener = sinon.spy();
            this.runner.on("context:end", listener);
            var doneCb;
            var conclude = function (done) { doneCb = done; };
            var context = testCase("Test", {
                conclude: conclude,
                test: function () {}
            });

            var testRun = this.runner.runContext(context).then(done(function () {
                assert(listener.calledOnce);
            }));

            refute(listener.calledOnce);
            testRunner.nextTick(function () {
                doneCb();
            });
        },

        "does not reject if contextTearDown fails": function (done) {
            var conclude = sinon.stub().throws();
            var context = testCase("Test", {
                conclude: conclude,
                test: sinon.spy()
            });

            this.runner.runContext(context).then(function () {
                done();
            }, function () {
                assert.fail();
            });
        },

        "emits uncaughtException if conclude rejects": function (done) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var conclude = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { conclude: conclude });

            this.runner.runContext(context).then(done(function () {
                assert(listener.called);
            }));

            deferred.reject();
        },

        "emits uncaughtException if conclude throws": function (done) {
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var conclude = sinon.stub().throws();
            var context = testCase("Test", { conclude: conclude });

            this.runner.runContext(context).then(done(function () {
                assert(listener.called);
            }));
        },

        "emits uncaughtException if conclude times out": function (done) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var conclude = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { conclude: conclude });

            this.runner.runContext(context).then(done(function () {
                assert(listener.called);
            }));
        }
    });

    helper.testCase("TestRunnerFocusTest", {
        setUp: function () {
            this.runner = testRunner.create({ runtime: "Node 0.8" });
        },

        "runs focused test": function (done) {
            var tfn = sinon.spy();
            var context = testCase("Test", { "=> do it": tfn });

            this.runner.runSuite([context]).then(done(function () {
                assert(tfn.calledOnce);
            }));
        },

        "only runs focused test": function (done) {
            var focused = sinon.spy();
            var unfocused = sinon.spy();
            var context = testCase("Test", {
                "=> do it": focused,
                "don't do it": unfocused
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(focused.calledOnce);
                refute(unfocused.called);
            }));
        },

        "runs nested focused test": function (done) {
            var focused = sinon.spy();
            var unfocused = sinon.spy();
            var context = testCase("Test", {
                "don't do it": unfocused,
                "nested": {
                    "=> do it": focused
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(focused.calledOnce);
                refute(unfocused.called);
            }));
        },

        "runs all focused tests": function (done) {
            var focused = sinon.spy();
            var context = testCase("Test", {
                "=> nested": {
                    "don't do it": focused,
                    "do it": focused
                }
            });

            this.runner.runSuite([context]).then(done(function () {
                assert(focused.calledTwice);
            }));
        },

        "emits runner:focus event": function (done) {
            var context = testCase("Test", {
                "=>don't do it": function () {}
            });

            this.runner.on("runner:focus", done(function (e) {
                assert.isObject(e.runtime);
            }));
            this.runner.runSuite([context]);
        }
    });

    // Keep this case at the bottom.
    // TODO: Figure out why listening for uncaught exceptions somehow makes it
    // impossible to set a shorter timeout in other test cases...
    helper.testCase("RunnerRunAwayExceptionsTest", {
        "catches uncaught asynchronous errors": function (done) {
            var runner = testRunner.create();
            runner.timeout = 20;
            var listener = sinon.spy(function (e) {
                if (e.message !== "Oops!") { console.log(e.stack); }
            });
            runner.on("uncaughtException", listener);

            var context = testCase("Test", {
                "does not fail, ever": function (done) {
                    setTimeout(function () {
                        throw new Error("Oops!");
                    }, 30);
                }
            });

            runner.runSuite([context]).then(function () {
                setTimeout(done(function () {
                    assert(listener.calledOnce);
                }), 50);
            });
        },

        "does not handle asynchronous failure as uncaught exception": function (done) {
            if (typeof document !== "undefined") {
                console.log("'does not handle asynchronous failure as uncaught " +
                            "exception':\nAborting test, as browsers may not have " +
                            "enough information for uncaught errors to treat them as " +
                            "assertion failures");
                return done();
            }

            console.log("TODO: test-runner-test.js#2772, this test never " +
                        "completes properly. Figure out why. Suspected bug " +
                        "in 'uncaught exception may be assertion error' code");
            return done();
            /*
             var runner = testRunner.create();
             var listeners = [sinon.spy(), sinon.spy()];
             runner.on("uncaughtException", listeners[0]);
             runner.on("test:failure", listeners[1]);

             var context = testCase("Test", {
             "should fail with regular AssertionError": function (done) {
             testRunner.nextTick(function () {
             throw assertionError("[assert] Failed assertion asynchronously");
             });
             }
             });

             runner.runSuite([context]).then(done(function () {
             refute(listeners[0].called);
             assert(listeners[1].calledOnce);
             }));
             */
        }
    });

    helper.testCase("Test configuration", {
        setUp: function () {
            this.ua = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:16.0) " +
                "Gecko/20100101 Firefox/16.0";
            this.suite = [testCase("Test + Assertions", { test1: function () {} })];
        },

        "emits suite:configuration with runtime": function () {
            var runner = testRunner.create({ runtime: this.ua });
            var config;
            var listener = function (c) { config = c; };

            runner.on("suite:configuration", listener);
            runner.runSuite(this.suite);

            assert.equals(config.runtime.name, "Firefox");
        },

        "does not emit suite:configuration with no runtime": function () {
            var runner = testRunner.create({});
            var listener = sinon.spy();
            runner.on("suite:configuration", listener);
            runner.runSuite(this.suite);

            refute(listener.called);
        },

        "emits suite:configuration with configuration": function () {
            var runner = testRunner.create({
                runtime: this.ua,
                configuration: "Browser tests"
            });
            var config;
            var listener = sinon.spy(function (c) { config = c; });

            runner.on("suite:configuration", listener);
            runner.runSuite(this.suite);

            assert.equals(config.name, "Browser tests");
            assert.defined(config.seed);
        }
    });

    helper.testCase("Test configuration event data", {
        setUp: function () {
            this.ua = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:16.0) " +
                "Gecko/20100101 Firefox/16.0";
            this.runner = testRunner.create({ runtime: this.ua });
            var listener = sinon.spy();
            this.runner.on("suite:configuration", listener);
            this.runSuite = function (suite, callback) {
                this.runner.runSuite(suite).then(function () {
                    callback(listener.args[0][0]);
                });
            };
        },

        "no tests": function (done) {
            var context = testCase("My case", {});

            this.runSuite([context], done(function (data) {
                assert.isObject(data.runtime);
                assert.equals(data.tests, 0);
            }));
        },

        "with tests": function (done) {
            var context = testCase("My case", {
                "a": function () {},
                "b": function () {},
                "c": function () {}
            });

            this.runSuite([context], done(function (data) {
                assert.equals(data.tests, 3);
            }));
        },

        "with nested tests": function (done) {
            var context = testCase("My case", {
                "a": function () {},
                "b": function () {},
                "c": function () {},
                "d": { "e": function () {} }
            });

            this.runSuite([context], done(function (data) {
                assert.equals(data.tests, 4);
            }));
        },

        "with async test groups": function (done) {
            var context = testCase("My case", function () {
                return when({
                    "a": function () {},
                    "b": function () {},
                    "c": function () {}
                });
            });

            this.runner.on("suite:configuration", done(function (data) {
                assert.equals(data.tests, 0);
            }));

            this.runSuite([context]);
        }
    });
});
