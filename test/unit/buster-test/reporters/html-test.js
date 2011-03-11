(function () {
    if (typeof document == "undefined") {
        return;
    }

    function reporterSetUp() {
        this.runner = buster.create(buster.eventEmitter);
        this.root = document.createElement("div");

        this.reporter = buster.htmlReporter.create({
            root: this.root
        }).listen(this.runner);

        this.list = function () {
            return this.root.getElementsByTagName("ul")[0];
        };
    }

    function generateError(message, type) {
        var error = new Error(message);
        error.name = type || "AssertionError";
        try { throw error; } catch (e) { return e; }
    }

    testCase("HTMLReporterTestsRunningTest", {
        setUp: reporterSetUp,

        "should add context name as h2 when entering top-level context": function () {
            this.reporter.contextStart({ name: "Some context" });

            buster.assert.match(this.root.firstChild, {
                tagName: "h2", innerHTML: "Some context"
            });
        },

        "should print passing test name as list item with success class": function () {
            this.reporter.testSuccess({ name: "should do something" });

            buster.assert.match(this.list().firstChild, {
                tagName: "li",
                className: "success",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print passing test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testSuccess({ name: "should do it" });

            buster.assert.match(this.list().firstChild, {
                innerHTML: /in some state should do it/
            });
        },

        "should not 'remember' completed contexts": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.contextEnd({ name: "in some state" });
            this.reporter.contextStart({ name: "in some other state" });
            this.reporter.testSuccess({ name: "should do it" });

            buster.assert.match(this.list().firstChild, {
                innerHTML: /in some other state should do it/
            });
        },

        "should print failed test name as list item with error class": function () {
            this.reporter.testFailure({ name: "should do something" });

            buster.assert.match(this.list().firstChild, {
                tagName: "li",
                className: "failure",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print test failure with stack trace": function () {
            this.reporter.testFailure({
                name: "should do something",
                error: generateError("Expected a to be equal to b")
            });

            var error = this.list().firstChild.getElementsByTagName("p")[0];
            var stack = this.list().firstChild.getElementsByTagName("ul")[0];

            buster.assert.match(error, {
                innerHTML: "Expected a to be equal to b",
                className: "error-message"
            });

            buster.assert.equals(stack.className, "stack");
            buster.assert.match(stack.firstChild, { innerHTML: /html-test.js/ });
        },

        // "should print failed test name with full contextual name": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.testFailure({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "  ✖ in some state should do it\n");
        // },

        // "should print errored test name indented with cross": function () {
        //     this.reporter.testError({ name: "should do something" });

        //     buster.assert.match(this.io.toString(), "  ✖ should do something\n");
        // },

        // "should print test error with stack trace": function () {
        //     this.reporter.testFailure({
        //         name: "should do something",
        //         error: generateError("Oh shizzle!", "SomeError")
        //     });

        //     buster.assert.match(this.io.toString(), "    SomeError: Oh shizzle!\n");
        //     buster.assert.match(this.io.toString(), "      at Object");
        // },

        // "should print failed test name with full contextual name": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.testError({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "  ✖ in some state should do it\n");
        // },

        // "should print deferred test with indented dash": function () {
        //     this.reporter.testDeferred({ name: "should do something" });

        //     buster.assert.match(this.io.toString(), "  - should do something\n");
        // },

        // "should print deferred test name with full contextual name": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.testDeferred({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "  - in some state should do it\n");
        // },

        // "should print timed out test with indented ellipsis": function () {
        //     this.reporter.testTimeout({ name: "should do something" });

        //     buster.assert.match(this.io.toString(), "  … should do something\n");
        // },

        // "should print timed out test name with full contextual name": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.testTimeout({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "  … in some state should do it\n");
        // },

        // "should print log message for passing test": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.log({ level: "log", message: "Is message" });
        //     this.reporter.testSuccess({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "do it\n    [LOG] Is message\n");
        // },

        // "should print log message for failing test": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.log({ level: "log", message: "Is message" });
        //     this.reporter.testFailure({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "do it\n    [LOG] Is message\n");
        // },

        // "should print log message for errored test": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.log({ level: "log", message: "Is message" });
        //     this.reporter.testError({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "do it\n    [LOG] Is message\n");
        // },

        // "should print log message for timed out test": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.log({ level: "log", message: "Is message" });
        //     this.reporter.testTimeout({ name: "should do it" });

        //     buster.assert.match(this.io.toString(), "do it\n    [LOG] Is message\n");
        // },

        // "should not re-print previous log messages": function () {
        //     this.reporter.contextStart({ name: "Some stuff" });
        //     this.reporter.contextStart({ name: "in some state" });
        //     this.reporter.log({ level: "log", message: "Is message" });
        //     this.reporter.testTimeout({ name: "should do it" });
        //     this.reporter.log({ level: "warn", message: "Is other message" });
        //     this.reporter.testTimeout({ name: "should go again" });

        //     buster.assert.match(this.io.toString(), "go again\n    [WARN] Is other");
        // }
    });

    // testCase("HTMLReporterEventMappingTest", sinon.testCase({
    //     setUp: function () {
    //         this.stub(buster.htmlReporter, "contextStart");
    //         this.stub(buster.htmlReporter, "contextEnd");
    //         this.stub(buster.htmlReporter, "testSuccess");
    //         this.stub(buster.htmlReporter, "testFailure");
    //         this.stub(buster.htmlReporter, "testError");
    //         this.stub(buster.htmlReporter, "testTimeout");
    //         this.stub(buster.htmlReporter, "testDeferred");
    //         this.stub(buster.htmlReporter, "log");
    //         this.stub(buster.htmlReporter, "printStats");

    //         this.runner = buster.create(buster.eventEmitter);
    //         this.runner.console = buster.create(buster.eventEmitter);
    //         this.reporter = buster.htmlReporter.create().listen(this.runner);
    //     },

    //     "should map suite:end to printStats": function () {
    //         this.runner.emit("suite:end", {});

    //         buster.assert(this.reporter.printStats.calledOnce);
    //     },

    //     "should map context:start to contextStart": function () {
    //         this.runner.emit("context:start");

    //         buster.assert(this.reporter.contextStart.calledOnce);
    //     },

    //     "should map context:end to contextEnd": function () {
    //         this.runner.emit("context:end");

    //         buster.assert(this.reporter.contextEnd.calledOnce);
    //     },

    //     "should map test:success to testSuccess": function () {
    //         this.runner.emit("test:success");

    //         buster.assert(this.reporter.testSuccess.calledOnce);
    //     },

    //     "should map test:error to testError": function () {
    //         this.runner.emit("test:error");

    //         buster.assert(this.reporter.testError.calledOnce);
    //     },

    //     "should map test:fail to testFailure": function () {
    //         this.runner.emit("test:failure");

    //         buster.assert(this.reporter.testFailure.calledOnce);
    //     },

    //     "should map test:timeout to testTimeout": function () {
    //         this.runner.emit("test:timeout");

    //         buster.assert(this.reporter.testTimeout.calledOnce);
    //     },

    //     "should map logger log to log": function () {
    //         this.runner.console.emit("log");

    //         buster.assert(this.reporter.log.calledOnce);
    //     },

    //     "should map test:deferred to testDeferred": function () {
    //         this.runner.emit("test:deferred");

    //         buster.assert(this.reporter.testDeferred.calledOnce);
    //     }
    // }, "should"));
}());
