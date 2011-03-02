var buster = buster || {};
var sys = require("sys");

if (typeof module != "undefined") {
    buster.util = require("buster-util");
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

            if (this.state == states.unresolved) {
                this.callbacks = this.callbacks || [];
                this.callbacks.push(listener);
            } else {
                notify.call(this, listener);
            }
        },

        resolve: function () {
            return fulfill.call(this, "resolve", arguments);
        },

        reject: function () {
            return fulfill.call(this, "reject", arguments);
        }
    };

    // buster.promise.when = function () {
    //     var promise = buster.promise.create();
    //     var toGo = arguments.length;

    //     function done() {
    //         toGo -= 1;

    //         if (toGo == 0) {
    //             promise.resolve();
    //         }
    //     }

    //     for (var i = 0, l = arguments.length; i < l; ++i) {
    //         arguments[i].then(done);
    //     }

    //     return promise;
    // };

    buster.promise.sequential = function (funcs, opt) {
        opt = opt || {};
        var promise = buster.promise.create();
        var next = function () { runOne(funcs.shift()); }

        if (typeof funcs.slice == "function") {
            funcs = funcs.slice();
        }

        function runOne(func) {
            var resolution;

            if (!func) {
                return promise.resolve();
            }

            try {
                resolution = func.call(opt.thisObj);
            } catch (e) {
                if (opt.error) {
                    opt.error(e);
                } else {
                    promise.reject(e);
                    return;
                }
            }

            if (resolution) {
                resolution.then(next, function () {
                    promise.reject.apply(promise, arguments);
                });
            } else {
                buster.util.nextTick(next);
            }
        }

        buster.util.nextTick(next);
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

    // buster.promise.parallelize = function (items, opt) {
    //     opt = opt || {};
    //     var args = Array.prototype.slice.call(opt.args);
    //     var promises = [], promise;
    //     var method = typeof opt.method == "function" && opt.method;

    //     for (var i = 0, l = items.length; i < l; ++i) {
    //         if (method) {
    //             promise = method.apply(opt.thisObj, [item].concat(args));
    //         } else {
    //             promise = item.apply(opt.thisObj, args);
    //         }

    //         promises.push(buster.promise.thenable(promise));
    //     }

    //     return buster.promise.when(promises);
    // };
}());

if (typeof module != "undefined") {
    module.exports = buster.promise;
}