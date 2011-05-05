var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

(function (B) {
    var current = [];
    B.spec = {};

    if (typeof module != "undefined") {
        module.exports = B.spec;
    }

    B.spec.describe = function (name, spec) {
        if (current.length > 0) {
            var currCtx = current[current.length - 1];
            var ctx = B.spec.describe.context.create(name, spec, currCtx);
            currCtx.contexts.push(ctx.parse());
            return;
        }

        var context = buster.extend(B.spec.describe.context.create(name, spec));
        context.parse();

        if (B.spec.describe.onCreate) {
            B.spec.describe.onCreate(context);
        }

        return context;
    };

    buster.extend(B.spec.describe, buster.eventEmitter);

    B.spec.should = function (name, func) {
        var context = current[current.length - 1];
        var prefix = "should ";

        if (/^\/\//.test(name)) {
            prefix = "//" + prefix;
            name = name.replace(/^\/\/\s*/, "");
        }

        context.tests.push({
            name: prefix + name,
            func: func,
            context: context
        });
    };

    B.spec.shouldEventually = function (name, func) {
        return B.spec.should("//" + name, func);
    };

    B.spec.before = function (func) {
        var context = current[current.length - 1];
        context.setUp = func;
    };

    B.spec.after = function (func) {
        var context = current[current.length - 1];
        context.tearDown = func;
    };

    B.spec.describe.context = {
        create: function (name, spec, parent) {
            if (!name || typeof name != "string") {
                throw new Error("Spec name required");
            }

            if (!spec || typeof spec != "function") {
                throw new Error("spec should be a function");
            }

            var context = buster.create(this);
            context.name = name;
            context.parent = parent;
            context.spec = spec;

            return context;
        },

        parse: function () {
            if (!this.spec) {
                return;
            }

            this.testCase = {
                before: B.spec.before,
                after: B.spec.after,
                should: B.spec.should,
                shouldEventually: B.spec.shouldEventually,
                describe: B.spec.describe
            };

            this.tests = [];
            current.push(this);
            this.contexts = [];
            this.spec.call(this.testCase);
            current.pop();
            delete this.spec;

            return this;
        }
    };

    var g = typeof global != "undefined" && global || this;

    B.spec.expose = function (env) {
        env = env || g;
        env.describe = B.spec.describe;
        env.should = B.spec.should;
        env.before = B.spec.before;
        env.after = B.spec.after;
        env.shouldEventually = B.spec.shouldEventually;
    };
}(buster));
