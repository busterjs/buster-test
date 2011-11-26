if (typeof require == "function") {
    var buster = { testContextFilter: require("./test-context-filter") };
}

buster.testContext = (function () {
    function compile(contexts, filter) {
        return contexts.reduce(function (compiled, ctx) {
            ctx = buster.testContextFilter(parse(ctx), filter);
            if (!empty(ctx)) compiled.push(ctx);
            return compiled;
        }, []);
    }

    function parse(context) {
        if (!context.tests && typeof context.parse == "function") {
            return context.parse();
        }

        return context;
    }

    function empty(context) {
        return context.tests.length == 0 &&
            context.contexts.length == 0;
    }

    return { compile: compile };
}());

if (typeof module == "object") {
    module.exports = buster.testContext;
}
