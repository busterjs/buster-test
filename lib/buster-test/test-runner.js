var buster = buster || {};
var sys = {
    puts: function (str) {
        jstestdriver.console.log(str);
    },

    inspect: function (obj) {
        if (typeof obj == "fuction") {
            return obj.toString();
        } else {
            return JSON.stringify(obj);
        }
    }
};

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    buster.eventEmitter = require("buster-event-emitter");
    sys = require("sys");
}

(function () {
    function getAll(context, method, appendMethod) {
        var func, funcs = [], ctx = context;
        var getter = "get" + method.substr(0, 1).toUpperCase () + method.substr(1);

        while (ctx) {
            func = ctx[getter]();

            if (typeof func == "function") {
                funcs[appendMethod](func);
            }

            ctx = ctx.parent;
        }

        return funcs;
    }

    function callAllOn(funcs, ctx) {
        for (var i = 0, l = funcs.length; i < l; ++i) {
            funcs[i].call(ctx);
        }
    }

    buster.testRunner = {
        run: function (context) {
            var tests = context.tests();
            var setUps = this.getSetUps(context);
            var tearDowns = this.getTearDowns(context);

            for (var i = 0, l = tests.length; i < l; ++i) {
                try {
                    callAllOn(setUps, context.testCase);
                    tests[i].func.call(context.testCase);
                } catch (e) {}

                try {
                    callAllOn(tearDowns, context.testCase);
                } catch (e) {}
            }

            var contexts = context.contexts();

            for (i = 0, l = contexts.length; i < l; ++i) {
                this.run(contexts[i]);
            }
        },

        getSetUps: function (context) {
            return getAll(context, "setUp", "unshift");
        },

        getTearDowns: function (context) {
            return getAll(context, "tearDown", "push");
        }
    };
}());

if (typeof module != "undefined") {
    module.exports = buster.testRunner;
}
