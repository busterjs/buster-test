((typeof define === "function" && define.amd && function (m) {
    define("buster-test/reporters/html", ["buster-test/reporters/runtime-throttler"], m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
           try {
               var jsdom = require("jsdom").jsdom;
           } catch (e) {
               // Is handled when someone actually tries using the HTML reporter
               // on node without jsdom
           }

           module.exports = m(require("./runtime-throttler"), jsdom, true);
    }) || function (m) {
        this.buster = this.buster || {};
        this.buster.reporters = this.buster.reporters || {};
        this.buster.reporters.html = m(this.buster.reporters.runtimeThrottler);
    }
)(function (runtimeThrottler, jsdom, isNodeJS) {
    "use strict";

    function filterStack(reporter, stack) {
        if (!stack) { return []; }
        if (reporter.stackFilter) {
            return reporter.stackFilter.filter(stack);
        }
        return stack.split("\n");
    }

    function getDoc(options) {
        return options && options.document ||
            (typeof document != "undefined" ? document : createDocument());
    }

    function addCSS(head, cssPath) {
        if (isNodeJS) {
            var fs = require("fs");
            var path = require("path");

            head.appendChild(el(head.ownerDocument, "style", {
                type: "text/css",
                innerHTML: fs.readFileSync(
                    path.join(__dirname, "../../resources/buster-test.css")
                )
            }));
        } else {
            head.appendChild(el(document, "link", {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: cssPath
            }));
        }
    }

    function insertTitle(doc, body, title) {
        if (doc.getElementsByTagName("h1").length == 0) {
            body.insertBefore(el(doc, "h1", {
                innerHTML: "<span class=\"title\">" + title + "</span>"
            }), body.firstChild);
        }
    }

    function insertLogo(h1) {
        h1.innerHTML = "<span class=\"buster-logo\"></span>" + h1.innerHTML;
    }

    function createDocument() {
        if (!jsdom) {
            util.puts("Unable to load jsdom, html reporter will not work " +
                      "for node runs. Spectacular fail coming up.");
        }
        var dom = jsdom("<!DOCTYPE html><html><head></head><body></body></html>");
        return dom.createWindow().document;
    }

    function pluralize(num, phrase) {
        num = typeof num == "undefined" ? 0 : num;
        return num + " " + (num == 1 ? phrase : phrase + "s");
    }

    function el(doc, tagName, properties) {
        var el = doc.createElement(tagName), value;

        for (var prop in properties) {
            value = properties[prop];

            if (prop == "http-equiv") {
                el.setAttribute(prop, value);
            }

            if (prop == "text") {
                prop = "innerHTML";
            }

            el[prop] = value;
        }

        return el;
    }

    function addListItem(tagName, test, className) {
        var prefix = tagName ? "<" + tagName + ">" : "";
        var suffix = tagName ? "</" + tagName + ">" : "";

        var item = el(this.doc, "li", {
            className: className,
            text: prefix + test.name + suffix
        });

        this.list().appendChild(item);
        return item;
    }

    function addException(reporter, li, error) {
        if (!error) {
            return;
        }

        var name = error.name == "AssertionError" ? "" : error.name + ": ";

        li.appendChild(el(li.ownerDocument || document, "p", {
            innerHTML: name + error.message,
            className: "error-message"
        }));

        var stack = filterStack(reporter, error.stack);

        if (stack.length > 0) {
            if (stack[0].indexOf(error.message) >= 0) {
                stack.shift();
            }

            li.appendChild(el(li.ownerDocument || document, "ul", {
                className: "stack",
                innerHTML: "<li>" + stack.join("</li><li>") + "</li>"
            }));
        }
    }

    function busterTestPath(document) {
        var scripts = document.getElementsByTagName("script");

        for (var i = 0, l = scripts.length; i < l; ++i) {
            if (/buster-test\.js$/.test(scripts[i].src)) {
                return scripts[i].src.replace("buster-test.js", "");
            }
        }

        return "";
    }

    function getOutputStream(opt) {
        if (opt.outputStream) { return opt.outputStream; }
        if (isNodeJS) {
            var util = require("util");
            return {
                write: function (bytes) { util.print(bytes); }
            };
        }
    }

    function HtmlReporter(opt) {
        opt = opt || {};
        this._listStack = [];
        this.doc = getDoc(opt);
        var cssPath = opt.cssPath;
        if (!cssPath && opt.detectCssPath !== false) {
            cssPath = busterTestPath(this.doc) + "buster-test.css";
        }
        this.setRoot(opt.root || this.doc.body, cssPath);
        this.out = getOutputStream(opt);
        this.stackFilter = opt.stackFilter;
        this.startTimer();
    }

    HtmlReporter.prototype = {
        create: function (opt) {
            return new HtmlReporter(opt);
        },

        setRoot: function (root, cssPath) {
            this.root = root;
            this.root.className += " buster-test";
            var body = this.doc.body;

            if (this.root == body) {
                var head = this.doc.getElementsByTagName("head")[0];
                head.parentNode.className += " buster-test";

                head.appendChild(el(this.doc, "meta", {
                    "name": "viewport",
                    "content": "width=device-width, initial-scale=1.0"
                }));

                head.appendChild(el(this.doc, "meta", {
                    "http-equiv": "Content-Type",
                    "content": "text/html; charset=utf-8"
                }));

                if (cssPath) addCSS(head, cssPath);
                insertTitle(this.doc, body, this.doc.title || "Buster.JS Test case");
                insertLogo(this.doc.getElementsByTagName("h1")[0]);
            }
        },

        listen: function (runner) {
            var proxy = runtimeThrottler.create();
            proxy.listen(runner).bind(this);
            if (runner.console) {
                runner.console.on("log", this.log, this);
            }
            return this;
        },

        "context:start": function (context) {
            var container = this.root;
            if (this._list) {
                container = el(this.doc, "li");
                this._list.appendChild(container);
            }
            container.appendChild(el(this.doc, "h2", { text: context.name }));
            this._list = el(this.doc, "ul");
            container.appendChild(this._list);
            this._listStack.unshift(this._list);
        },

        "context:end": function (context) {
            this._listStack.shift();
            this._list = this._listStack[0];
        },

        "test:success": function (test) {
            var li = addListItem.call(this, "h3", test, "success");
            this.addMessages(li);
        },

        "test:failure": function (test) {
            var li = addListItem.call(this, "h3", test, "failure");
            this.addMessages(li);
            addException(this, li, test.error);
        },

        "test:error": function (test) {
            var li = addListItem.call(this, "h3", test, "error");
            this.addMessages(li);
            addException(this, li, test.error);
        },

        "test:deferred": function (test) {
            var li = addListItem.call(this, "h3", test, "deferred");
        },

        "test:timeout": function (test) {
            var li = addListItem.call(this, "h3", test, "timeout");
            var source = test.error && test.error.source;
            if (source) {
                li.firstChild.innerHTML += " (" + source + " timed out)";
            }
            this.addMessages(li);
        },

        log: function (msg) {
            this.messages = this.messages || [];
            this.messages.push(msg);
        },

        addMessages: function (li) {
            var messages = this.messages || [];
            var html = "";

            if (messages.length == 0) {
                return;
            }

            for (var i = 0, l = messages.length; i < l; ++i) {
                html += "<li class=\"" + messages[i].level + "\">";
                html += messages[i].message + "</li>";
            }

            li.appendChild(el(this.doc, "ul", {
                className: "messages",
                innerHTML: html
            }));

            this.messages = [];
        },

        success: function (stats) {
            return stats.failures == 0 && stats.errors == 0 &&
                stats.tests > 0 && stats.assertions > 0;
        },

        startTimer: function () {
            this.startedAt = new Date();
        },

        "suite:end": function (stats) {
            var diff = (new Date() - this.startedAt) / 1000;

            var className = "stats " + (this.success(stats) ? "success" : "failure");
            var statsEl = el(this.doc, "div", { className: className });

            var h1 = this.doc.getElementsByTagName("h1")[0];
            this.root.insertBefore(statsEl, h1.nextSibling);

            statsEl.appendChild(el(this.doc, "h2", {
                text: this.success(stats) ? "Tests OK" : "Test failures!"
            }));

            var html = "";
            html += "<li>" + pluralize(stats.contexts, "test case") + "</li>";
            html += "<li>" + pluralize(stats.tests, "test") + "</li>";
            html += "<li>" + pluralize(stats.assertions, "assertion") + "</li>";
            html += "<li>" + pluralize(stats.failures, "failure") + "</li>";
            html += "<li>" + pluralize(stats.errors, "error") + "</li>";
            html += "<li>" + pluralize(stats.timeouts, "timeout") + "</li>";

            if (stats.deferred > 0) {
                html += "<li>" + stats.deferred + " deferred</li>";
            }

            statsEl.appendChild(el(this.doc, "ul", { innerHTML: html }));
            statsEl.appendChild(el(this.doc, "p", {
                className: "time",
                innerHTML: "Finished in " + diff + "s"
            }));

            this.writeIO();
        },

        list: function () {
            if (!this._list) {
                this._list = el(this.doc, "ul", { className: "test-results" });
                this._listStack.unshift(this._list);
                this.root.appendChild(this._list);
            }

            return this._list;
        },

        writeIO: function () {
            if (!this.out) { return; }
            this.out.write(this.doc.doctype.toString());
            this.out.write(this.doc.innerHTML);
        }
    };

    return HtmlReporter.prototype;
});
