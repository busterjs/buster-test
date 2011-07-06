(function () {
    if (typeof document == "undefined") {
        return;
    }

    var assert = buster.assertions.assert;
    var refute = buster.assertions.refute;

    function reporterSetUp() {
        this.runner = buster.create(buster.eventEmitter);
        this.root = document.createElement("div");

        this.reporter = buster.reporters.html.create({
            root: this.root
        }).listen(this.runner);

        this.list = function () {
            return this.root.getElementsByTagName("ul")[0];
        };
    }

    function generateError(message, type) {
        var error = new Error(message);
        error.name = type || "AssertionError";
        try { throw error; } catch (e) { return e; }
    }

    function assertMessage(list, level, message) {
        var messages = list.firstChild.getElementsByTagName("ul")[0];

        assert.className(messages, "messages");

        assert.match(messages.firstChild, {
            innerHTML: "Is message",
            className: "log"
        });
    }

    buster.util.testCase("HTMLReporterCreateTest", {
        tearDown: function () {
            var h1s = document.getElementsByTagName("h1");

            for (var i = 0, l = h1s.length; i < l; ++i) {
                if (h1s[i]) {
                    h1s[i].parentNode.removeChild(h1s[i]);
                }
            }
        },

        "should throw without root element": function () {
            assert.exception(function () {
                buster.reporters.html.create();
            });
        },

        "should add 'buster-test' class to root element": function () {
            var element = document.createElement("div");

            buster.reporters.html.create({ root: element });

            assert.className(element, "buster-test");
        },

        "should add 'buster-test' class to html element if root is body": function () {
            buster.reporters.html.create({ root: document.body });

            assert.className(document.documentElement, "buster-test");
        },

        "should make page mobile friendly if logging on body": function () {
            buster.reporters.html.create({ root: document.body });

            var metas = document.getElementsByTagName("meta"), meta;

            for (var i = 0, l = metas.length; i < l; ++i) {
                if (metas[i].name == "viewport") {
                    meta = metas[i];
                }
            }

            refute.isNull(meta);
            assert.equals(meta.content, "width=device-width, initial-scale=1.0");
        },

        "should inject CSS file from same directory if buster-test.js is not found":
        function () {
            buster.reporters.html.create({ root: document.body });

            var links = document.getElementsByTagName("link");
            var link = links[links.length - 1];

            assert.match(link, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: "buster-test.css"
            });
        },

        "should inject CSS file if logging on body": function () {
            document.body.innerHTML += "<script src=\"/some/path/buster-test.js\"></script>";
            buster.reporters.html.create({ root: document.body });

            var links = document.getElementsByTagName("link");
            var link = links[links.length - 1];

            assert.match(link, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: "/some/path/buster-test.css"
            });
        },

        "should inject h1 if logging on body": function () {
            document.title = "";
            buster.reporters.html.create({ root: document.body });

            var h1 = document.getElementsByTagName("h1")[0];

            assert.match(h1, { innerHTML: "Buster.JS Test case" });
        },

        "should not inject h1 if one already exists": function () {
            var h1 = document.createElement("h1");
            h1.innerHTML = "Hey";
            document.body.appendChild(h1);
            buster.reporters.html.create({ root: document.body });

            var h1s = document.getElementsByTagName("h1");

            assert.equals(h1s.length, 1);
            assert.match(h1s[0], { innerHTML: "Hey" });
        },

        "should use document.title in h1": function () {
            document.title = "Use it";
            buster.reporters.html.create({ root: document.body });

            var h1 = document.getElementsByTagName("h1")[0];

            assert.match(h1, { innerHTML: "Use it" });
        }
    });

    buster.util.testCase("HTMLReporterTestsRunningTest", {
        setUp: reporterSetUp,

        "should add context name as h2 when entering top-level context": function () {
            this.reporter.contextStart({ name: "Some context" });

            assert.match(this.root.firstChild, {
                tagName: "h2", innerHTML: "Some context"
            });
        },

        "should not add context name as h2 when entering nested context": function () {
            this.reporter.contextStart({ name: "Some context" });
            this.reporter.contextStart({ name: "Some other context" });

            assert.equals(this.root.getElementsByTagName("h2").length, 1);
        },

        "should print passing test name as list item with success class": function () {
            this.reporter.testSuccess({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "success",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print passing test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testSuccess({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /in some state should do it/
            });
        },

        "should not 'remember' completed contexts": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.contextEnd({ name: "in some state" });
            this.reporter.contextStart({ name: "in some other state" });
            this.reporter.testSuccess({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /in some other state should do it/
            });
        },

        "should print failed test name as list item with error class": function () {
            this.reporter.testFailure({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "failure",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print test failure with stack trace": function () {
            this.reporter.testFailure({
                name: "should do something",
                error: generateError("Expected a to be equal to b")
            });

            var error = this.list().firstChild.getElementsByTagName("p")[0];
            var stack = this.list().firstChild.getElementsByTagName("ul")[0];

            assert.match(error, {
                innerHTML: "Expected a to be equal to b",
                className: "error-message"
            });

            assert.equals(stack.className, "stack");
            assert.match(stack.firstChild, { innerHTML: /html-test.js/ });
        },

        "should print failed test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testFailure({ name: "should do it" });

            assert.match(this.list().firstChild,{
                innerHTML: /in some state should do it/
            });
        },

        "should print errored test name as list item with error class": function () {
            this.reporter.testError({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "error",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print test error with stack trace": function () {
            this.reporter.testError({
                name: "should do something",
                error: generateError("Expected a to be equal to b", "Error")
            });

            var error = this.list().firstChild.getElementsByTagName("p")[0];
            var stack = this.list().firstChild.getElementsByTagName("ul")[0];

            assert.match(error, {
                innerHTML: "Error: Expected a to be equal to b",
                className: "error-message"
            });

            assert.equals(stack.className, "stack");
            assert.match(stack.firstChild, { innerHTML: /html-test.js/ });
        },

        "should print errored test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testError({ name: "should do it" });

            assert.match(this.list().firstChild,{
                innerHTML: /in some state should do it/
            });
        },

        "should print deferred test as list item with deferred class": function () {
            this.reporter.testDeferred({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "deferred",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print deferred test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testDeferred({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /in some state should do it/
            });
        },

        "should print timed out test as list item with timeout class": function () {
            this.reporter.testTimeout({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "timeout",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print timed out test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testTimeout({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /<[hH]3>in some state should do it<\/[hH]3>/
            });
        },

        "should print log message for passing test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testSuccess({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should print log message for failing test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testFailure({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should print log message for errored test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testError({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should print log message for timed out test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testTimeout({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should not re-print previous log messages": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testTimeout({ name: "should do it" });
            this.reporter.log({ level: "warn", message: "Is other message" });
            this.reporter.testTimeout({ name: "should go again" });

            var messages = this.list().getElementsByTagName("ul")[1];
            assert.equals(messages.childNodes.length, 1);
        },

        "should render two contexts": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.testSuccess({ name: "should do it" });
            this.reporter.contextEnd({ name: "Some stuff" });
            this.reporter.contextStart({ name: "Other stuff" });
            this.reporter.testSuccess({ name: "should do more" });
            this.reporter.contextEnd({ name: "Other stuff" });

            var headings = this.root.getElementsByTagName("h2");

            assert.equals(headings.length, 2);
            assert.tagName(headings[0].nextSibling, "ul");
            assert.tagName(headings[1].nextSibling, "ul");
        }
    });

    buster.util.testCase("HTMLReporterStatsTest", {
        setUp: function () {
            reporterSetUp.call(this);
            this.reporter.contextStart({ name: "Some context" });
            this.reporter.testSuccess({ name: "should do it" });
            this.reporter.contextStart({ name: "Some context" });

            this.stats = function () {
                return this.root.getElementsByTagName("div")[0];
            };
        },

        "should add stats element": function () {
            this.reporter.addStats({});

            assert.className(this.stats(), "stats");
        },

        "should add stats heading": function () {
            this.reporter.addStats({});

            assert.match(this.stats().firstChild, {
                tagName: "h2",
                innerHTML: "Test failures!"
            });
        },

        "should add stats in list": function () {
            this.reporter.addStats({
                contexts: 2,
                tests: 4,
                assertions: 6,
                errors: 1,
                failures: 1,
                timeouts: 1,
                deferred: 2
            });

            var stats = this.stats().firstChild.nextSibling;
            assert.tagName(stats, "ul");

            assert.match(stats.childNodes[0].innerHTML, "2 test cases");
            assert.match(stats.childNodes[1].innerHTML, "4 tests");
            assert.match(stats.childNodes[2].innerHTML, "6 assertions");
            assert.match(stats.childNodes[3].innerHTML, "1 failure");
            assert.match(stats.childNodes[4].innerHTML, "1 error");
            assert.match(stats.childNodes[5].innerHTML, "1 timeout");
            assert.match(stats.childNodes[6].innerHTML, "2 deferred");
        }
    });

    buster.util.testCase("HTMLReporterEventMappingTest", sinon.testCase({
        setUp: function () {
            this.stub(buster.reporters.html, "contextStart");
            this.stub(buster.reporters.html, "contextEnd");
            this.stub(buster.reporters.html, "testSuccess");
            this.stub(buster.reporters.html, "testFailure");
            this.stub(buster.reporters.html, "testError");
            this.stub(buster.reporters.html, "testTimeout");
            this.stub(buster.reporters.html, "testDeferred");
            this.stub(buster.reporters.html, "log");
            this.stub(buster.reporters.html, "addStats");

            this.runner = buster.create(buster.eventEmitter);
            this.runner.console = buster.create(buster.eventEmitter);
            this.reporter = buster.reporters.html.create({
                root: document.createElement("div")
            }).listen(this.runner);
        },

        "should map suite:end to addStats": function () {
            this.runner.emit("suite:end", {});

            assert(this.reporter.addStats.calledOnce);
        },

        "should map context:start to contextStart": function () {
            this.runner.emit("context:start");

            assert(this.reporter.contextStart.calledOnce);
        },

        "should map context:end to contextEnd": function () {
            this.runner.emit("context:end");

            assert(this.reporter.contextEnd.calledOnce);
        },

        "should map test:success to testSuccess": function () {
            this.runner.emit("test:success");

            assert(this.reporter.testSuccess.calledOnce);
        },

        "should map test:error to testError": function () {
            this.runner.emit("test:error");

            assert(this.reporter.testError.calledOnce);
        },

        "should map test:fail to testFailure": function () {
            this.runner.emit("test:failure");

            assert(this.reporter.testFailure.calledOnce);
        },

        "should map test:timeout to testTimeout": function () {
            this.runner.emit("test:timeout");

            assert(this.reporter.testTimeout.calledOnce);
        },

        "should map logger log to log": function () {
            this.runner.console.emit("log");

            assert(this.reporter.log.calledOnce);
        },

        "should map test:deferred to testDeferred": function () {
            this.runner.emit("test:deferred");

            assert(this.reporter.testDeferred.calledOnce);
        }
    }, "should"));
}());
