(function (B, when) {
    if (typeof require == "function" && typeof module == "object") {
        B = require("buster-core");
        when = require("when");
    }

    var current = [];
    var bspec = {};

    function supportRequirement(property) {
        return function (requirements) {
            return {
                describe: function () {
                    var context = bspec.describe.apply(bspec, arguments);
                    context[property] = requirements;
                    return context;
                }
            };
        };
    }

    bspec.ifAllSupported = supportRequirement("requiresSupportForAll");
    bspec.ifAnySupported = supportRequirement("requiresSupportForAny");
    bspec.ifSupported = bspec.ifAllSupported;

    function addContext(parent, name, spec) {
        var context = bspec.describe.context.create(name, spec, parent).parse();
        parent.contexts.push(context);
        return context;
    }

    function createContext(name, spec) {
        var context = bspec.describe.context.create(name, spec).parse();
        if (bspec.describe.onCreate) { bspec.describe.onCreate(context); }
        return context;
    }

    function asyncContext(name, callback) {
        var d = when.defer();
        callback(function (spec) {
            d.resolver.resolve(createContext(name, spec));
        });
        if (bspec.describe.onCreate) { bspec.describe.onCreate(d.promise); }
        return d.promise;
    }

    bspec.describe = function (name, spec) {
        if (current.length > 0) {
            return addContext(current[current.length - 1], name, spec);
        }
        if (spec && spec.length > 0) {
            return asyncContext(name, spec);
        }
        return createContext(name, spec);
    };

    B.extend(bspec.describe, B.eventEmitter);

    function markDeferred(spec, func) {
        spec.deferred = typeof func != "function";

        if (!spec.deferred && /^\/\//.test(spec.name)) {
            spec.deferred = true;
            spec.name = spec.name.replace(/^\/\/\s*/, "");
        }

        spec.comment = spec.deferred ? func : "";
    }

    bspec.it = function (name, func) {
        var context = current[current.length - 1];

        var spec = {
            name: name,
            func: arguments.length == 3 ? arguments[2] : func,
            context: context
        };

        markDeferred(spec, func);
        context.tests.push(spec);
        return spec;
    };

    bspec.itEventually = function (name, comment, func) {
        if (typeof comment == "function") {
            func = comment;
            comment = "";
        }

        return bspec.it(name, comment, func);
    };

    bspec.before = bspec.beforeEach = function (func) {
        var context = current[current.length - 1];
        context.setUp = func;
    };

    bspec.after = bspec.afterEach = function (func) {
        var context = current[current.length - 1];
        context.tearDown = func;
    };

    bspec.describe.context = {
        create: function (name, spec, parent) {
            if (!name || typeof name != "string") {
                throw new Error("Spec name required");
            }

            if (!spec || typeof spec != "function") {
                throw new Error("spec should be a function");
            }

            var context = B.create(this);
            context.name = name;
            context.parent = parent;
            context.spec = spec;

            return context;
        },

        parse: function () {
            if (!this.spec) {
                return this;
            }

            this.testCase = {
                before: bspec.before,
                beforeEach: bspec.beforeEach,
                after: bspec.after,
                afterEach: bspec.afterEach,
                it: bspec.it,
                itEventually: bspec.itEventually,
                describe: bspec.describe
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

    bspec.expose = function (env) {
        env = env || g;
        env.describe = bspec.describe;
        env.it = bspec.it;
        env.itEventually = bspec.itEventually;
        env.before = bspec.before;
        env.beforeEach = bspec.beforeEach;
        env.after = bspec.after;
        env.afterEach = bspec.afterEach;
    };

    if (typeof module == "object") {
        module.exports = bspec;
    } else {
        B.spec = bspec;
    }
}(typeof buster !== "undefined" ? buster : {},
  typeof when === "function" ? when : function () {}));
