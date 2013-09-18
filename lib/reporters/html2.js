((typeof define === "function" && define.amd && function (m) {
    define("buster-test/reporters/html2", ["buster-test/reporters/runtime-throttler"], m);
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
        this.buster.reporters.html2 = m(this.buster.reporters.runtimeThrottler);
    }
)(function (runtimeThrottler, jsdom, isNodeJS) {
    "use strict";

    function el(doc, tagName, properties) {
        var el = doc.createElement(tagName), value;

        for (var prop in properties) {
            value = properties[prop];

            if (prop === "http-equiv") {
                el.setAttribute(prop, value);
            }

            if (prop === "text") {
                prop = "innerHTML";
            }

            el[prop] = value;
        }

        return el;
    }

    function filterStack(reporter, stack) {
        if (!stack) { return []; }
        if (reporter.stackFilter) {
            return reporter.stackFilter.filter(stack);
        }
        return stack.split("\n");
    }

    function createDocument() {
        if (!jsdom) {
            process.stdout.write("Unable to load jsdom, html reporter will not work " +
                                 "for node runs. Spectacular fail coming up\n");
        }
        var dom = jsdom("<!DOCTYPE html><html><head></head><body></body></html>");
        return dom.createWindow().document;
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

    function pluralize(num, phrase) {
        num = typeof num == "undefined" ? 0 : num;
        return num + " " + (num == 1 ? phrase : phrase + "s");
    }

    function initializeDoc(doc, title) {
        doc.innerHTML += "<div class=\"navbar navbar-inverse\">" +
            "  <div class=\"navbar-inner\">" +
            "    <div class=\"container-narrow\">" +
            "      <span class=\"buster-logo\">" +
            "    </div>" +
            "  </div>" +
            "</div>" +
            "<div class=\"container-narrow\">" +
            "  <h1>" + title + "</h1>" +
            "  <div class=\"btn-group\">" +
            "  </div>" +
            "  <p class=\"muted pull-right\"></p>" +
            "  <br><br>" +
            "  <p class=\"muted\"></p>" +
            "  <div class=\"progress progress-striped active\">" +
            "    <div class=\"bar bar-info\" style=\"width: 0;\"></div>" +
            "    <div class=\"bar bar-success\" style=\"width: 0;\"></div>" +
            "    <div class=\"bar bar-warning\" style=\"width: 0;\"></div>" +
            "    <div class=\"bar bar-danger\" style=\"width: 0;\"></div>" +
            "  </div>" +
            "  <div class=\"test-results\"></div>" +
            "</div>";

        return {
            stats: doc.querySelectorAll(".btn-group")[0],
            progressBar: {
                container: doc.querySelectorAll(".progress")[0],
                pending: doc.querySelectorAll(".bar-info")[0],
                success: doc.querySelectorAll(".bar-success")[0],
                error: doc.querySelectorAll(".bar-warning")[0],
                failure: doc.querySelectorAll(".bar-danger")[0]
            },
            runContainer: doc.querySelectorAll(".test-results")[0],
            timing: doc.querySelectorAll(".muted")[0],
            randomSeed: doc.querySelectorAll(".muted")[1]
        };
    }

    function addListItem(reporter, test, prefix) {
        var row = el(reporter.doc, "tr");

        row.appendChild(el(reporter.doc, "td", {
            text: prefix + " " + test.name
        }));

        reporter.list.appendChild(row);
        return row;
    }

    function addException(reporter, row, error) {
        if (!error) {
            return;
        }

        var name = error.name == "AssertionError" ? "" : error.name + ": ";
        var cell = row.getElementsByTagName("td")[0];

        var pre = cell.appendChild(el(reporter.doc, "pre", {
            innerHTML: "<strong class=\"text-error\">" + name + error.message + "</strong>"
        }));

        var stack = filterStack(reporter, error.stack);

        if (stack.length > 0) {
            if (stack[0].indexOf(error.message) >= 0) {
                stack.shift();
            }

            pre.innerHTML += "\n    " + stack.join("\n    ");
        }
    }

    function redistributeProgressBars(bars) {
        var weights = [
            parseFloat(bars.pending.style.width),
            parseFloat(bars.success.style.width),
            parseFloat(bars.error.style.width),
            parseFloat(bars.failure.style.width)
        ];

        var sum = weights[0] + weights[1] + weights[2] + weights[3];

        if (Math.floor(sum) === 100) {
            return;
        }

        bars.pending.style.width = (weights[0]*100/sum) + "%";
        bars.success.style.width = (weights[1]*100/sum) + "%";
        bars.error.style.width = (weights[2]*100/sum) + "%";
        bars.failure.style.width = (weights[3]*100/sum) + "%";
    }

    function resourcePath(document, file, suffix) {
        var scripts = document.getElementsByTagName("script");

        for (var i = 0, l = scripts.length; i < l; ++i) {
            if (/buster-.*\.js$/.test(scripts[i].src)) {
                return scripts[i].src.replace(/buster-(.*)\.js/, file + "$1." + suffix);
            }
        }

        return "";
    }

    function getOutputStream(opt) {
        if (opt.outputStream) { return opt.outputStream; }
        if (isNodeJS) {
            return process.stdout;
        }
    }

    function HtmlReporter(opt) {
        opt = opt || {};
        this._listStack = [];
        this.doc = getDoc(opt);
        var cssPath = opt.cssPath;
        if (!cssPath && opt.detectCssPath !== false) {
            cssPath = resourcePath(this.doc, "buster-", "css");
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
            root.className += " buster-test";

            if (root == this.doc.body) {
                var head = this.doc.getElementsByTagName("head")[0];
                head.parentNode.className += " buster-test";

                head.appendChild(el(this.doc, "meta", {
                    "name": "viewport",
                    "content": "width=device-width, initial-scale=1.0"
                }));

                if (cssPath) {
                    addCSS(head, cssPath);
                }
            }

            var title = this.doc.title || "Buster.JS Test case";
            this.elements = initializeDoc(root, title);
        },

        updateProgress: function (kind) {
            var bar = this.elements.progressBar[kind];
            var width = parseFloat(bar.style.width);
            bar.style.width = (width + this.progressIncrement) + "%";
        },

        listen: function (runner) {
            var proxy = runtimeThrottler.create();
            proxy.listen(runner).bind(this);
            if (runner.console) {
                runner.console.on("log", this.log, this);
            }
            return this;
        },

        "suite:configuration": function (config) {
            this.progressIncrement = 100 / config.tests;
            if (config.randomSeed) {
                this.elements.randomSeed.innerText = "Random seed: " + config.randomSeed;
            }
        },

        "context:start": function (context) {
            var container = this.elements.runContainer;
            container.appendChild(el(this.doc, "h2", { text: context.name }));
            this.list = el(this.doc, "table", { class: "table table-striped" });
            container.appendChild(this.list);
        },

        "test:success": function (test) {
            this.updateProgress("success");
            var row = addListItem(this, test, "<strong class=\"text-success\">✓</strong>");
            this.addMessages(row);
        },

        "test:failure": function (test) {
            this.updateProgress("failure");
            var row = addListItem(this, test, "<strong class=\"text-error\">✖</strong>");
            this.addMessages(row);
            addException(this, row, test.error);
        },

        "test:error": function (test) {
            this.updateProgress("error");
            var row = addListItem(this, test, "<strong class=\"text-warning\">✖</strong>");
            this.addMessages(row);
            addException(this, row, test.error);
        },

        "test:deferred": function (test) {
            this.updateProgress("pending");
            var row = addListItem(this, test, "<strong class=\"text-info\">✎</strong>");
        },

        "test:timeout": function (test) {
            this.updateProgress("failure");
            var row = addListItem(this, test, "<strong class=\"text-error\">∞</strong>");
            var source = test.error && test.error.source;
            if (source) {
                row.firstChild.innerHTML += " (" + source + " timed out)";
            }
            this.addMessages(row);
        },

        log: function (msg) {
            this.messages = this.messages || [];
            this.messages.push(msg);
        },

        addMessages: function (row) {
            var messages = this.messages || [];
            var html = "";

            if (messages.length == 0) {
                return;
            }

            for (var i = 0, l = messages.length; i < l; ++i) {
                html += "<li class=\"" + messages[i].level + "\">";
                html += messages[i].message + "</li>";
            }

            row.firstChild.appendChild(el(this.doc, "ul", {
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
            this.elements.progressBar.container.className = "progress";
            redistributeProgressBars(this.elements.progressBar);
            this.elements.timing.innerHTML = "Finished in " + diff + "s";

            this.elements.stats.appendChild(el(this.doc, "button", {
                className: "btn",
                text: pluralize(stats.contexts, "test case")
            }));

            this.elements.stats.appendChild(el(this.doc, "button", {
                className: "btn",
                text: pluralize(stats.tests, "test")
            }));

            this.elements.stats.appendChild(el(this.doc, "button", {
                className: "btn",
                text: pluralize(stats.assertions, "assertion")
            }));

            this.elements.stats.appendChild(el(this.doc, "button", {
                className: "btn",
                text: pluralize(stats.failures, "failure")
            }));

            this.elements.stats.appendChild(el(this.doc, "button", {
                className: "btn",
                text: pluralize(stats.errors, "error")
            }));

            this.elements.stats.appendChild(el(this.doc, "button", {
                className: "btn",
                text: pluralize(stats.timeouts, "timeout")
            }));

            if (stats.deferred > 0) {
                this.elements.stats.appendChild(el(this.doc, "button", {
                    className: "btn",
                    text: pluralize(stats.deferred, "deferred")
                }));
            }

            this.writeIO();
        },

        writeIO: function () {
            if (!this.out) { return; }
            this.out.write(this.doc.doctype.toString());
            this.out.write(this.doc.innerHTML);
        }
    };

    return HtmlReporter.prototype;
});
