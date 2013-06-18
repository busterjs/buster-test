((typeof define === "function" && define.amd && function (m) {
    define("buster-test/browser-env", ["lodash"], m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
        module.exports = m(require("lodash"));
    }) || function (m) {
    this.buster = this.buster || {};
    this.buster.browserEnv = m(this._);
})(function (_) {
    "use strict";

    function BrowserEnv(rootElement) {
        this.element = rootElement;
        this.originalContent = "";
    }

    BrowserEnv.prototype = {
        create: function (rootElement) {
            return new BrowserEnv(rootElement);
        },

        listen: function (runner) {
            var clear = _.bind(this.clear, this);
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

    return BrowserEnv.prototype;
});
