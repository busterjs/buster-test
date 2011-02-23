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

    buster.testCaseRunner = {
        run: function (context) {
            var promise = buster.promise.create();

            if (context) {
                var self = this;

                this.runTests(context).then(function () {
                    var queue = buster.util.asyncQueue.create();
                    var contexts = context.contexts().slice();

                    queue.process(contexts, self.run, self).then(function () {
                        promise.resolve();
                    });
                });
            } else {
                promise.reject("Provide a context object");
            }

            return promise;
        },

        runTests: function (context) {
            var queue = buster.util.asyncQueue.create(
                context.testCase,
                getAll(context, "setUp", "push"),
                context.getTearDown());

            return queue.process(context.tests().slice(), this.runTest, this);
        },

        runTest: function (test, testCase, setUps, tearDown) {
            var promise = buster.promise.create();
            promise.id = test.name;

            buster.util.nextTick(function () {
                var testResult;

                try {
                    for (var i = 0, l = setUps.length; i < l; ++i) {
                        setUps[i].call(testCase);
                    }

                    testResult = test.func.call(testCase);
                } catch (e) {}
                
                try {
                    if (tearDown) {
                        tearDown.call(testCase);
                    }
                } catch (e) {}

                if (testResult && testResult.then) {
                    testResult.then(function () {
                        promise.resolve();
                    });
                } else {
                    promise.resolve();
                }
            });

            return promise;
        }
    };

    buster.testRunner = {
        create: function (context) {
            var runner = buster.util.create(this);
            runner.testCase = context.testCase;
            runner.tests = context.tests();
            runner.setUp = context.getSetUp();
            runner.tearDown = context.getTearDown();

            return runner;
        },

        run: function () {
            var promise = buster.promise.create();
            this.runOne(this.tests.shift(), promise);

            return promise;
        },

        runOne: function (test, promise) {
            var self = this;

            buster.util.nextTick(function () {
                if (!test) {
                    return promise.resolve();
                }

                try {
                    if (self.setUp) {
                        self.setUp.call(self.testCase);
                    }

                    test.func.call(self.testCase);
                } catch (e) {}
                
                try {
                    if (self.tearDown) {
                        self.tearDown.call(self.testCase);
                    }
                } catch (e) {}

                self.runOne(self.tests.shift(), promise);
            });
        }
    };



    // (function () {
    //     function getAll(context, method, appendMethod) {
    //         var func, funcs = [], ctx = context;
    //         var getter = "get" + method.substr(0, 1).toUpperCase () + method.substr(1);

    //         while (ctx) {
    //             func = ctx[getter]();

    //             if (typeof func == "function") {
    //                 funcs[appendMethod](func);
    //             }

    //             ctx = ctx.parent;
    //         }

    //         return funcs;
    //     }

    //     function callAllOn(funcs, ctx) {
    //         for (var i = 0, l = funcs.length; i < l; ++i) {
    //             funcs[i].call(ctx);
    //         }
    //     }

    //     buster.testRunner = buster.util.extend(buster.util.create(buster.eventEmitter), {
    //         failOnNoAssertions: true,

    //         runSuite: function (suite) {
    //             sys.puts("*** Start suite");
    //             this.emit("suite:start");
    //             this.results = { contexts: 0, tests: 0, failures: 0, errors: 0, assertions: 0 };
    //             var promise, self = this;

    //             for (var i = 0, l = suite.length; i < l; ++i) {
    //                 if (!promise) {
    //                     promise = this.run(suite[i]);
    //                 } else {
    //                     (function (s) {
    //                         promise = promise.then(function () {
    //                             self.results.contexts += 1;
    //                             self.run(s);
    //                         });
    //                     }(suite[i]));
    //                 }
    //             }

    //             promise.then(function () {
    //                 self.results.contexts += 1;
    //                 self.results.ok = self.results.tests > 0 && self.results.assertions > 0;
    //                 self.emit("*** suite:end", self.results);
    //                 delete self.results;
    //             });

    //             return promise;
    //         },

    //         run: function (context) {
    //             sys.puts("*** Run context");
    //             if (!context || !context.tests) {
    //                 throw new TypeError("Pass in a test context to run");
    //             }

    //             if (!this.results) {
    //                 this.results = { tests: 0, failures: 0, errors: 0, assertions: 0 };
    //             }

    //             this.emit("context:start", context);
    //             var tests = context.tests();
    //             var setUps = this.getSetUps(context);
    //             var tearDowns = this.getTearDowns(context);
    //             var self = this;
    //             var promise = buster.promise.create();
    
    //             buster.util.nextTick(function () {
    //                 var error, event;

    //                 for (var i = 0, l = tests.length; i < l; ++i) {
    //                     self.results.tests += 1;
    //                     error = self.runTest(tests[i], setUps, tearDowns);

    //                     if (!error) {
    //                         error = self.checkAssertionCount(tests[i]);
    //                     }

    //                     delete context.testCase.expectedAssertions;
    //                     self.emitResult(tests[i], error);
    //                 }

    //                 var contexts = context.contexts();

    //                 for (i = 0, l = contexts.length; i < l; ++i) {
    //                     self.run(contexts[i]);
    //                 }

    //                 self.emit("context:end", context);
    //                 sys.puts("*** End context");
    //                 promise.resolve();
    //             });

    //             return promise;
    //         },

    //         runTest: function (test, setUps, tearDowns) {
    //             var error, testCase = test.context.testCase;

    //             try {
    //                 this.emit("test:setUp", { name: test.name });
    //                 callAllOn(setUps, testCase);
    //                 this.emit("test:start", { name: test.name });
    //                 test.func.call(testCase);
    //             } catch (e) {
    //                 error = e;
    //             }

    //             try {
    //                 this.emit("test:tearDown", { name: test.name });
    //                 callAllOn(tearDowns, testCase);
    //             } catch (err) {
    //                 error = err;
    //             }

    //             return error;
    //         },

    //         checkAssertionCount: function (test) {
    //             var assertionCount = this.assertionCount();
    //             assertionCount = typeof assertionCount == "number" ? assertionCount : 0;

    //             try {
    //                 if (this.failOnNoAssertions && assertionCount == 0) {
    //                     var zeroAssertError = new Error("0 assertions");
    //                     zeroAssertError.name = "AssertionError";
    //                     throw zeroAssertError;
    //                 }
    //             } catch (err) {
    //                 return err;
    //             }

    //             try {
    //                 var expected = test.context.testCase.expectedAssertions;

    //                 if (typeof expected == "number" && assertionCount != expected) {
    //                     var assertCountError = new Error("Expected " + expected +
    //                                                      " assertions, ran " +
    //                                                      assertionCount);
    //                     assertCountError.name = "AssertionError";
    //                     throw assertCountError;
    //                 }
    //             } catch (err2) {
    //                 return err2;
    //             }
    //         },

    //         emitResult: function (test, err) {
    //             if (err) {
    //                 var type;

    //                 if (err.name == "AssertionError") {
    //                     type = "failure";
    //                     this.results.failures += 1;
    //                 } else {
    //                     this.results.errors += 1;
    //                     type = "error";
    //                 }

    //                 this.emit("test:" + type, {
    //                     name: test.name,
    //                     error: {
    //                         name: err.name,
    //                         message: err.message,
    //                         stack: err.stack
    //                     }
    //                 });
    //             } else {
    //                 this.results.assertions += this.assertionCount();

    //                 this.emit("test:success", {
    //                     name: test.name,
    //                     assertions: this.assertionCount()
    //                 });
    //             }
    //         },

    //         getSetUps: function (context) {
    //             return getAll(context, "setUp", "unshift");
    //         },

    //         getTearDowns: function (context) {
    //             return getAll(context, "tearDown", "push");
    //         },

    //         assertionCount: function () {}
    //     });
    // }());
}());

if (typeof module != "undefined") {
    module.exports = {
        testCaseRunner: buster.testCaseRunner,
        testRunner: buster.testRunner
    };
}
