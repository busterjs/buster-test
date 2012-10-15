var colorizer = require("ansi-colorizer");
var consoleReporter = require("./console");

function Reporter() {}
Reporter.prototype = consoleReporter;
module.exports = new Reporter();

exports.create = function (opt) {
    var reporter = buster.create(this);
    opt = opt || {};
    reporter.io = opt.io || require("util");
    reporter.color = colorizer.configure(opt);
    reporter.reset();

    return reporter;
};

exports.listen = function (runner) {
    runner.bind(this);/*, {
        "suite:start": "reset", "suite:end": "printStats",
        "test:error": "testError", "test:failure": "testFailure"
    });*/

    return this;
};
