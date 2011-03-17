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
                buster.test.run(contexts, opt || {
                    reporter: typeof env != "undefined" && env && env.BUSTER_REPORTER
                });
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

        var opt = {
            color: typeof opt.color == "boolean" ? opt.color : true,
            bright: typeof opt.bright == "boolean" ? opt.bright : true
        };

        if (typeof document != "undefined") {
            reporter = "html";
            opt.root = document.getElementById("buster") || document.body;
        } else {
            var env = process && process.env;
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
