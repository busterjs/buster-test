((typeof require === "function" && function (reqs, callback) {
    callback.apply(this, reqs.map(function (req) { return require(req); }));
}) || define)([
    "bane",
    "referee",
    "../lib/browser-env",
    "./test-helper"
], function (bane, referee, browserEnv, helper) {
    if (typeof document === "undefined") { return; }
    var assert = referee.assert;

    helper.testCase("BrowserEnvTest", {
        setUp: function () {
            this.emitter = bane.createEventEmitter();
            this.div = document.createElement("div");
            this.env = browserEnv.create(this.div);
            this.env.listen(this.emitter);
        },

        "resets element content on test:success": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:success");
            assert.equals(this.div.innerHTML, "");
        },

        "resets element content on test:failure": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:failure");
            assert.equals(this.div.innerHTML, "");
        },

        "resets element content on test:error": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:error");
            assert.equals(this.div.innerHTML, "");
        },

        "resets element content on test:timeout": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:timeout");
            assert.equals(this.div.innerHTML, "");
        },

        "restores original element innerHTML": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("suite:start");
            this.div.innerHTML = "Hey!!!";
            this.emitter.emit("test:timeout");
            assert.equals(this.div.innerHTML, "Hey");
        }
    });
});
