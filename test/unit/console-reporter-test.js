if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        util: require("buster-util"),
        eventEmitter: require("buster-event-emitter"),
        consoleReporter: require("buster-test/console-reporter")
    };
}

testCase("ConsoleReporterTest", {
    setUp: function () {
        this.io = {
            content: "",
            puts: function (str) { this.print(str + "\n"); },
            print: function (str) { this.content += str; },
            toString: function () { return this.content }
        };

        this.runner = buster.util.create(buster.eventEmitter);
    },

    "should print dot when test passes": function () {
        var reporter = buster.consoleReporter.create(this.runner, this.io);

        this.runner.emit("test:success", { name: "Stuff" });

        buster.assert.equals(".", this.io.toString());
    },

    "should print capital E when test errors": function () {
        var reporter = buster.consoleReporter.create(this.runner, this.io);

        this.runner.emit("test:error", { name: "Stuff" });

        buster.assert.equals("E", this.io.toString());
    },

    "should print capital F when test fails": function () {
        var reporter = buster.consoleReporter.create(this.runner, this.io);

        this.runner.emit("test:fail", { name: "Stuff" });

        buster.assert.equals("F", this.io.toString());
    }
});
