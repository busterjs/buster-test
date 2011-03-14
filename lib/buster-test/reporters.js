if (typeof require != "undefined") {
    module.exports = {
        bddConsole: require("./reporters/bdd-console"),
        jsonProxy: require("./reporters/json-proxy"),
        quietConsole: require("./reporters/quiet-console"),
        xml: require("./reporters/xml"),
        xUnitConsole: require("./reporters/xunit-console")
    };
}
