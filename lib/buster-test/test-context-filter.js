var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

buster.testContextFilter = function (context, filter, name) {
    var filtered = buster.extend({}, context, {
        tests: [],
        contexts: []
    });

    filter = typeof filter == "string" ? new RegExp(filter) : filter;
    name = name && name + " " || "";

    for (var i = 0, l = context.tests.length; i < l; ++i) {
        if (!filter || filter.test(name + context.tests[i].name)) {
            filtered.tests.push(context.tests[i]);
        }
    }

    var ctx, contexts = context.contexts;

    for (i = 0, l = contexts.length; i < l; ++i) {
        ctx = buster.testContextFilter(contexts[i], filter, name + contexts[i].name);
        filtered.contexts.push(ctx);
    }

    return filtered;
};

if (typeof module != "undefined") {
    module.exports = buster.testContextFilter;
}
