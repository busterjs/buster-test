if (typeof require != "undefined") {
    var buster = require("buster-core");
}

buster.stackFilter = function (stack) {
    var lines = (stack || "").split("\n");
    var stackLines = [];

    for (var i = 0, l = lines.length; i < l; ++i) {
        if (/(\d+)?:\d+\)?$/.test(lines[i])) {
            if (!buster.stackFilter.match(lines[i])) {
                stackLines.push(lines[i].trim());
            }
        }
    }

    return stackLines;
};

var regexpes = {};

buster.stackFilter.match = function (line) {
    var filters = buster.stackFilter.filters;

    for (var i = 0, l = filters.length; i < l; ++i) {
        if (!regexpes[filters[i]]) {
            regexpes[filters[i]] = new RegExp(filters[i]);
        }

        if (regexpes[filters[i]].test(line)) {
            return true;
        }
    }

    return false;
}

buster.stackFilter.filters = ["buster-assert/lib",
                              "buster-test/lib", 
                              "buster-util/lib",
                              "buster-core/lib",
                              "node.js",
                              "static/runner.js"/* JsTestDriver */];

if (typeof module != "undefined") {
    module.exports = buster.stackFilter;
}
