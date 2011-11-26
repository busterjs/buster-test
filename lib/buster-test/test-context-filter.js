var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

(function () {
    buster.testContextFilter = function (context, filter, name) {
        filter = makeFilter(filter);
        name = (name || "") + context.name + " ";

        return buster.extend({}, context, {
            tests: filterTests(context.tests || [], filter, name),
            contexts: filterContexts(context.contexts || [], filter, name)
        });
    };

    function filterContexts(contexts, filter, prefix) {
        return contexts.reduce(function (filtered, context) {
            var ctx = buster.testContextFilter(context, filter, prefix);
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
        if (!(filter instanceof Array)) return filter;

        return {
            test: function (string) {
                return filter.some(function (f) {
                    return new RegExp(f).test(string);
                });
            }
        };
    }
}());

if (typeof module != "undefined") {
    module.exports = buster.testContextFilter;
}
