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

    function proxyName(event) {
        return function (arg) {
            this.emit(event, { name: arg.name });
        };
    }

    function proxyNameAndError(event) {
        return function (test) {
            var data = {
                name: test.name,
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

        "suite:start": function () {
            this.emit("suite:start");
        },

        "context:start": proxyName("context:start"),
        "context:end": proxyName("context:end"),
        "test:setUp": proxyName("test:setUp"),
        "test:tearDown": proxyName("test:tearDown"),
        "test:start": proxyName("test:start"),
        "test:async": proxyName("test:async"),
        "test:deferred": proxyName("test:deferred"),
        "test:error": proxyNameAndError("test:error"),
        "test:failure": proxyNameAndError("test:failure"),
        "test:timeout": proxyNameAndError("test:timeout"),

        "runner:focus": function (data) {
            this.emit("runner:focus");
        },

        "context:unsupported": function (data) {
            this.emit("context:unsupported", {
                context: { name: data.context.name },
                unsupported: data.unsupported
            });
        },

        uncaughtException: function (error) {
            this.emit("uncaughtException", {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        },

        "test:success": function (test) {
            this.emit("test:success", {
                name: test.name,
                assertions: test.assertions
            });
        },

        "suite:end": function (stats) {
            this.emit("suite:end", {
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
