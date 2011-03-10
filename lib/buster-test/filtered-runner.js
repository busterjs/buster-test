var fs = require("fs");
var path = require("path");
var buster = require("buster-core");
buster.promise = require("buster-promise");
buster.testContextFilter = require("./test-context-filter");
buster.testCase = require("./test-case");
buster.spec = require("./spec");

module.exports = function filteredRunner(fpath, opt) {
    var cases = [];
    opt = opt || {};

    buster.testCase.onCreate = buster.spec.onCreate = function (tc) {
        cases.push(buster.testContextFilter(tc, opt.filter));
    };

    requireFiles(fpath).then(function () {
        var runner = buster.testRunner.create(opt);
        var reporter = buster.xUnitConsoleReporter.create(opt).listen(runner);
        runner.runSuite(cases);
    });
};

function requireFiles(fpath) {
    var promise = buster.promise.create();

    fs.stat(fpath, function (err, stat) {
        if (!stat) {
            return;
        }

        if (stat.isDirectory()) {
            fs.readdir(fpath, function (err, files) {
                var promises = [];

                (files || []).forEach(function (file) {
                    promises.push(requireFiles(path.join(fpath, file)));
                });

                buster.promise.all.apply(buster.promise, promises).then(function () {
                    promise.resolve();
                });
            });
        } else {
            try {
                require(fpath.replace(/\.[^\.]+$/, ""));
            } catch (e) {}

            promise.resolve();
        }
    });

    return promise;
}
