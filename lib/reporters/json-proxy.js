((typeof define === "function" && define.amd && function (m) {
    define("buster-test/reporters/json-proxy", ["bane", "lodash"], m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
        module.exports = m(require("bane"), require("lodash"));
    }) || function (m) {
        this.buster = this.buster || {};
        this.buster.reporters = this.buster.reporters || {};
        this.buster.reporters.jsonProxy = m(this.bane, this._);
    }
)(function (bane, _) {
    "use strict";

    function proxyNameAndEnv(event) {
        return function (arg) {
            this.emit(event, { name: arg.name, runtime: arg.runtime });
        };
    }

    function proxyNameEnvError(event) {
        return function (test) {
            var data = {
                name: test.name,
                runtime: test.runtime,
                error: {
                    name: test.error.name,
                    message: test.error.message,
                    stack: test.error.stack
                }
            };
            if (test.error.source) { data.error.source = test.error.source; }
            this.emit(event, data);
        };
    }

    function F() {}
    function create(object) {
        F.prototype = object;
        return new F();
    }

    return bane.createEventEmitter({
        create: function (emitter) {
            var proxy = create(this);

            if (emitter) {
                proxy.on = _.bind(emitter.on, emitter);
                proxy.emit = _.bind(emitter.emit, emitter);
            }

            return proxy;
        },

        listen: function (runner) {
            runner.bind(this);
            return this;
        },

        "suite:configuration": function (e) {
            this.emit("suite:configuration", {
                runtime: e.runtime,
                name: e.name,
                tests: e.tests
            });
        },

        "suite:start": function (e) {
            this.emit("suite:start", {
                runtime: e.runtime
            });
        },

        "context:start": proxyNameAndEnv("context:start"),
        "context:end": proxyNameAndEnv("context:end"),
        "test:setUp": proxyNameAndEnv("test:setUp"),
        "test:tearDown": proxyNameAndEnv("test:tearDown"),
        "test:start": proxyNameAndEnv("test:start"),
        "test:async": proxyNameAndEnv("test:async"),
        "test:error": proxyNameEnvError("test:error"),
        "test:failure": proxyNameEnvError("test:failure"),
        "test:timeout": proxyNameEnvError("test:timeout"),

        "test:deferred": function (e) {
            this.emit("test:deferred", {
                name: e.name,
                runtime: e.runtime,
                comment: e.comment
            });
        },

        "runner:focus": function (data) {
            this.emit("runner:focus", { runtime: data.runtime });
        },

        "context:unsupported": function (data) {
            this.emit("context:unsupported", {
                context: { name: data.context.name },
                unsupported: data.unsupported,
                runtime: data.runtime
            });
        },

        uncaughtException: function (error) {
            this.emit("uncaughtException", {
                name: error.name,
                message: error.message,
                stack: error.stack,
                runtime: error.runtime
            });
        },

        "test:success": function (test) {
            this.emit("test:success", {
                name: test.name,
                assertions: test.assertions,
                runtime: test.runtime
            });
        },

        "suite:end": function (stats) {
            this.emit("suite:end", {
                runtime: stats.runtime,
                contexts: stats.contexts,
                tests: stats.tests,
                errors: stats.errors,
                failures: stats.failures,
                assertions: stats.assertions,
                timeouts: stats.timeouts,
                deferred: stats.deferred,
                ok: stats.ok
            });
        },

        log: function (msg) {
            this.emit("log", msg);
        }
    });
});
