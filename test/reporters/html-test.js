((typeof define === "function" && define.amd && function (deps, m) {
    define(deps, m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (deps, m) {
           module.exports = m.apply(this, deps.map(function (d) {
               return require(d);
           }));
       })
)([
    "../test-helper",
    "./test-helper",
    "lodash",
    "bane",
    "referee",
    "sinon",
    "../../lib/reporters/html"
], function (helper, rhelper, _, bane, referee, sinon, htmlReporter) {
    "use strict";
    var assert = referee.assert;
    var refute = referee.refute;
    var jsdom = typeof require === "function" && require("jsdom").jsdom;

    function createDocument() {
        if (typeof document != "undefined") { return document; }
        var dom = jsdom("<!DOCTYPE html><html><head></head><body></body></html>");
        return dom.createWindow().document;
    }

    function reporterSetUp(options) {
        options = options || {};
        this.runner = bane.createEventEmitter();
        this.doc = createDocument();
        this.root = options.root || this.doc.createElement("div");

        this.reporter = htmlReporter.create(_.extend({
            document: this.doc,
            root: this.root,
            outputStream: options.outputStream || { write: function () {} }
        }, options)).listen(this.runner);

        this.list = function () {
            return this.root.getElementsByTagName("ul")[0];
        };
    }

    function generateError(message, type) {
        var error = new Error(message);
        error.name = type || "AssertionError";
        try { throw error; } catch (e) { return e; }
    }

    function assertMessage(list, type, message, level) {
        var messages = list.firstChild.getElementsByTagName("ul")[level || 0];

        assert.className(messages, "messages");

        assert.match(messages.firstChild, {
            innerHTML: "Is message",
            className: type || "log"
        });
    }

    helper.testCase("HTMLReporterCreateTest", {
        setUp: function () {
            this.doc = createDocument();
        },

        tearDown: function () {
            var h1s = this.doc.getElementsByTagName("h1");

            for (var i = 0, l = h1s.length; i < l; ++i) {
                if (h1s[i]) {
                    h1s[i].parentNode.removeChild(h1s[i]);
                }
            }
        },

        "adds 'buster-test' class to root element": function () {
            var element = this.doc.createElement("div");

            htmlReporter.create({ document: this.doc, root: element });

            assert.className(element, "buster-test");
        },

        "adds 'buster-test' class to html element if root is body": function () {
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            assert.className(this.doc.documentElement, "buster-test");
        },

        "makes page mobile friendly if logging on body": function () {
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var metas = this.doc.getElementsByTagName("meta"), meta;

            for (var i = 0, l = metas.length; i < l; ++i) {
                if (metas[i].name == "viewport") {
                    meta = metas[i];
                }
            }

            refute.isNull(meta);
            assert.equals(meta.content, "width=device-width, initial-scale=1.0");
        },

        "serves page with right charset if logging on body": function () {
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var metas = this.doc.getElementsByTagName("meta"), meta;

            for (var i = 0, l = metas.length; i < l; ++i) {
                if (metas[i]["http-equiv"]) {
                    meta = metas[i];
                }
            }

            refute.isNull(meta);
            assert.equals(meta["http-equiv"], "Content-Type");
            assert.equals(meta.content, "text/html; charset=utf-8");
        },

        "uses custom CSS file when specified by cssPath option":
        function () {
            if (typeof document == "undefined") return;
            htmlReporter.create({ document: this.doc, root: this.doc.body, cssPath: 'custom.css' });

            var links = this.doc.getElementsByTagName("link");
            var link = links[links.length - 1];

            assert.match(link, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: "custom.css"
            });
        },

        "does not inject CSS file unless detectCssPath option is passed":
        function () {
            if (typeof document == "undefined") return;
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var links = this.doc.getElementsByTagName("link");
            var link = links[links.length - 1];

            refute.equals(link.href, "buster-test.css");
        },

        "injects CSS file from same directory if buster-test.js is not found":
        function () {
            if (typeof document == "undefined") return;
            htmlReporter.create({ document: this.doc, root: this.doc.body, detectCssPath: true });

            var links = this.doc.getElementsByTagName("link");
            var link = links[links.length - 1];

            assert.match(link, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: "buster-test.css"
            });
        },

        "injects CSS file if logging on body": function () {
            if (typeof document == "undefined") return;
            this.doc.body.innerHTML += "<script src=\"/some/path/buster-test.js\"></script>";
            htmlReporter.create({ document: this.doc, root: this.doc.body, detectCssPath: true });

            var links = this.doc.getElementsByTagName("link");
            var link = links[links.length - 1];

            assert.match(link, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: "/some/path/buster-test.css"
            });
        },

        "injects CSS file in style tag if on node": function () {
            if (typeof document != "undefined") return;
            htmlReporter.create({ document: this.doc, root: this.doc.body, detectCssPath: true });

            var styles = this.doc.getElementsByTagName("style");
            var style = styles[styles.length - 1];

            assert.match(style.innerHTML, ".buster-logo {");
        },

        "injects h1 if logging on body": function () {
            this.doc.title = "";
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var h1 = this.doc.getElementsByTagName("h1")[0];

            assert.match(h1, { innerHTML: "Buster.JS Test case" });
        },

        "does not inject h1 if one already exists": function () {
            var h1 = this.doc.createElement("h1");
            h1.innerHTML = "Hey";
            this.doc.body.appendChild(h1);
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var h1s = this.doc.getElementsByTagName("h1");

            assert.equals(h1s.length, 1);
            assert.match(h1s[0], { innerHTML: "Hey" });
        },

        "uses this.doc.title in h1": function () {
            this.doc.title = "Use it";
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var h1 = this.doc.getElementsByTagName("h1")[0];

            assert.match(h1, { innerHTML: "Use it" });
        }
    });

    helper.testCase("HTMLReporterTestsRunningTest", {
        setUp: reporterSetUp,

        "adds context name as h2 when entering top-level context": function () {
            this.runner.emit("context:start", { name: "Some context" });

            assert.match(this.root.firstChild, {
                tagName: "h2",
                innerHTML: "Some context"
            });
        },

        "adds context name as h2 in a nested ul when entering nested context": function () {
            this.runner.emit("context:start", { name: "Some context" });
            this.runner.emit("context:start", { name: "Some other context" });

            var first = this.root.firstChild;
            assert.match(first, { tagName: "h2", innerHTML: "Some context" });
            var ul = first.nextSibling;
            assert.match(ul, { tagName: "ul" });
            assert.equals(ul.children.length, 1);
            var li = ul.firstChild;
            assert.match(li, { tagName: "li" });
            assert.match(li.firstChild, { tagName: "h2", innerHTML: "Some other context" });
        },

        "prints passing test name as list item with success class": function () {
            this.runner.emit("test:success", { name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "success",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "prints passing test name in correct nesting": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "in some state" });
            this.runner.emit("test:success", { name: "should do it" });

            assert.match(this.root.getElementsByTagName("ul")[1], {
                innerHTML: /should do it/
            });
        },

        "does not 'remember' completed contexts": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "in some state" });
            this.runner.emit("context:end", { name: "in some state" });
            this.runner.emit("context:start", { name: "in some other state" });
            this.runner.emit("test:success", { name: "should do it" });

            var testLi = this.list().firstChild // > ul:first > li
                    .nextSibling // current context li
                    .firstChild  // h2(in some other state)
                    .nextSibling // current sub-context ul
                    .firstChild; // test li

            assert.match(testLi, { innerHTML: /should do it/ });
        },

        "prints failed test name as list item with error class": function () {
            this.runner.emit("test:failure", { name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "failure",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "prints test failure with stack trace": function () {
            this.runner.emit("test:failure", {
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

        "prints errored test name as list item with error class": function () {
            this.runner.emit("test:error", { name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "error",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "prints test error with stack trace": function () {
            this.runner.emit("test:error", {
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

        "prints deferred test as list item with deferred class": function () {
            this.runner.emit("test:deferred", { name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "deferred",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "prints timed out test as list item with timeout class": function () {
            this.runner.emit("test:timeout", { name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "timeout",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "prints test timeout with source": function () {
            var err = generateError("Timed out after 250ms", "TimeoutError");
            err.source = "setUp";
            this.runner.emit("test:timeout", {
                name: "should do something",
                error: err
            });

            assert.equals(this.list().firstChild.firstChild.innerHTML,
                          "should do something (setUp timed out)");
        },

        "prints log message for passing test": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.runner.emit("test:success", { name: "should do it" });

            assertMessage(this.list(), "log", "Is message", 1);
        },

        "prints log message for failing test": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.runner.emit("test:failure", { name: "should do it" });

            assertMessage(this.list(), "log", "Is message", 1);
        },

        "prints log message for errored test": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.runner.emit("test:error", { name: "should do it" });

            assertMessage(this.list(), "log", "Is message", 1);
        },

        "prints log message for timed out test": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.runner.emit("test:timeout", { name: "should do it" });

            assertMessage(this.list(), "log", "Is message", 1);
        },

        "does not re-print previous log messages": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.runner.emit("test:timeout", { name: "should do it" });
            this.reporter.log({ level: "warn", message: "Is other message" });
            this.runner.emit("test:timeout", { name: "should go again" });

            var messages = this.list().getElementsByTagName("ul")[1];
            assert.equals(messages.childNodes.length, 1);
        },

        "renders two contexts": function () {
            this.runner.emit("context:start", { name: "Some stuff" });
            this.runner.emit("test:success", { name: "should do it" });
            this.runner.emit("context:end", { name: "Some stuff" });
            this.runner.emit("context:start", { name: "Other stuff" });
            this.runner.emit("test:success", { name: "should do more" });
            this.runner.emit("context:end", { name: "Other stuff" });

            var headings = this.root.getElementsByTagName("h2");

            assert.equals(headings.length, 2);
            assert.tagName(headings[0].nextSibling, "ul");
            assert.tagName(headings[1].nextSibling, "ul");
        }
    });

    if (typeof document == "undefined") {
        helper.testCase("HTMLReporterConsoleTest", {
            setUp: function () {
                this.outputStream = rhelper.writableStream();
                this.assertIO = rhelper.assertIO;
                this.doc = createDocument();

                reporterSetUp.call(this, {
                    document: this.doc,
                    root: this.doc.body,
                    outputStream: this.outputStream,
                    detectCssPath: true
                });
            },

            "renders entire document to output stream": function () {
                this.runner.emit("context:start", { name: "Some stuff" });
                this.runner.emit("test:success", { name: "should do it" });
                this.runner.emit("context:end", { name: "Some stuff" });
                this.runner.emit("context:start", { name: "Other stuff" });
                this.runner.emit("test:success", { name: "should do more" });
                this.runner.emit("context:end", { name: "Other stuff" });
                this.runner.emit("suite:end", {});

                this.assertIO("should do it");
                this.assertIO("<!DOCTYPE html>");
                this.assertIO(".buster-logo");
            }
        });
    }

    helper.testCase("HTMLReporterStatsTest", {
        setUp: function () {
            this.doc = createDocument();
            reporterSetUp.call(this, {
                document: this.doc,
                root: this.doc.body
            });
            this.runner.emit("context:start", { name: "Some context" });
            this.runner.emit("test:success", { name: "should do it" });
            this.runner.emit("context:start", { name: "Some context" });

            this.stats = function () {
                return this.root.getElementsByTagName("div")[0];
            };
        },

        "adds stats element": function () {
            this.runner.emit("suite:end", {});

            assert.className(this.stats(), "stats");
        },

        "adds stats heading": function () {
            this.runner.emit("suite:end", {});

            assert.match(this.stats().firstChild, {
                tagName: "h2",
                innerHTML: "Test failures!"
            });
        },

        "adds stats in list": function () {
            this.runner.emit("suite:end", {
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
        },

        "adds stats directly after h1": function() {
            this.runner.emit("suite:end", {});
            var h1 = this.root.getElementsByTagName("h1")[0];
            assert.equals(this.stats(), h1.nextSibling);
        },

        "haves the success class when all successful": function() {
            sinon.stub(this.reporter, "success").returns(true);
            this.runner.emit("suite:end", {});
            assert.className(this.stats(), "success");
        },

        "haves the failure class when not all successful": function() {
            sinon.stub(this.reporter, "success").returns(false);
            this.runner.emit("suite:end", {});
            assert.className(this.stats(), "failure");
        }
    });
});
