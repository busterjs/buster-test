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
            runner.bind(this);/*, {
                "context:start": "contextStart", "context:end": "contextEnd",
                "context:unsupported": "contextUnsupported",
                "test:async": "testAsync", "test:timeout": "testTimeout",
                "test:setUp": "testSetUp", "test:tearDown": "testTearDown",
                "test:start": "testStart", "test:error": "testError",
                "test:failure": "testFailure", "test:success": "testSuccess",
                "test:deferred": "testDeferred", "suite:end": "suiteEnd",
                "suite:start": "suiteStart", "uncaughtException": "uncaughtException",
                "runner:focus": "runnerFocus"
            });*/

            return this;
        },

        suiteStart: function () {
            this.emit("suite:start");
        },

        contextStart: proxyName("context:start"),
        contextEnd: proxyName("context:end"),
        testSetUp: proxyName("test:setUp"),
        testTearDown: proxyName("test:tearDown"),
        testStart: proxyName("test:start"),
        testAsync: proxyName("test:async"),
        testDeferred: proxyName("test:deferred"),
        testError: proxyNameAndError("test:error"),
        testFailure: proxyNameAndError("test:failure"),
        testTimeout: proxyNameAndError("test:timeout"),

        runnerFocus: function (data) {
            this.emit("runner:focus");
        },

        contextUnsupported: function (data) {
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

        testSuccess: function (test) {
            this.emit("test:success", {
                name: test.name,
                assertions: test.assertions
            });
        },

        suiteEnd: function (stats) {
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
