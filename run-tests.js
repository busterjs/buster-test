require("referee").format = require("formatio").ascii;

require("sinon").config = {
    useFakeTimers: true,
    useFakeServer: false
};

require("./test/auto-run-test");
require("./test/browser-env-test");
require("./test/reporters-test");
require("./test/reporters/html-test");
require("./test/reporters/json-proxy-test");
require("./test/reporters/specification-test");
require("./test/reporters/tap-test");
require("./test/reporters/teamcity-test");
require("./test/reporters/xml-test");
require("./test/reporters/brief-test");
require("./test/reporters/runtime-throttler-test");
require("./test/spec-test");
require("./test/test-case-test");
require("./test/test-context-test");
require("./test/test-runner-test");
