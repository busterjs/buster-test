((typeof require === "function" && function (reqs, callback) {
    module.exports = callback.apply(this, reqs.map(function (req) {
        return require(req);
    }));
}) || define)(["referee"], function (referee) {
    "use strict";
    var wait = setTimeout;

    function runTest(name, test, setUp, tearDown, next) {
        function handleError(e) {
            console.log(name + " failed: ");
            console.log(e.stack);
            return next(false);
        }

        var ctx = {};

        function complete(cb) {
            function doComplete(err) {
                try {
                    tearDown.call(ctx);
                } catch (e) {
                    err = err || e;
                }
                if (err) {
                    return handleError(err);
                }
                next(true);
            }
            if (typeof cb === "function") {
                return function () {
                    var err;
                    try {
                        cb.apply(null, arguments);
                    } catch (e) {
                        err = e;
                    }
                    doComplete(err);
                };
            }
            doComplete();
        }

        try {
            setUp.call(ctx);
            if (test.length > 0) {
                test.call(ctx, complete);
            } else {
                test.call(ctx);
                complete();
            }
        } catch (e) {
            if (typeof tearDown === "function") {
                try {
                    tearDown.call(ctx);
                } catch (e) {}
            }
            handleError(e);
        }
    }

    function runTestCase(testCase, cb) {
        var setUp = testCase.tests.setUp || function () {};
        var tearDown = testCase.tests.tearDown || function () {};
        var name, total = 0, passed = 0, names = [];

        for (name in testCase.tests) {
            if (!/^(setUp|tearDown)$/.test(name)) {
                names.push(name);
            }
        }

        function done() {
            var color = passed === total ? "\x1b[32m" : "\x1b[31m";
            console.log(color + testCase.name + ": " +
                        passed + "/" + total + "\x1b[0m");
            cb();
        }

        function runNext() {
            if (names.length === 0) { return done(); }
            total += 1;
            var name = names.shift();

            var timer = wait(function () {
                var message = name + " timed out";
                console.log("\x1b[31m=>", message + "\x1b[0m");
                throw new Error(message);
            }, 600);

            runTest(name, testCase.tests[name], setUp, tearDown, function (ok) {
                clearTimeout(timer);
                passed += ok ? 1 : 0;
                runNext();
            });
        }

        runNext();
    }

    var testCases = [], running = false;

    function start() {
        if (!running && testCases.length > 0) {
            running = true;
            var tc = testCases.shift();
            runTestCase(tc, function () {
                running = false;
                start();
            });
        }
    }

    function testCase(caseName, tests) {
        testCases.push({ name: caseName, tests: tests });
        start();
    }

    return { testCase: testCase };
});
