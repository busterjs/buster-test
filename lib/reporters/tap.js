function directive(test) {
    return test.deferred ? " # TODO " + (test.comment || "Deferred") : "";
}

function label(test) {
    return test.passed ? "ok " : "not ok ";
}

function getOutputStream(opt) {
    if (opt.outputStream) { return opt.outputStream; }
    var util = require("util");
    return {
        write: function (bytes) { util.print(bytes); }
    };
}

module.exports = {
    create: function (opt) {
        var reporter = Object.create(this);
        reporter.out = getOutputStream(opt || {});
        reporter.testCount = 0;
        reporter.contexts = [];
        return reporter;
    },

    listen: function (runner) {
        runner.bind(this);
        return this;
    },

    "suite:end": function () {
        this.out.write("1.." + this.testCount + "\n");
    },

    "context:start": function (context) {
        this.contexts.push(context.name);
    },

    "context:end": function () {
        this.contexts.pop();
    },

    "context:unsupported": function (data) {
        var name = data.context.name;
        var features = data.unsupported;
        var plural = features.length > 1 ? "s" : "";
        this.testCount += 1;
        this.out.write("not ok " + this.testCount + " " + name + " # SKIP " +
                       "Unsupported requirement" + plural + ": " + features.join(", ") + "\n");
    },

    "test:start": function (test) {
        this.testCount += 1;
        test.name = this.contexts.concat([test.name]).join(" ");
        this.test = test;
    },

    "test:success": function (test) {
        this.test.passed = true;
        this.testEnd(test);
    },

    "test:deferred": function (test) {
        this.test.deferred = true;
        this.test.comment = test.comment;
        this.testEnd(test);
    },

    testEnd: function (test) {
        this.out.write(label(this.test) + this.testCount + " " +
                       this.test.name + directive(this.test) + "\n");
    }
};

module.exports["test:failure"] = module.exports.testEnd;
module.exports["test:error"] = module.exports.testEnd;
module.exports["test:timeout"] = module.exports.testEnd;
