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
            listener[this.state](null, this.resolution);
        }
    }

    function fulfill(how) {
        if (this.state != states.unresolved) {
            throw new Error("Promise is already fulfilled");
        }

        this.state = states[how];
        var callbacks = this.callbacks || [];

        for (var i = 0, l = callbacks.length; i < l; ++i) {
            notify.call(this, callbacks[i]);
        }

        if (this.deferred) {
            this.deferred[this.state]();
        }
    }

    function F() {}

    buster.promise = {
        state: states.unresolved,

        create: function () {
            F.prototype = this;
            return new F();
        },

        then: function (resolve, reject) {
            var listener = { resolve: resolve, reject: reject };

            if (!this.deferred) {
                this.deferred = buster.promise.create();
                this.deferred.id = this.id;
            }

            if (this.state == states.unresolved) {
                this.callbacks = this.callbacks || [];
                this.callbacks.push(listener);
            } else {
                notify.call(this, listener);

                if (this.deferred && this.deferred.status == states.unresolved) {
                    this.deferred.resolve();
                }
            }

            return this.deferred;
        },

        resolve: function () {
            return fulfill.call(this, "resolve");
        },

        reject: function () {
            return fulfill.call(this, "reject");
        }
    };
}());

if (typeof module != "undefined") {
    module.exports = buster.promise;
}