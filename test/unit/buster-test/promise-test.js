if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        promise: require("buster-test/promise")
    };
}

testCase("PromiseResolveTest", {
    setUp: function () {
        this.promise = buster.promise.create();
        this.listeners = [sinon.spy(), sinon.spy()];
    },

    "should call all listeners": function () {
        this.promise.then(this.listeners[0]);
        this.promise.then(this.listeners[1]);

        this.promise.resolve();

        buster.assert(this.listeners[0].called);
        buster.assert(this.listeners[1].called);
    },

    "should call all listeners when one throws": function () {
        this.promise.then(this.listeners[0]);
        this.promise.then(this.listeners[1]);
        var promise = this.promise;

        buster.assert.noException(function () {
            promise.resolve();
        });

        buster.assert(this.listeners[0].called);
        buster.assert(this.listeners[1].called);
    },

    "should throw if already resolved": function () {
        var promise = this.promise;
        promise.resolve();

        buster.assert.exception(function () {
            promise.resolve();
        });
    },

    "should allow chaining": function () {
        this.promise.then(this.listeners[0]).then(this.listeners[1]);

        this.promise.resolve();

        buster.assert(this.listeners[0].called);
        buster.assert(this.listeners[1].called);
    },

    "should call callback when resolved": function () {
        var listener = sinon.spy();
        this.promise.resolve();
        this.promise.then(listener);

        buster.assert(listener.called);
    },

    "should call chained callback when resolved": function () {
        this.promise.resolve();
        this.promise.then(this.listeners[0]).then(this.listeners[1]);

        buster.assert(this.listeners[1].called);
    },

    "should call chained callback with resolution": function () {
        this.promise.resolve({ name: "Oh yes" });
        this.promise.then(this.listeners[0]).then(this.listeners[1]);

        buster.assert(this.listeners[1].calledWith({ name: "Oh yes" }));
    }
});

testCase("PromiseRejectTest", {
    setUp: function () {
        this.promise = buster.promise.create();
        this.listeners = [sinon.spy(), sinon.spy()];
        this.fail = sinon.stub().throws();
    },

    "should call all listeners": function () {
        this.promise.then(this.fail, this.listeners[0]);
        this.promise.then(this.fail, this.listeners[1]);

        this.promise.reject();

        buster.assert(this.listeners[0].called);
        buster.assert(this.listeners[1].called);
    },

    "should call all listeners when one throws": function () {
        this.promise.then(this.fail, this.listeners[0]);
        this.promise.then(this.fail, this.listeners[1]);
        var promise = this.promise;

        buster.assert.noException(function () {
            promise.reject();
        });

        buster.assert(this.listeners[0].called);
        buster.assert(this.listeners[1].called);
    },

    "should throw if already rejected": function () {
        var promise = this.promise;
        promise.reject();

        buster.assert.exception(function () {
            promise.reject();
        });
    },

    "should allow chaining": function () {
        this.promise.then(this.fail, this.listeners[0]).then(this.fail, this.listeners[1]);

        this.promise.reject();

        buster.assert(this.listeners[0].called);
        buster.assert(this.listeners[1].called);
    },

    "should call callback when rejected": function () {
        var listener = sinon.spy();
        try { this.promise.reject(); } catch (e) {}
        this.promise.then(this.fail, listener);

        buster.assert(listener.called);
    },

    "should call chained callback when rejected": function () {
        this.promise.then(this.fail, this.listeners[0]).then(this.fail, this.listeners[1]);

        this.promise.reject();

        buster.assert(this.listeners[1].called);
    },

    "should pass error to callback": function () {
        try { this.promise.reject({ message: "Oh no!" }); } catch (e) {}
        this.promise.then(this.fail, this.listeners[0]).then(this.fail, this.listeners[1]);

        buster.assert(this.listeners[1].called);
        buster.assert(this.listeners[1].calledWith({ message: "Oh no!" }));
    },

    "should pass error to callback when rejecting after listen": function () {
        this.promise.then(this.fail, this.listeners[0]).then(this.fail, this.listeners[1]);

        this.promise.reject({ message: "Oh no!" });

        buster.assert(this.listeners[1].called);
        buster.assert(this.listeners[1].calledWith({ message: "Oh no!" }));
    },

    "should pass error to chained callback": function () {
        this.promise.then(this.fail, this.listeners[0]).then(this.fail, function () {}).then(this.fail, this.listeners[1]);

        this.promise.reject({ message: "Oh no!" });

        buster.assert(this.listeners[1].called);
        buster.assert(this.listeners[1].calledWith({ message: "Oh no!" }));
    },

    "should throw if handler throws": function () {
        var promise = this.promise;

        promise.then(function () {
            throw new Error("Oops!");
        });

        buster.assert.exception(function () {
            promise.resolve();
        });
    }
 });

testCase("PromiseWhenTest", {
    setUp: function () {
        this.delay = function (func, ms) {
            var promise = buster.promise.create();

            setTimeout(function () {
                func();
                promise.resolve();
            }, ms);

            return promise;
        };
    },

    "should resolve when all promises have resolved": function (test) {
        var funcs = [sinon.spy(), sinon.spy()];
        var promises = [this.delay(funcs[0], 10), this.delay(funcs[1], 8)];

        buster.promise.when(promises[0], promises[1]).then(function () {
            buster.assert(funcs[0].called);
            buster.assert(funcs[1].called);
            test.end();
        });
    }
});

testCase("PromiseThenableTest", {
    "should return promise": function () {
        var promise = buster.promise.create();

        buster.assert.same(promise, buster.promise.thenable(promise));
    },

    "should return promise that resolves with value": function () {
        var promise = buster.promise.thenable({ id: 42 });

        promise.then(function (value) {
            buster.assert.equals({ id: 42 }, value);
        });
    }
});

testCase("PromiseSyncTest", {
    setUp: function () {
        this.complete = sinon.spy();
        this.promises = [buster.promise.create(), buster.promise.create()];
        this.listeners = [sinon.stub().returns(this.promises[0]),
                          sinon.stub().returns(this.promises[1])];
    },

    "should not call second function if first does not resolve": function () {
        buster.promise.sync(this.listeners).then(this.complete);

        buster.assert(this.listeners[0].called);
        buster.assert(!this.listeners[1].called);
        buster.assert(!this.complete.called);
    },

    "should call second function when first resolves": function () {
        buster.promise.sync(this.listeners).then(this.complete);
        this.promises[0].resolve();

        buster.assert(this.listeners[1].called);
        buster.assert(!this.complete.called);
    },

    "should call complete callback when all have resolved": function () {
        buster.promise.sync(this.listeners).then(this.complete);
        this.promises[0].resolve();
        this.promises[1].resolve();

        buster.assert(this.complete.called);
    },

    "should reject complete callback if a function throws": function (test) {
        this.listeners.push(sinon.stub().throws("TypeError", "Oops"));
        var self = this;
        var promise = buster.promise.sync(this.listeners);
 
        promise.then(function () {
            buster.assert.fail();
            test.end();
        }, function (e) {
            buster.assert(self.listeners[0].called);
            buster.assert(self.listeners[1].called);
            buster.assert.equals("TypeError", e.name);
            buster.assert.equals("Oops", e.message);
            test.end();
        });

        this.promises[0].resolve();
        this.promises[1].resolve();
    },

    "should reject complete callback if a promise rejects": function (test) {
        var self = this;
 
        buster.promise.sync(this.listeners).then(function () {
            buster.assert.fail();
            test.end();
        }, function () {
            buster.assert(self.listeners[0].called);
            buster.assert(!self.listeners[1].called);
            test.end();
        });

        this.promises[0].reject();
    }
});
