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

    function supportRequirement(property) {
        return function (requirements) {
            return {
                describe: function () {
                    var context = B.spec.describe.apply(B.spec, arguments);
                    context[property] = requirements;
                    return context;
                }
            };
        };
    }

    B.spec.ifAllSupported = supportRequirement("requiresSupportForAll");
    B.spec.ifAnySupported = supportRequirement("requiresSupportForAny");
    B.spec.ifSupported = B.spec.ifAllSupported;

    B.spec.describe = function (name, spec) {
        if (current.length > 0) {
            var currCtx = current[current.length - 1];
            var ctx = B.spec.describe.context.create(name, spec, currCtx);
            currCtx.contexts.push(ctx.parse());
            return ctx;
        }

        var context = buster.extend(B.spec.describe.context.create(name, spec));
        context.parse();

        if (B.spec.describe.onCreate) {
            B.spec.describe.onCreate(context);
        }

        return context;
    };

    buster.extend(B.spec.describe, buster.eventEmitter);

    B.spec.it = function (name, func) {
        var context = current[current.length - 1];

        var spec = {
            name: name,
            func: arguments.length == 3 ? arguments[2] : func,
            context: context
        };

        spec.deferred = typeof func != "function";
        spec.comment = spec.deferred ? func : "";
        context.tests.push(spec);
        return spec;
    };

    B.spec.itEventually = function (name, comment, func) {
        if (typeof comment == "function") {
            func = comment;
            comment = "";
        }

        return B.spec.it(name, comment, func);
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
                it: B.spec.it,
                itEventually: B.spec.itEventually,
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
        env.it = B.spec.it;
        env.itEventually = B.spec.itEventually;
        env.before = B.spec.before;
        env.after = B.spec.after;
    };
}(buster));
