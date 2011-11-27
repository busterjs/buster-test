if (typeof require == "function") {
    var buster = require("buster-core");
}

buster.testContext = (function () {
    function empty(context) {
        return context.tests.length == 0 &&
            context.contexts.length == 0;
    }

    function filterContexts(contexts, filter, prefix) {
        return contexts.reduce(function (filtered, context) {
            var ctx = buster.testContext.filter(context, filter, prefix);
            if (ctx.tests.length > 0 || ctx.contexts.length > 0) {
                filtered.push(ctx);
            }
            return filtered;
        }, []);
    }

    function filterTests(tests, filter, prefix) {
        return tests.reduce(function (filtered, test) {
            if (!filter || filter.test(prefix + test.name)) {
                filtered.push(test);
            }
            return filtered;
        }, []);
    }

    function makeFilter(filter) {
        if (typeof filter == "string") return new RegExp(filter, "i");
        if (Object.prototype.toString.call(filter) != "[object Array]") return filter;

        return {
            test: function (string) {
                return filter.length == 0 || filter.some(function (f) {
                    return new RegExp(f).test(string);
                });
            }
        };
    }

    function parse(context) {
        if (!context.tests && typeof context.parse == "function") {
            return context.parse();
        }

        return context;
    }

    function compile(contexts, filter) {
        return contexts.reduce(function (compiled, ctx) {
            ctx = buster.testContext.filter(parse(ctx), filter);
            if (!empty(ctx)) compiled.push(ctx);
            return compiled;
        }, []);
    }

    function filter(context, filter, name) {
        filter = makeFilter(filter);
        name = (name || "") + context.name + " ";

        return buster.extend({}, context, {
            tests: filterTests(context.tests || [], filter, name),
            contexts: filterContexts(context.contexts || [], filter, name)
        });
    }

    return { compile: compile, filter: filter };
}());

if (typeof module == "object") {
    module.exports = buster.testContext;
}
