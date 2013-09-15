((typeof define === "function" && define.amd && function (m) {
    define("buster-test/reporters/runtime-throttler", ["bane", "lodash"], m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
           module.exports = m(require("bane"), require("lodash"));
       }) || function (m) {
           this.buster = this.buster || {};
           this.buster.reporters = this.buster.reporters || {};
           this.buster.reporters.runtimeThrottler = m(this.bane, this._);
       }
)(function (bane, _) {
    "use strict";

    function runtime(env) {
        return {
            uuid: env.uuid,
            contexts: 0,
            events: [],
            queue: function (name, data) {
                this.events.push({ name: name, data: data });
            },
            flush: function (emitter) {
                _.forEach(this.events, function (event) {
                    emitter.emit(event.name, event.data);
                });
            }
        };
    }

    function getRuntime(runtimes, env) {
        return runtimes.filter(function (r) {
            return r.uuid === env.uuid;
        })[0];
    }

    function proxy(name) {
        return function (e) {
            var rt = getRuntime(this.runtimes, e.runtime);
            if (rt && rt.contexts > 0) {
                rt.queue(name, e);
            } else {
                this.emit(name, e);
            }
        };
    }

    function RuntimeThrottler() {
        this.runtimes = [];
        this.results = [];
    }

    RuntimeThrottler.prototype = bane.createEventEmitter({
        create: function () {
            return new RuntimeThrottler();
        },

        listen: function (runner) {
            runner.bind(this);
            if (runner.console) {
                runner.console.on("log", this.log, this);
            }
            return this;
        },

        "suite:start": function (e) {
            if (this.runtimes.length === 0) {
                this.emit("suite:start", {});
            }
            this.runtimes.push(runtime(e.runtime));
        },

        "suite:configuration": function (e) {
            this.emit("suite:configuration", e);
        },

        "context:unsupported": function (e) {
            var rt = getRuntime(this.runtimes, e.runtime);
            if (rt.contexts === 0) {
                this.emit("context:unsupported", e);
            } else {
                rt.queue("context:unsupported", e);
            }
        },

        "context:start": function (e) {
            var rt = getRuntime(this.runtimes, e.runtime);
            if (this.runtimes.length > 1) {
                rt.queue("context:start", e);
                rt.contexts += 1;
            } else {
                this.emit("context:start", e);
            }
        },

        "test:setUp": proxy("test:setUp"),
        "test:tearDown": proxy("test:tearDown"),
        "test:start": proxy("test:start"),
        "test:error": proxy("test:error"),
        "test:failure": proxy("test:failure"),
        "test:timeout": proxy("test:timeout"),
        "test:success": proxy("test:success"),
        "test:async": proxy("test:async"),
        "test:deferred": proxy("test:deferred"),

        "context:end": function (e) {
            var rt = getRuntime(this.runtimes, e.runtime);

            if (rt) {
                rt.queue("context:end", e);
                rt.contexts -= 1;

                if (rt.contexts <= 0) {
                    rt.contexts = 0;
                    rt.flush(this);
                }
            } else {
                this.emit("context:end", e);
            }
        },

        "suite:end": function (e) {
            this.results.push(e);
            if (this.results.length === this.runtimes.length ||
                this.runtimes.length === 0) {
                this.emit("suite:end", _.reduce(this.results, function (res, r) {
                    return {
                        contexts: (res.contexts || 0) + r.contexts,
                        tests: (res.tests || 0) + r.tests,
                        errors: (res.errors || 0) + r.errors,
                        failures: (res.failures || 0) + r.failures,
                        assertions: (res.assertions || 0) + r.assertions,
                        timeouts: (res.timeouts || 0) + r.timeouts,
                        deferred: (res.deferred || 0) + r.deferred,
                        ok: res.ok && r.ok
                    };
                }, { ok: true }));
            }
        },

        "runner:focus": function () {
            if (!this.runnerFocus) {
                this.emit("runner:focus");
                this.runnerFocus = true;
            }
        },

        uncaughtException: function (e) {
            this.emit("uncaughtException", e);
        },

        log: function (e) {
            this.emit("log", e);
        }
    });

    return RuntimeThrottler.prototype;
});
