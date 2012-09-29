var assert = require("referee").assert;

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
    }
};
