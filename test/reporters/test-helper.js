var assert = require("referee").assert;
var platform = require("platform");

module.exports = {
    assertIO: function (string) {
        try {
            assert.match(this.outputStream.toString(), string);
        } catch (e) {
            e.message = "\nassert.match failed\n" +
                "===================\nIO:\n" +
                this.outputStream.toString() + "\n" +
                "===================\nPattern:\n" +
                string + "\n-------------------\n";
            throw e;
        }
    },

    writableStream: function () {
        return {
            content: "",
            write: function (str) { this.content += str; },
            toString: function () { return this.content; }
        };
    },

    makeClient: function (runner, ua, uuid) {
        var client = platform.parse(ua);
        client.uuid = uuid;

        return {
            emit: function (event, data) {
                data = data || {};
                data.runtime = client;
                runner.emit(event, data);
            }
        };
    }
};
