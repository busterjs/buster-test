var buster = require("buster-core");

module.exports = {
    create: function (opt) {
        var reporter = buster.create(this);
        opt = opt || {};
        reporter.io = opt.io || require("sys");
        reporter.testCount = 0;
        reporter.contexts = [];

        return reporter;
    },

    listen: function (runner) {
        runner.bind(this, {
            "suite:end": "suiteEnd", "context:start": "contextStart",
            "context:end": "contextEnd", "test:success": "testSuccess",
            "test:start": "testStart", "test:deferred": "testDeferred",
            "test:failure": "testEnd", "test:error": "testEnd",
            "test:timeout": "testEnd",
        });

        return this;
    },

    suiteEnd: function () {
        this.io.puts("1.." + this.testCount);
    },

    contextStart: function (context) {
        this.contexts.push(context.name);
    },

    contextEnd: function () {
        this.contexts.pop();
    },

    testStart: function (test) {
        this.testCount += 1;
        test.name = this.contexts.concat([test.name]).join(" ");
        this.test = test;
    },

    testSuccess: function (test) {
        this.test.passed = true;
        this.testEnd(test);
    },

    testDeferred: function (test) {
        this.test.deferred = true;
        this.testEnd(test);
    },

    testEnd: function (test) {
        this.io.puts(label(this.test) + this.testCount + " " +
                     this.test.name + directive(this.test));
    }
};

// function printTests(io, tests) {
//     for (var i = 0, l = tests.length, test; i < l; ++i) {
//         test = tests[i];
//          io.puts(label(test) + (i + 1) + " " + test.name + directive(test));
//     }
// }

function directive(test) {
    return test.deferred ? " # Deferred" : "";
}

function label(test) {
    return test.passed ? "ok " : "not ok ";
}