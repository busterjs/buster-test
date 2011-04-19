if (typeof require != "undefined") {
    var buster = require("buster-core");
}

(function () {
    function proxyName(event) {
        return function (arg) {
            this.emit(event, { name: arg.name });
        };
    }

    function proxyNameAndError(event) {
        return function (test) {
            this.emit(event, {
                name: test.name,
                error: {
                    name: test.error.name,
                    message: test.error.message,
                    stack: test.error.stack
                }
            });
        }
    }

    buster.reporters = buster.reporters || {};

    buster.reporters.jsonProxy = buster.extend(buster.create(buster.eventEmitter), {
        create: function (emitter) {
            var proxy = buster.create(this);

            if (emitter) {
                proxy.on = buster.bind(emitter, "on");
                proxy.emit = buster.bind(emitter, "emit");
                proxy.addListener = buster.bind(emitter, "addListener");
                proxy.hasListener = buster.bind(emitter, "hasListener");
            }

            return proxy;
        },

        listen: function (runner) {
            runner.bind(this, {
                "context:start": "contextStart", "context:end": "contextEnd",
                "test:setUp": "testSetUp", "test:tearDown": "testTearDown",
                "test:start": "testStart", "test:error": "testError",
                "test:failure": "testFailure", "test:success": "testSuccess",
                "suite:end": "suiteEnd", "suite:start": "suiteStart",
                "uncaughtException": "uncaughtException"
            });

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
        testError: proxyNameAndError("test:error"),
        testFailure: proxyNameAndError("test:failure"),

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
}());

if (typeof module != "undefined") {
    module.exports = buster.reporters.jsonProxy;
}
