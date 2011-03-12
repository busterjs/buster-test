buster.htmlReporter = (function () {
    function createElement(tagName, properties) {
        var el = document.createElement(tagName), value;

        for (var prop in properties) {
            value = properties[prop];

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
        var name = this.contexts.slice(1).join(" ") + " " + test.name;

        var item = createElement("li", {
            className: className,
            text: prefix + name.replace(/^\s+|\s+$/, "") + suffix
        });

        this.list().appendChild(item);
        return item;
    }

    function addException(li, error) {
        if (!error) {
            return;
        }

        var name = error.name == "AssertionError" ? "" : error.name + ": ";

        li.appendChild(createElement("p", {
            innerHTML: name + error.message,
            className: "error-message"
        }));

        var stack = buster.test.extractStack(error.stack) || [];

        if (stack.length > 0) {
            stack = stack.slice(1);

            li.appendChild(createElement("ul", {
                className: "stack",
                innerHTML: "<li>" + stack.join("</li><li>") + "</li>"
            }));
        }
    }

    var pluralize = buster.test.pluralize;

    return {
        create: function (opt) {
            if (!opt || !opt.root) {
                throw new TypeError("Need root element");
            }

            var reporter = buster.create(this);
            reporter.root = opt.root;
            reporter.contexts = [];

            return reporter;
        },

        listen: function (runner) {
            runner.bind(this, {
                "context:start": "contextStart", "context:end": "contextEnd",
                "test:success": "testSuccess", "test:failure": "testFailure",
                "test:error": "testError", "test:timeout": "testTimeout",
                "test:deferred": "testDeferred", "suite:end": "addStats"
            });

            if (runner.console) {
                runner.console.bind(this, "log");
            }

            return this;
        },

        contextStart: function (context) {
            this.startedAt = new Date();
            this.contexts.push(context.name);
            this.root.appendChild(createElement("h2", { text: context.name }));
        },

        contextEnd: function (context) {
            this.contexts.pop();
            this._list = null;
        },

        testSuccess: function (test) {
            var li = addListItem.call(this, "h3", test, "success");
            this.addMessages(li);
        },

        testFailure: function (test) {
            var li = addListItem.call(this, "h3", test, "failure");
            this.addMessages(li);
            addException(li, test.error);
        },

        testError: function (test) {
            var li = addListItem.call(this, "h3", test, "error");
            this.addMessages(li);
            addException(li, test.error);
        },

        testDeferred: function (test) {
            var li = addListItem.call(this, "h3", test, "deferred");
        },

        testTimeout: function (test) {
            var li = addListItem.call(this, "h3", test, "timeout");
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

            li.appendChild(createElement("ul", {
                className: "messages",
                innerHTML: html
            }));

            this.messages = [];
        },

        success: function (stats) {
            return stats.failures == 0 && stats.errors == 0 &&
                stats.tests > 0 && stats.assertions > 0;
        },

        addStats: function (stats) {
            var diff = (new Date() - this.startedAt) / 1000;
            var statsEl = createElement("div", { className: "stats" });
            this.root.appendChild(statsEl);

            statsEl.appendChild(createElement("h2", {
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

            statsEl.appendChild(createElement("ul", { innerHTML: html }));
            statsEl.appendChild(createElement("p", {
                className: "time",
                innerHTML: "Finished in " + diff + "s"
            }));
        },

        list: function () {
            if (!this._list) {
                this._list = createElement("ul", { className: "test-results" });
                this.root.appendChild(this._list);
            }

            return this._list;
        }
    };
}());
