((typeof define === "function" && define.amd && function (deps, m) {
    define(deps, m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (deps, m) {
           module.exports = m.apply(this, deps.map(function (d) {
               return require(d);
           }));
       })
)([
    "../test-helper",
    "./test-helper",
    "lodash",
    "bane",
    "referee",
    "sinon",
    "../../lib/reporters/json-proxy"
], function (helper, rhelper, _, bane, referee, sinon, jsonProxyReporter) {
    "use strict";
    var assert = referee.assert;

    helper.testCase("JSONProxyTest", {
        setUp: function () {
            this.runner = bane.createEventEmitter();
            this.proxy = jsonProxyReporter.create().listen(this.runner);
        },

        "emits runner:focus": function () {
            var listener = sinon.spy();
            this.proxy.on("runner:focus", listener);
            this.runner.emit("runner:focus", { runtime: {} });

            assert(listener.calledOnce);
            assert.isObject(listener.args[0][0].runtime);
        },

        "emits suite:configuration": function () {
            var listener = sinon.spy();
            this.proxy.on("suite:configuration", listener);
            this.runner.emit("suite:configuration", {
                runtime: {},
                name: "Config",
                tests: 3
            });

            assert(listener.calledOnce);
            assert.isObject(listener.args[0][0].runtime);
            assert.equals(listener.args[0][0].tests, 3);
        },

        "emits suite:start": function () {
            var listener = sinon.spy();
            this.proxy.on("suite:start", listener);
            this.runner.emit("suite:start", { runtime: {} });

            assert(listener.calledOnce);
            assert.isObject(listener.args[0][0].runtime);
        },

        "emits serializable context object to context:start": function () {
            var listener = sinon.spy();
            this.proxy.on("context:start", listener);
            this.runner.emit("context:start", {
                name: "Context",
                meth: function () {},
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "Context",
                runtime: {}
            });
        },

        "emits serializable context object to context:end": function () {
            var listener = sinon.spy();
            this.proxy.on("context:end", listener);
            this.runner.emit("context:end", {
                name: "Context",
                meth: function () {},
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "Context",
                runtime: {}
            });
        },

        "emits serializable context object to context:unsupported": function () {
            var listener = sinon.spy();
            this.proxy.on("context:unsupported", listener);

            this.runner.emit("context:unsupported", {
                context: {
                    name: "Context",
                    meth: function () {}
                },
                runtime: {},
                unsupported: ["A"]
            });

            assert.equals(listener.args[0][0], {
                context: { name: "Context" },
                unsupported: ["A"],
                runtime: {}
            });
        },

        "emits serializable test object to test:async": function () {
            var listener = sinon.spy();
            this.proxy.on("test:async", listener);
            this.runner.emit("test:async", {
                name: "should go",
                func: function (done) {},
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                runtime: {}
            });
        },

        "emits serializable test object to test:setUp": function () {
            var listener = sinon.spy();
            this.proxy.on("test:setUp", listener);
            this.runner.emit("test:setUp", {
                name: "should go",
                func: function () {},
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                runtime: {}
            });
        },

        "emits serializable test object to test:tearDown": function () {
            var listener = sinon.spy();
            this.proxy.on("test:tearDown", listener);
            this.runner.emit("test:tearDown", {
                name: "should go",
                func: function () {},
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                runtime: {}
            });
        },

        "emits serializable test object to test:deferred": function () {
            var listener = sinon.spy();
            this.proxy.on("test:deferred", listener);
            this.runner.emit("test:deferred", {
                name: "should go",
                func: function () {},
                runtime: {},
                comment: "See, doc"
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                runtime: {},
                comment: "See, doc"
            });
        },

        "emits serializable test object to test:start": function () {
            var listener = sinon.spy();
            this.proxy.on("test:start", listener);
            this.runner.emit("test:start", {
                name: "should go",
                func: function () {},
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                runtime: {}
            });
        },

        "emits serializable test object to test:error": function () {
            var listener = sinon.spy();
            this.proxy.on("test:error", listener);
            this.runner.emit("test:error", {
                name: "should go",
                func: function () {},
                error: {
                    name: "Error",
                    message: "Something went wrong",
                    stack: "Trouble@here",
                    toString: function () {}
                },
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                error: {
                    name: "Error",
                    message: "Something went wrong",
                    stack: "Trouble@here"
                },
                runtime: {}
            });
        },

        "emits serializable test object to test:failure": function () {
            var listener = sinon.spy();
            this.proxy.on("test:failure", listener);
            this.runner.emit("test:failure", {
                name: "should go",
                func: function () {},
                runtime: {},
                error: {
                    name: "AssertionError",
                    message: "Expected a to be equal to b",
                    stack: "Trouble@here",
                    toString: function () {}
                }
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                runtime: {},
                error: {
                    name: "AssertionError",
                    message: "Expected a to be equal to b",
                    stack: "Trouble@here"
                }
            });
        },

        "emits serializable test object to test:timeout": function () {
            var listener = sinon.spy();
            this.proxy.on("test:timeout", listener);
            this.runner.emit("test:timeout", {
                name: "should go",
                func: function () {},
                runtime: {},
                error: {
                    name: "TimeoutError",
                    message: "Yo",
                    stack: "",
                    source: "setUp"
                }
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                runtime: {},
                error: {
                    name: "TimeoutError",
                    message: "Yo",
                    stack: "",
                    source: "setUp"
                }
            });
        },

        "emits serializable test name and assertion count to test success": function () {
            var listener = sinon.spy();
            this.proxy.on("test:success", listener);

            this.runner.emit("test:success", {
                name: "should go",
                func: function () {},
                assertions: 13,
                runtime: {}
            });

            assert.equals(listener.args[0][0], {
                name: "should go",
                assertions: 13,
                runtime: {}
            });
        },

        "emits stats to suite:end": function () {
            var listener = sinon.spy();
            this.proxy.on("suite:end", listener);

            this.runner.emit("suite:end", {
                runtime: {},
                contexts: 2,
                tests: 3,
                errors: 0,
                failures: 1,
                assertions: 12,
                timeouts: 0,
                deferred: 0,
                ok: false
            });

            assert.equals(listener.args[0][0], {
                runtime: {},
                contexts: 2,
                tests: 3,
                errors: 0,
                failures: 1,
                assertions: 12,
                timeouts: 0,
                deferred: 0,
                ok: false
            });
        },

        "emits log messages": function () {
            var listener = sinon.spy();
            this.proxy.on("log", listener);

            this.runner.emit("log", {
                level: "log",
                message: "Hey!"
            });

            assert(listener.calledOnce);
            assert.equals(listener.args[0][0],
                          { level: "log", message: "Hey!" });
        },

        "emits serializable error to uncaughtException": function () {
            var listener = sinon.spy();
            this.proxy.on("uncaughtException", listener);

            this.runner.emit("uncaughtException", {
                name: "Error",
                message: "Something went wrong",
                stack: "Trouble@here",
                toString: function () {},
                runtime: {}
            });

            assert(listener.calledOnce);

            assert.equals(listener.args[0][0], {
                name: "Error",
                message: "Something went wrong",
                stack: "Trouble@here",
                runtime: {}
            });
        }
    });

    helper.testCase("JsonProxyCustomEmitterTest", {
        setUp: function () {
            this.runner = bane.createEventEmitter();
            this.emitter = bane.createEventEmitter();
            this.proxy = jsonProxyReporter.create(this.emitter).listen(this.runner);
        },

        "emits events on custom emitter": function () {
            var listener = sinon.spy();
            this.emitter.on("test:start", listener);

            this.runner.emit("test:start", {
                name: "should do something",
                runtime: {}
            });

            assert(listener.calledOnce);
            assert.equals(listener.args[0][0], {
                name: "should do something",
                runtime: {}
            });
        }
    });
});
