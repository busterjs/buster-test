var util = require("util");

function escape(text) {
    return text.toString()
        .replace(/\|/g, '||')
        .replace(/:/g, '->')// workaround: teamcity handles colon strangely
        .replace(/'/g, '|\'')
        .replace(/\n/g, '|n')
        .replace(/\r/g, '|r')
        .replace(/\u0085/g, '|x')
        .replace(/\u2028/g, '|l')
        .replace(/\u2029/g, '|p')
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]');
}

function packageName(contexts, min) {
    return contexts.slice(0, min).map(function (c) {
        return c.name;
    }).join(".");
}

function testName(test, contexts, min) {
    return contexts.slice(min).map(
        function (context) {
            return context.name;
        }).concat([test]).join(" ");
}

function getOutputStream(opt) {
    if (opt.outputStream) { return opt.outputStream; }
    var util = require("util");
    return {
        write: function (bytes) { util.print(bytes); }
    };
}

module.exports = {
    contextsInPackageName:1,

    create: function (opt) {
        var reporter = Object.create(this);
        reporter.out = getOutputStream(opt || {});
        return reporter;
    },

    listen:function (runner) {
        runner.bind(this);
        return this;
    },

    "context:start": function (context) {
        this.contexts = this.contexts || [];

        var testCase = {
            name:context.name,
            startedAt:new Date().getTime(),
            tests:0
        };

        if (this.contexts.length == 0) {
            this.suite = testCase;
        }

        this.contexts.push(testCase);
        this.startedAt = this.startedAt || new Date().getTime();
    },

    "context:end": function () {
        var context = this.contexts.pop();

        if (this.contexts.length > 0) {
            return;
        }

        this.writeln("##teamcity[testSuiteStarted name='" + escape(context.name) + "']");
        this.renderTests(this.suite.tests);
        this.writeln("##teamcity[testSuiteFinished name='" + escape(context.name) + "']");
    },

    "test:start": function (test) {
        this.currentTest = this.addTest(test);
    },

    "test:success": function (test) {
        this.completeTest(this.currentTest || this.addTest(test));
    },

    "test:error": function (testData) {
        var test = this.completeTest(this.currentTest || this.addTest(testData));
        test.errors.push(testData.error);
    },

    "test:failure": function (testData) {
        var test = this.completeTest(this.currentTest || this.addTest(testData));
        test.failures.push(testData.error);
    },

    "test:timeout": function (testData) {
        var test = this.completeTest(this.currentTest || this.addTest(testData));
        test.failures.push(testData.error);
    },

    renderTests: function (tests) {
        for (var i = 0, l = tests.length; i < l; ++i) {
            var test = tests[i];
            this.writeln("##teamcity[testStarted name='" + escape(test.name) + "' captureStandardOutput='true']");
            if (test.errors.length + test.failures.length > 0) {
                var fullMsg = '';
                var details = '';
                [test.errors, test.failures].forEach(function (list) {
                    list.forEach(function (e) {
                        var partMsg = 'Error: ' + e.name;
                        if (e.message) {
                            partMsg += ' - ' + e.message;
                        }
                        partMsg += '\n';
                        fullMsg += partMsg;
                        details += partMsg + (e.stack ? (e.stack + '\n') : '');
                    });
                });
                this.writeln("##teamcity[testFailed name='" + escape(test.name) + "' message='" + escape(fullMsg) + "' details='" + escape(details) + "']");
            }
            this.writeln("##teamcity[testFinished name='" + escape(test.name) + "' duration='" + test.elapsed + "']");
        }
    },

    addTest: function (test) {
        this.suite.tests = this.suite.tests || [];

        var to = {
            name:testName(test.name, this.contexts, this.contextsInPackageName),
            context:packageName(this.contexts, this.contextsInPackageName),
            failures:[],
            errors:[]
        };

        this.suite.tests.push(to);
        return to;
    },

    completeTest: function (test) {
        var now = new Date().getTime();
        test.elapsed = now - this.startedAt;
        this.startedAt = now;
        return test;
    },

    writeln: function (str) {
        this.out.write(str + "\n");
    }
};
