module.exports = {
    paths: [
        "lib/*.js",
        "test/*.js"
    ],
    linterOptions: {
        node: true,
        browser: true,
        plusplus: true,
        sloppy: true,
        vars: true,
        forin: true,
        predef: [
            "define",
            "assert",
            "refute",
            "buster",
            "describe",
            "before",
            "after",
            "it"
        ]
    }
};
