if (typeof require != "undefined") {
    var moduleLoader = require("buster-module-loader");

    module.exports = {
        bddConsole: require("./reporters/bdd-console"),
        jsonProxy: require("./reporters/json-proxy"),
        quietConsole: require("./reporters/quiet-console"),
        xml: require("./reporters/xml"),
        tap: require("./reporters/tap"),
        xUnitConsole: require("./reporters/xunit-console"),

        load: function (reporter) {
            if (module.exports[reporter]) {
                return module.exports[reporter];
            }

            return moduleLoader.load(reporter);
        }
    };
}
