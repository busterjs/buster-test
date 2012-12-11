((typeof define === "function" && define.amd && function (m) {
    define(["bane", "lodash"], m);
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
            this.emit(event, { name: arg.name, environment: arg.environment });
        };
    }

    function proxyNameEnvError(event) {
        return function (test) {
            var data = {
                name: test.name,
                environment: test.environment,
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
                proxy.on = _.bind(emitter, "on");
                proxy.emit = _.bind(emitter, "emit");
                proxy.addListener = _.bind(emitter, "addListener");
                proxy.hasListener = _.bind(emitter, "hasListener");
            }

            return proxy;
        },

        listen: function (runner) {
            runner.bind(this);
            return this;
        },

        "suite:configuration": function (e) {
            this.emit("suite:configuration", {
                environment: e.environment,
                name: e.name
            });
        },

        "suite:start": function (e) {
            this.emit("suite:start", { environment: e.environment });
        },

        "context:start": proxyNameAndEnv("context:start"),
        "context:end": proxyNameAndEnv("context:end"),
        "test:setUp": proxyNameAndEnv("test:setUp"),
        "test:tearDown": proxyNameAndEnv("test:tearDown"),
        "test:start": proxyNameAndEnv("test:start"),
        "test:async": proxyNameAndEnv("test:async"),
        "test:deferred": proxyNameAndEnv("test:deferred"),
        "test:error": proxyNameEnvError("test:error"),
        "test:failure": proxyNameEnvError("test:failure"),
        "test:timeout": proxyNameEnvError("test:timeout"),

        "runner:focus": function (data) {
            this.emit("runner:focus", { environment: data.environment });
        },

        "context:unsupported": function (data) {
            this.emit("context:unsupported", {
                context: { name: data.context.name },
                unsupported: data.unsupported,
                environment: data.environment
            });
        },

        uncaughtException: function (error) {
            this.emit("uncaughtException", {
                name: error.name,
                message: error.message,
                stack: error.stack,
                environment: error.environment
            });
        },

        "test:success": function (test) {
            this.emit("test:success", {
                name: test.name,
                assertions: test.assertions,
                environment: test.environment
            });
        },

        "suite:end": function (stats) {
            this.emit("suite:end", {
                environment: stats.environment,
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
