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

// For debugging when comparing space padded strings: visualizes all whitespace
function s(str) {
    return str.replace(/\n/g, "\\n").replace(/ /g, "\\s");
}

testCase("AnsiOutLabeledListTest", sinon.testCase({
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

        this.stub(buster.ansiOut, "save", function () { return "S+"; });
        this.stub(buster.ansiOut, "restore", function () { return "R+"; });
        this.stub(buster.ansiOut, "up", function (n) { return n == 0 ? "" : "U" + n + "+"; });
        this.stub(buster.ansiOut, "fwd", function (n) { return n == 0 ? "" : "F" + n + "+"; });
    },

    "should print labels in equally spaced cells": function () {
        var list = this.out.labeledList(this.io, "Internet Explorer", "Firefox");

        assert.equals("Internet Explorer: \nFirefox:           \n", this.io.out);
    },

    "should print dot for first item": function () {
        var list = this.out.labeledList(this.io, "Internet Explorer", "Firefox");
        list.print("Internet Explorer", ".");

        assert.equals(s("Internet Explorer: \nFirefox:           \n" +
                        "S+U2+F19+.R+"), s(this.io.out));
    },

    "should add label": function () {
        var list = this.out.labeledList(this.io);
        list.add("Internet Explorer");
        list.add("Firefox");
        list.print("Internet Explorer", ".");

        assert.equals(s("Internet Explorer: \nFirefox:           \nS+U2+F19+.R+"),
                      s(this.io.out));
    },

    "should refit labels when adding a wider one": function () {
        var list = this.out.labeledList(this.io);
        list.add("Firefox");

        assert.equals("Firefox: \n", this.io.out);

        list.add("Internet Explorer");

        assert.equals("Firefox: \nS+U1+Firefox:           R+Internet Explorer: \n",
                      this.io.out);
    }
}, "should"));
