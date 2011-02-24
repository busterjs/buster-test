var buster = buster || {};
var sys = require("sys");

if (typeof module != "undefined") {
    buster.util = require("./util");
}

(function () {
    var states = {
        unresolved: "unresolved",
        resolve: "resolve",
        reject: "reject"
    };

    function notify(listener) {
        if (typeof listener[this.state] == "function") {
            listener[this.state].apply(null, this.resolution);
        }
    }

    function notifyDeferred(promise) {
        var deferred = promise.deferred;

        if (deferred && deferred.state == states.unresolved) {
            deferred[promise.state].apply(deferred, promise.resolution);
        }
    }

    function fulfill(how, args) {
        if (this.state != states.unresolved) {
            throw new Error("Promise is already fulfilled");
        }

        this.state = states[how];
        var callbacks = this.callbacks || [];
        this.resolution = Array.prototype.slice.call(args);

        for (var i = 0, l = callbacks.length; i < l; ++i) {
            notify.call(this, callbacks[i]);
        }

        notifyDeferred(this);

        return this;
    }

    function F() {}
    var id = 0;

    buster.promise = {
        state: states.unresolved,

        create: function (func) {
            F.prototype = this;
            var promise = new F();
            promise.id = id++;

            if (func) {
                func(this);
            }

            return promise;
        },

        then: function (resolve, reject) {
            var listener = { resolve: resolve, reject: reject };

            if (!this.deferred) {
                this.deferred = buster.promise.create();
            }

            if (this.state == states.unresolved) {
                this.callbacks = this.callbacks || [];
                this.callbacks.push(listener);
            } else {
                notify.call(this, listener);
                notifyDeferred(this);
            }

            return this.deferred;
        },

        resolve: function () {
            return fulfill.call(this, "resolve", arguments);
        },

        reject: function () {
            return fulfill.call(this, "reject", arguments);
        }
    };

    function deferred(func) {
        return function () {
            var resolution = func();

            if (!resolution) {
                resolution = buster.promise.create();
                resolution.resolve();
            }

            return resolution;
        };
    }

    buster.promise.when = function () {
        var promise = buster.promise.create();
        var toGo = arguments.length;

        function done() {
            toGo -= 1;

            if (toGo == 0) {
                promise.resolve();
            }
        }

        for (var i = 0, l = arguments.length; i < l; ++i) {
            arguments[i].then(done);
        }

        return promise;
    };

    buster.promise.sync = function (items, opt) {
        opt = opt || {};
        items = items.slice();
        var args = Array.prototype.slice.call(opt.args);
        var promise = buster.promise.create();

        function runOne(item) {
            var next = function () { runOne(items.shift()); }, resolution;

            if (!item) {
                return promise.resolve();
            }

            try {
                if (typeof opt.method == "function") {
                    resolution = opt.method.apply(opt.thisObj, [item].concat(args));
                } else {
                    resolution = item.apply(opt.thisObj, args);
                }
            } catch (e) {
                promise.reject(e);
                return;
            }

            if (resolution) {
                resolution.then(next, function () {
                    promise.reject.apply(promise, arguments);
                });
            } else {
                buster.util.nextTick(next);
            }
        }

        runOne(items.shift());
        return promise;
    };

    buster.promise.thenable = function (val) {
        if (!val || typeof val.then != "function") {
            var promise = buster.promise.create();
            promise.resolve(val);

            return promise;
        }

        return val;
    };

    buster.promise.parallelize = function (items, opt) {
        opt = opt || {};
        var args = Array.prototype.slice.call(opt.args);
        var promises = [], promise;
        var method = typeof opt.method == "function" && opt.method;

        for (var i = 0, l = items.length; i < l; ++i) {
            if (method) {
                promise = method.apply(opt.thisObj, [item].concat(args));
            } else {
                promise = item.apply(opt.thisObj, args);
            }

            promises.push(buster.promise.thenable(promise));
        }

        return buster.promise.when(promises);
    };
}());

if (typeof module != "undefined") {
    module.exports = buster.promise;
}