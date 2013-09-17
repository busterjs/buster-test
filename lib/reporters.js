if (typeof module === "object" && typeof require === "function") {
    module.exports = {
        specification: require("./reporters/specification"),
        jsonProxy: require("./reporters/json-proxy"),
        xml: require("./reporters/xml"),
        tap: require("./reporters/tap"),
        brief: require("./reporters/brief"),
        html: require("./reporters/html"),
        teamcity: require("./reporters/teamcity"),

        load: function (reporter) {
            if (module.exports[reporter]) {
                return module.exports[reporter];
            }

            return require(reporter);
        }
    };

    module.exports.defaultReporter = module.exports.brief;
} else if (typeof define === "function") {
    define("buster-test/reporters", ["buster-test/reporters/html", "buster-test/reporters/html2"], function (html, html2) {
        var reporters = {
            html: html,
            html2: html2,
            load: function (reporter) {
                return reporters[reporter];
            }
        };

        reporters.defaultReporter = reporters.brief;
        return reporters;
    });
} else {
    buster.reporters = buster.reporters || {};
    buster.reporters.defaultReporter = buster.reporters.brief;
    buster.reporters.load = function (reporter) {
        return buster.reporters[reporter];
    };
}
