if (typeof require != "undefined") {
    var buster = require("buster-core");
}

buster.test = {};

buster.test.autoRun = function (opt) {
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
                buster.test.run(contexts, buster.extend({
                    reporter: typeof process != "undefined" && process.env &&
                        process.env.BUSTER_REPORTER
                }, opt));
            }
        }, 0);
    };
};

buster.test.run = function (contexts, opt) {
    var reporter;
    opt = opt || {};

    if (contexts.length > 0) {
        var runner = buster.testRunner.create({
            timeout: opt.timeout || 750,
            failOnNoAssertions: opt.failOnNoAssertions || false
        });

        var opt = buster.extend({
            color: true,
            bright: true
        }, opt);

        if (typeof document != "undefined") {
            reporter = "html";
            opt.root = document.getElementById("buster") || document.body;
        } else {
            reporter = opt.reporter || "xUnitConsole";
        }

        var reporterInstance = buster.reporters[reporter].create(opt);
        reporterInstance.listen(runner);

        if (typeof reporterInstance.log == "function") {
            buster.console.bind(reporterInstance, ["log"]);
        }

        for (var i = 0, l = contexts.length; i < l; ++i) {
            if (!contexts[i].tests && typeof contexts[i].parse == "function") {
                contexts[i] = contexts[i].parse();
            }
        }

        runner.runSuite(contexts);
    }
}

if (typeof module != "undefined") {
    module.exports = buster.test;
}
