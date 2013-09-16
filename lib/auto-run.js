((typeof define === "function" && define.amd && function (m) {
    define("buster-test/auto-run", ["lodash", "buster-test/test-context", "buster-test/test-runner", "buster-test/reporters"], m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
        module.exports = m(
            require("lodash"),
            require("./test-context"),
            require("./test-runner"),
            require("./reporters")
        );
    }) || function (m) {
    this.buster.autoRun = m(
        this._,
        this.buster.testContext,
        this.buster.testRunner,
        this.buster.reporters
    );
})(function (_, testContext, testRunner, reporters) {
    "use strict";

    function browserEnv() {
        var env = {};
        var key, value, pieces, params = window.location.search.slice(1).split("&");

        for (var i = 0, l = params.length; i < l; ++i) {
            pieces = params[i].split("=");
            key = pieces.shift();
            value = pieces.join("=") || "1";
            if (key) {
                key = "BUSTER_" + key.match(/(^|[A-Z])[a-z]+/g).join("_").toUpperCase();
                env[key] = value;
            }
        }

        return env;
    }

    function env() {
        if (typeof process !== "undefined") { return process.env; }
        if (typeof window === "undefined") { return {}; }
        return browserEnv();
    }

    function autoRun(opt, callbacks) {
        var runners = 0, contexts = [], timer;

        testRunner.onCreate(function (runner) {
            runners += 1;
        });

        if (typeof opt === "function") {
            callbacks = opt;
            opt = {};
        }

        if (typeof callbacks !== "object") {
            callbacks = { end: callbacks };
        }

        return function (tc) {
            contexts.push(tc);
            clearTimeout(timer);

            timer = setTimeout(function () {
                if (runners === 0) {
                    opt = _.extend(autoRun.envOptions(env()), opt);
                    autoRun.run(contexts, opt, callbacks);
                }
            }, 10);
        };
    }

    autoRun.envOptions = function (env) {
        return {
            reporter: env.BUSTER_REPORTER,
            filters: (env.BUSTER_FILTERS || "").split(","),
            color: env.BUSTER_COLOR === "false" ? false : true,
            bright: env.BUSTER_BRIGHT === "false" ? false : true,
            timeout: env.BUSTER_TIMEOUT && parseInt(env.BUSTER_TIMEOUT, 10),
            failOnNoAssertions: env.BUSTER_FAIL_ON_NO_ASSERTIONS === "false" ?
                    false : true,
            random: env.BUSTER_RANDOM === "0" || env.BUSTER_RANDOM === "false" ? false : true,
            randomSeed: env.BUSTER_RANDOM_SEED
        };
    };

    function initializeReporter(runner, opt) {
        var reporter;

        if (typeof document !== "undefined" && document.getElementById) {
            reporter = "html";
            opt.root = document.getElementById("buster") || document.body;
        } else {
            reporter = opt.reporter || "brief";
        }

        reporter = reporters.load(reporter).create(opt);
        reporter.listen(runner);

        if (typeof reporter.log === "function" &&
                typeof buster === "object" &&
                typeof buster.console === "function") {
            buster.console.on("log", reporter.log, reporter);
        }
    }

    function ua() {
        if (typeof navigator !== "undefined") {
            return navigator.userAgent;
        }
        return [process.title, process.version + ",",
                process.platform, process.arch].join(" ");
    }

    autoRun.run = function (contexts, opt, callbacks) {
        callbacks = callbacks || {};
        if (contexts.length === 0) { return; }
        opt = _.extend({ color: true, bright: true }, opt);

        var runner = testRunner.create(_.extend({
            timeout: 750,
            failOnNoAssertions: false,
            runtime: ua(),
            random: typeof opt.random === "boolean" ? opt.random : true,
            randomSeed: opt.randomSeed
        }, opt));

        if (typeof callbacks.start === "function") {
            callbacks.start(runner);
        }

        initializeReporter(runner, opt);

        if (typeof callbacks.end === "function") {
            runner.on("suite:end", callbacks.end);
        }

        runner.runSuite(testContext.compile(contexts, opt.filters));
    };

    return autoRun;
});
