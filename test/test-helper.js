(typeof require === "function" && function (reqs, callback) {
    module.exports = callback.apply(this, reqs.map(function (req) {
        return require(req);
    }));
} || define)(["referee"], function (referee) {
    "use strict";

    function runTest(name, test, setUp, tearDown, next) {
        function handleError(e) {
            console.log(name + " failed: ");
            console.log(e.stack);
            return next(false);
        }

        function complete(cb) {
            function doComplete() {
                try {
                    tearDown.call(ctx);
                } catch (e) {
                    return handleError(e);
                }
                next(true);
            }
            if (typeof cb === "function") {
                return function () {
                    cb();
                    doComplete();
                };
            }
            doComplete();
        }

        var ctx = {};

        try {
            setUp.call(ctx);
            if (test.length > 0) {
                test.call(ctx, complete);
            } else {
                test.call(ctx);
                complete();
            }
        } catch (e) {
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
            var color = passed == total ? "\x1b[32m" : "\x1b[31m";
            console.log(color + testCase.name + ": " + passed + "/" + total + "\x1b[0m");
            cb();
        }

        function runNext() {
            if (names.length === 0) { return done(); }
            total += 1;
            var name = names.shift();
            var timer = setTimeout(function () {
                throw new Error(name + " timed out");
            }, 500);

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
            runTestCase(testCases.shift(), function () {
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
