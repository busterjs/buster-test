if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sinon = require("sinon");
    var buster = require("buster-core");

    buster.extend(buster, {
        assert: require("buster-assert"),
        eventEmitter: require("buster-event-emitter"),
        reporterJsonProxy: require("../../../../lib/buster-test/reporters/json-proxy")
    });
}

testCase("JSONProxyTest", {
    setUp: function () {
        this.runner = buster.create(buster.eventEmitter);
        this.proxy = buster.reporterJsonProxy.create().listen(this.runner);
    },

    "should emit suite:start": function () {
        var listener = sinon.spy();
        this.proxy.on("suite:start", listener);
        this.runner.emit("suite:start");

        buster.assert(listener.calledOnce);
    },

    "should emit serializable context object to context:end": function () {
        var listener = sinon.spy();
        this.proxy.on("context:end", listener);
        this.runner.emit("context:end", { name: "Context", meth: function () {} });

        buster.assert.equals(listener.args[0][0], { name: "Context" });
    },

    "should emit serializable test object to test:setUp": function () {
        var listener = sinon.spy();
        this.proxy.on("test:setUp", listener);
        this.runner.emit("test:setUp", { name: "should go", func: function () {} });

        buster.assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:tearDown": function () {
        var listener = sinon.spy();
        this.proxy.on("test:tearDown", listener);
        this.runner.emit("test:tearDown", { name: "should go", func: function () {} });

        buster.assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:start": function () {
        var listener = sinon.spy();
        this.proxy.on("test:start", listener);
        this.runner.emit("test:start", { name: "should go", func: function () {} });

        buster.assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:error": function () {
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
            }
        });

        buster.assert.equals(listener.args[0][0], {
            name: "should go",
            error: {
                name: "Error",
                message: "Something went wrong",
                stack: "Trouble@here"
            }
        });
    },

    "should emit serializable test object to test:failure": function () {
        var listener = sinon.spy();
        this.proxy.on("test:failure", listener);
        this.runner.emit("test:failure", {
            name: "should go",
            func: function () {},
            error: {
                name: "AssertionError",
                message: "Expected a to be equal to b",
                stack: "Trouble@here",
                toString: function () {}
            }
        });

        buster.assert.equals(listener.args[0][0], {
            name: "should go",
            error: {
                name: "AssertionError",
                message: "Expected a to be equal to b",
                stack: "Trouble@here"
            }
        });
    },

    "should emit serializable test name and assertion count to test success": function () {
        var listener = sinon.spy();
        this.proxy.on("test:success", listener);

        this.runner.emit("test:success", {
            name: "should go", func: function () {}, assertions: 13
        });

        buster.assert.equals(listener.args[0][0], {
            name: "should go", assertions: 13
        });
    },

    "should emit stats to suite:end": function () {
        var listener = sinon.spy();
        this.proxy.on("suite:end", listener);

        this.runner.emit("suite:end", {
            contexts: 2, tests: 3, errors: 0, failures: 1, assertions: 12,
            timeouts: 0, deferred: 0, ok: false
        });

        buster.assert.equals(listener.args[0][0], {
            contexts: 2, tests: 3, errors: 0, failures: 1, assertions: 12,
            timeouts: 0, deferred: 0, ok: false
        });
    },

    "should emit log messages": function () {
        var listener = sinon.spy();
        this.proxy.on("log", listener);
        this.runner.bind(this.proxy, ["log"]);

        this.runner.emit("log", { level: "log", message: "Hey!" });

        buster.assert(listener.calledOnce);
        buster.assert.equals(listener.args[0][0],
                             { level: "log", message: "Hey!" });
    },

    "should emit serializable error to uncaughtException": function () {
        var listener = sinon.spy();
        this.proxy.on("uncaughtException", listener);

        this.runner.emit("uncaughtException", {
            name: "Error",
            message: "Something went wrong",
            stack: "Trouble@here",
            toString: function () {}
        });

        buster.assert(listener.calledOnce);

        buster.assert.equals(listener.args[0][0], {
            name: "Error",
            message: "Something went wrong",
            stack: "Trouble@here"
        });
    }
});

testCase("JsonProxyCustomEmitterTest", {
    setUp: function () {
        this.runner = buster.create(buster.eventEmitter);
        this.emitter = buster.create(buster.eventEmitter);
        this.proxy = buster.reporterJsonProxy.create(this.emitter).listen(this.runner);
    },

    "should emit events on custom emitter": function () {
        var listener = sinon.spy();
        this.emitter.on("test:start", listener);

        this.runner.emit("test:start", { name: "should do something" });

        buster.assert(listener.calledOnce);
        buster.assert.equals(listener.args[0][0], { name: "should do something" });
    }
});
