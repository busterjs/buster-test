((typeof define === "function" && define.amd && function (m) {
    define("buster-test/test-context", ["bane", "when", "lodash"], m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
        module.exports = m(require("bane"), require("when"), require("lodash"));
    }) || function (m) {
    this.buster = this.buster || {};
    this.buster.testContext = m(this.bane, this.when, this._);
})(function (bane, when, _) {
    "use strict";

    var bctx = bane.createEventEmitter();

    function empty(context) {
        return context.tests.length === 0 &&
            context.contexts.length === 0;
    }

    function filterContexts(contexts, filter, prefix) {
        return _.reduce(contexts, function (filtered, context) {
            var ctx = bctx.filter(context, filter, prefix);
            if (ctx.tests.length > 0 || ctx.contexts.length > 0) {
                filtered.push(ctx);
            }
            return filtered;
        }, []);
    }

    function filterTests(tests, filter, prefix) {
        return _.reduce(tests, function (filtered, test) {
            if (!filter || filter.test(prefix + test.name)) {
                filtered.push(test);
            }
            return filtered;
        }, []);
    }

    function makeFilter(filter) {
        if (typeof filter === "string") { return new RegExp(filter, "i"); }
        if (Object.prototype.toString.call(filter) !== "[object Array]") {
            return filter;
        }

        return {
            test: function (string) {
                return filter.length === 0 || _.some(filter, function (f) {
                    return new RegExp(f).test(string);
                });
            }
        };
    }

    function parse(context) {
        if (!context.tests && typeof context.parse === "function") {
            return context.parse();
        }
        return context;
    }

    function compile(contexts, filter) {
        return _.reduce(contexts, function (compiled, ctx) {
            if (when.isPromise(ctx)) {
                var deferred = when.defer();
                ctx.then(function (context) {
                    deferred.resolve(bctx.filter(parse(context), filter));
                });
                deferred.promise.name = ctx.name;
                compiled.push(deferred.promise);
            } else {
                ctx = bctx.filter(parse(ctx), filter);
                if (!empty(ctx)) { compiled.push(ctx); }
            }
            return compiled;
        }, []);
    }

    function filter(ctx, filterContent, name) {
        filterContent = makeFilter(filterContent);
        name = (name || "") + ctx.name + " ";

        return _.extend({}, ctx, {
            tests: filterTests(ctx.tests || [], filterContent, name),
            contexts: filterContexts(ctx.contexts || [], filterContent, name)
        });
    }

    bctx.compile = compile;
    bctx.filter = filter;
    return bctx;
});
