((typeof define === "function" && define.amd && function (m) {
    define(["lodash"], m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
        module.exports = m(require("lodash"));
    }) || function (m) {
    this.buster = this.buster || {};
    this.buster.browserEnv = m(this._);
})(function (_) {
    "use strict";

    return {
        create: function (rootElement) {
            return buster.extend(buster.create(this), {
                element: rootElement,
                originalContent: ""
            });
        },

        listen: function (runner) {
            var clear = _.bind(this, "clear");
            runner.on("suite:start", _.bind(function () {
                this.originalContent = this.element.innerHTML;
            }, this));
            runner.on("test:success", clear);
            runner.on("test:failure", clear);
            runner.on("test:error", clear);
            runner.on("test:timeout", clear);
        },

        clear: function () {
            this.element.innerHTML = this.originalContent;
        }
    };
});
