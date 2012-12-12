var colorizer = require("ansi-colorizer");

function getOutputStream(opt) {
    if (opt.outputStream) { return opt.outputStream; }
    var util = require("util");
    return {
        write: function (bytes) { util.print(bytes); }
    };
}

function getSummary(r) {
    var envs = r.environments.length;
    var tests = r.expectedTests;
    var envLabel = envs === 1 ?
            "in 1 environment" : "across " + envs + " environments";
    return "Running " + tests + " tests " + envLabel + " ...";
}

function getProgress(r) {
    var percentage = Math.round(r.executedTests / r.expectedTests * 100);
    return percentage + "% done";
}

function makeEnv(env) {
    return {
        uuid: env.uuid,
        description: env.toString(),
        contexts: []
    };
}

function getEnv(environments, event) {
    return environments.filter(function (env) {
        return env.uuid === event.environment.uuid;
    })[0];
}

function startContext(env, event) {
    env.contexts.push(event.name);
}

function endContext(env, event) {
    env.contexts.pop();
}

function startTest(env, event) {
    env.currentTest = event.name;
    env.log = [];
}

function addLogMessage(env, event) {
    env.log.push({ level: event.level, message: event.message });
}

function testName(env, event) {
    return env.contexts.concat(event.name).join(" ");
}

function formatMessages(messages) {
    return (messages || []).map(function (msg) {
        return "    [" + msg.level.toUpperCase() + "] " + msg.message;
    }).join("\n");
}

function formatStack(filter, error) {
    if (!filter) { return error.stack; }
    return filter.filter(error.stack);
}

module.exports = {
    create: function (opt) {
        var reporter = Object.create(this);
        opt = opt || {};
        reporter.out = getOutputStream(opt);
        reporter.color = colorizer.configure(opt);
        reporter.cwd = opt.cwd;
        reporter.stackFilter = opt.stackFilter;
        reporter.environments = [];
        reporter.expectedTests = 0;
        reporter.executedTests = 0;

        return reporter;
    },

    listen: function (runner) {
        runner.bind(this);
        if (runner.console) { runner.console.on("log", this.log, this); }
        return this;
    },

    "suite:start": function () {
        this.print("Running tests ...");
        this.summaryTimer = setTimeout(this.printProgress.bind(this), 250);
    },

    "suite:configuration": function (e) {
        this.environments.push(makeEnv(e.environment));
        this.expectedTests += e.tests;
        this.print(getSummary(this));
    },

    "context:start": function (e) {
        startContext(getEnv(this.environments, e), e);
    },

    "context:end": function (e) {
        endContext(getEnv(this.environments, e), e);
    },

    log: function (e) {
        addLogMessage(getEnv(this.environments, e), e);
    },

    "test:setUp": function (e) {
        startTest(getEnv(this.environments, e), e);
    },

    "test:success": function () {
        this.executedTests += 1;
    },

    "test:failure": function (e) {
        this.executedTests += 1;
        var env = getEnv(this.environments, e);
        this.print("Failure: " + testName(env, e) + " (" + env.description + ")");
        this.out.write(formatMessages(env.log) + "\n");
        if (!e.error) { return; }
        this.out.write("    " + e.error.message + "\n");
        this.out.write("    " + formatStack(this.stackFilter, e.error) + "\n");
    },

    "suite:end": function (e) {
        clearTimeout(this.summaryTimer);
        this.print(e.tests + " tests, " +
                   e.assertions + " assertions, " +
                   this.environments.length + " environments ... OK");
    },

    printProgress: function () {
        this.print(getSummary(this) + " " + getProgress(this));
        this.summaryTimer = setTimeout(this.printProgress.bind(this), 100);
    },

    print: function (str) {
        if (this.statusWritten) {
            this.out.write("\x1b[1A\x1b[K");
        }
        this.out.write(str + "\n");
        this.statusWritten = true;
    }
};
