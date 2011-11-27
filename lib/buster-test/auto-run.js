if (typeof require != "undefined") {
    var buster = require("buster-core");
    buster.testRunner = require("./test-runner");
    buster.reporters = require("./reporters");
    buster.testContext = require("./test-context");
    buster.moduleLoader = require("buster-module-loader");
}

(function () {
    buster.autoRun = function (opt, done) {
        var runners = 0, contexts = [], timer;

        buster.testRunner.onCreate(function (runner) {
            runners += 1;
        });

        if (typeof opt == "function") {
            done = opt;
            opt = {};
        }

        return function (tc) {
            contexts.push(tc);
            clearTimeout(timer);

            timer = setTimeout(function () {
                if (runners == 0) {
                    var env = typeof process != "undefined" && process.env || {};
                    opt = buster.extend(buster.autoRun.envOptions(env), opt);
                    buster.autoRun.run(contexts, opt, done);
                }
            }, 0);
        };
    };

    buster.autoRun.envOptions = function (env) {
        return {
            reporter: env.BUSTER_REPORTER,
            filters: (env.BUSTER_FILTERS || "").split(","),
            color: env.BUSTER_COLOR == "false" ? false : true,
            bright: env.BUSTER_BRIGHT == "false" ? false : true,
            timeout: env.BUSTER_TIMEOUT && parseInt(env.BUSTER_TIMEOUT),
            failOnNoAssertions: env.BUSTER_FAIL_ON_NO_ASSERTIONS == "false" ? false : true
        };
    };

    buster.autoRun.run = function (contexts, opt, done) {
        if (contexts.length == 0) return;
        opt = buster.extend({ color: true, bright: true }, opt);

        var runner = buster.testRunner.create(buster.extend({
            timeout: 750,
            failOnNoAssertions: false
        }, opt));

        initializeReporter(runner, opt);
        runner.runSuite(buster.testContext.compile(contexts, opt.filters));

        if (typeof done == "function") {
            runner.on("suite:end", done);
        }
    }

    function initializeReporter(runner, opt) {
        var reporter;

        if (typeof document != "undefined" && document.getElementById) {
            reporter = "html";
            opt.root = document.getElementById("buster") || document.body;
        } else {
            reporter = opt.reporter || "dots";
        }

        reporter = buster.reporters.load(reporter).create(opt);
        reporter.listen(runner);

        if (typeof reporter.log == "function" &&
            typeof buster.console == "function") {
            buster.console.bind(reporter, ["log"]);
        }
    }
}());

if (typeof module != "undefined") {
    module.exports = buster.autoRun;
}
