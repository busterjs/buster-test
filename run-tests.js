require("referee").format = require("formatio").ascii;

require("sinon").config = {
    useFakeTimers: true,
    useFakeServer: false
};

// require("./test/unit/buster-test/auto-run-test");
require("./test/unit/buster-test/browser-env-test");
require("./test/unit/buster-test/reporters-test");
require("./test/unit/buster-test/reporters/dots-test");
require("./test/unit/buster-test/reporters/html-test");
require("./test/unit/buster-test/reporters/json-proxy-test");
require("./test/unit/buster-test/reporters/specification-test");
require("./test/unit/buster-test/reporters/tap-test");
require("./test/unit/buster-test/reporters/teamcity-test");
// require("./test/unit/buster-test/reporters/xml-test");
require("./test/unit/buster-test/spec-test");
require("./test/unit/buster-test/test-case-test");
require("./test/unit/buster-test/test-context-test");
// require("./test/unit/buster-test/test-runner-test");
