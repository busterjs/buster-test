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
            return this;
        },

        contextStart: function (context) {
            this.contexts.push(context.name);
            this.root.appendChild(createElement("h2", { text: context.name }));
        },

        contextEnd: function (context) {
            this.contexts.pop();
        },

        testSuccess: function (test) {
            addListItem.call(this, "h3", test, "success");
        },

        testFailure: function (test) {
            var li = addListItem.call(this, "h3", test, "failure");

            if (!test.error) {
                return;
            }

            li.appendChild(createElement("p", {
                innerHTML: test.error.message,
                className: "error-message"
            }));

            var stack = buster.test.extractStack(test.error.stack) || [];

            if (stack.length > 0) {
                stack = stack.slice(1);

                li.appendChild(createElement("ul", {
                    className: "stack",
                    innerHTML: "<li>" + stack.join("</li><li>") + "</li>"
                }));
            }
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
