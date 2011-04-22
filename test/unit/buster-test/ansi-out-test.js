if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        ansiOut: require("../../../lib/buster-test/ansi-out")
    };

    var assert = buster.assert;
}

testCase("AnsiOutLabeledListTest", {
    setUp: function () {
        this.io = {
            out: "",
            print: function (str) {
                this.out += str;
            },

            puts: function (str) {
                this.out += str + "\n";
            }
        };

        this.out = buster.ansiOut.create();
    },

    "should print labels in equally spaced cells": function () {
        var list = this.out.labeledList(this.io, "Internet Explorer", "Firefox");

        assert.equals("Internet Explorer: \nFirefox:           \n", this.io.out);
    },

    "should print dot for first item": function () {
        var list = this.out.labeledList(this.io, "Internet Explorer", "Firefox");
        list.print("Internet Explorer", ".");

        assert.equals("Internet Explorer: \nFirefox:           \n" +
                      "\033[s\033[2A\033[19C.\033[u", this.io.out);
    }
});
