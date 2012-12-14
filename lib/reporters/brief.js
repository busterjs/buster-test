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
    var tests = r.expectedTests && r.expectedTests + " " || "";
    var envLabel = envs === 1 ?
            "in 1 environment" : "across " + envs + " environments";
    return "Running " + tests + "tests " + envLabel + " ...";
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
    if (!env.log) { return; }
    var msg = { level: event.level, message: event.message };
    env.log.push(msg);
    return msg;
}

function testName(env, event) {
    return env.contexts.concat(event.name).join(" ");
}

function formatMessage(msg) {
    return "[" + msg.level.toUpperCase() + "] " + msg.message;
}

function formatMessages(messages) {
    return "    " + (messages || []).map(formatMessage).join("\n    ");
}

function filterStack(filter, error) {
    if (!filter) { return error.stack.split("\n"); }
    return filter.filter(error.stack);
}

function formatStack(error, stackFilter, options) {
    options = options || {};
    var name = error.name;
    name = name && name !== "AssertionError" ? name + ": " : "";

    var out = "  " + name + error.message + "\n";

    // Explicit check against false because undefined/non-existent
    // should default to true.
    if (options.includeSource !== false && error.source) {
        out += "  -> " + error.source + "\n";
    }

    var stack = filterStack(stackFilter, error);

    if (options.stackLines) {
        stack = stack.slice(0, options.stackLines);
    }

    return out + "    " + stack.join("\n      ") + "\n";
}

function reportException(reporter, e, label) {
    reporter.executedTests += 1;
    var env = getEnv(reporter.environments, e);
    reporter.print(
        label + testName(env, e) + " (" + env.description + ")"
    );

    if (env.log && env.log.length > 0) {
        reporter.out.write(formatMessages(env.log) + "\n");
    }

    if (e.error) {
        reporter.out.write(formatStack(e.error, reporter.stackFilter));
    }

    reporter.out.write(getSummary(reporter) + " " + getProgress(reporter) + "\n");
}

function firstStackLine(error) {
    return error.stack && error.stack.split("\n")[0];
}

function getKnownError(errors, e) {
    if (!e || !e.stack) { return; }
    return errors.filter(function (err) {
        return err.name === e.name && err.message === e.message &&
            firstStackLine(err) === firstStackLine(e);
    })[0];
}

function saveError(errors, e, log) {
    if (!e.error) { return; }
    errors.push({
        name: e.error.name,
        message: e.error.message,
        stack: e.error.stack || "",
        occurrences: [{ name: e.name, log: log }]
    });
}

function formatRepeatedExceptions(errors, stackFilter) {
    return errors.reduce(function (out, error) {
        return out + error.occurrences.map(function (test) {
            var msg = "  " + test.name;
            if (test.log.length > 0) {
                msg += "\n" + formatMessages(test.log);
            }
            return msg;
        }).join("\n") + "\n\n" + formatStack(error, stackFilter, {
            includeSource: false,
            stackLines: 1
        });
    }, "Repeated exceptions:\n");
}

function pluralize(count, label) {
    return count + " " + (count === 1 ? label : label + "s");
}

function summarizeErrors(e) {
    var details = [];
    if (e.failures > 0) {
        details.push(pluralize(e.failures, "failure"));
    }
    if (e.errors > 0) {
        details.push(pluralize(e.errors, "error"));
    }
    if (e.timeouts > 0) {
        details.push(pluralize(e.timeouts, "timeout"));
    }
    return details.join(", ");
}

function formatSummary(reporter) {
    return getSummary(reporter) + " " + getProgress(reporter) + "\n";
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
        reporter.errors = [];

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
        this.expectedTests += e.tests || 0;
        this.print(getSummary(this));
    },

    "context:start": function (e) {
        startContext(getEnv(this.environments, e), e);
    },

    "context:end": function (e) {
        endContext(getEnv(this.environments, e), e);
    },

    log: function (e) {
        if (!addLogMessage(getEnv(this.environments, e), e)) {
            this.clearStatus();
            this.out.write(
                formatMessage(e) + " (" + e.environment.description + ")\n" +
                    formatSummary(this)
            );
        }
    },

    "test:setUp": function (e) {
        startTest(getEnv(this.environments, e), e);
    },

    "test:success": function () {
        this.executedTests += 1;
    },

    "test:failure": function (e) {
        reportException(this, e, "Failure: ");
    },

    "test:error": function (e) {
        var err = getKnownError(this.errors, e.error);
        var log = getEnv(this.environments, e).log || [];
        if (err) {
            return err.occurrences.push({ name: e.name, log: log });
        }
        saveError(this.errors, e, log);
        reportException(this, e, "Error: ");
    },

    "test:timeout": function (e) {
        reportException(this, e, "Timeout: ");
    },

    "uncaughtException": function (e) {
        var ua = e.environment.description;
        this.clearStatus();
        this.out.write("Uncaught exception in " + ua + ":\n");
        this.out.write(formatStack(e, this.stackFilter));
        this.out.write(formatSummary(this));
    },

    "suite:end": function (e) {
        clearTimeout(this.summaryTimer);
        this.clearStatus();

        if (this.errors.length > 0) {
            this.out.write("\n" + formatRepeatedExceptions(this.errors, this.stackFilter));
        }

        this.out.write(pluralize(e.tests, "test") + ", " +
                       pluralize(e.assertions, "assertion") + ", " +
                       pluralize(this.environments.length, "environment") +
                       " ... ");

        if (e.ok) {
            this.out.write("OK\n");
        } else {
            this.out.write(summarizeErrors(e) + "\n");
        }

        if (e.deferred > 0) {
            this.out.write(pluralize(e.deferred, "deferred test") + "\n");
        }
    },

    printProgress: function () {
        this.print(formatSummary(this));
        this.summaryTimer = setTimeout(this.printProgress.bind(this), 100);
    },

    print: function (str) {
        this.clearStatus();
        if (str) {
            this.out.write(str + "\n");
        }
        this.statusWritten = true;
    },

    clearStatus: function () {
        if (this.statusWritten) {
            this.out.write("\x1b[1A\x1b[K");
        }
    }
};
