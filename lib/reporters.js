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
} else if (typeof define === "function") {
    define(["./reporters/json-proxy",
            "./reporters/xml",
            "./reporters/html"], function (jsonProxy, xml, html) {
        var reporters = {
            jsonProxy: jsonProxy,
            xml: xml,
            html: html,
            load: function (reporter) {
                return reporters[reporter];
            }
        };

        return reporters;
    });
} else {
    buster.reporters = buster.reporters || {};
    buster.reporters.load = function (reporter) {
        return buster.reporters[reporter];
    };
}
