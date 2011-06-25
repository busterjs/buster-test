if (typeof require != "undefined") {
    var buster = require("buster-core");
    buster.testRunner = require("./test-runner");
    buster.reporters = require("./reporters");
    buster.contextFilter = require("./test-context-filter");
}

(function () {
    buster.autoRun = function (opt) {
        var runners = 0;

        buster.testRunner.onCreate(function (runner) {
            runners += 1;
        });

        var timer, contexts = [];

        return function (tc) {
            contexts.push(tc);
            clearTimeout(timer);

            timer = setTimeout(function () {
                if (runners == 0) {
                    var env = typeof process != "undefined" && process.env || {};
                    opt = buster.extend(buster.autoRun.envOptions(env), opt);
                    buster.autoRun.run(contexts, opt);
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

    buster.autoRun.run = function (contexts, opt) {
        if (contexts.length == 0) return;
        opt = buster.extend({ color: true, bright: true }, opt);

        var runner = buster.testRunner.create(buster.extend({
            timeout: 750,
            failOnNoAssertions: false
        }, opt));

        initializeReporter(runner, opt);
        contexts = parseAndFilterContexts(contexts, opt.filters);
        runner.runSuite(contexts);
    }

    function initializeReporter(runner, opt) {
        var reporter;

        if (typeof document != "undefined") {
            reporter = "html";
            opt.root = document.getElementById("buster") || document.body;
        } else {
            reporter = opt.reporter || "xUnitConsole";
        }

        var reporterInstance = buster.reporters[reporter].create(opt);
        reporterInstance.listen(runner);

        if (typeof reporterInstance.log == "function" &&
            typeof buster.console == "function") {
            buster.console.bind(reporterInstance, ["log"]);
        }
    }

    function parseAndFilterContexts(contexts, filters) {
        var filtered = [];

        for (var i = 0, l = contexts.length, ctx; i < l; ++i) {
            ctx = contexts[i];

            if (!ctx.tests && typeof ctx.parse == "function") {
                ctx = ctx.parse();
            }

            ctx = filterContext(ctx, filters);

            if (ctx.tests.length > 0 || ctx.contexts.length > 0) {
                filtered.push(ctx);
            }
        }

        return filtered;
    }

    function filterContext(context, filters) {
        if (!filters) return context;

        for (var i = 0, l = filters.length; i < l; ++i) {
            context = buster.testContextFilter(context, filters[i]);
        }

        return context;
    }
}());

if (typeof module != "undefined") {
    module.exports = buster.autoRun;
}
