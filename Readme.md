# buster-test

[![Build status](https://secure.travis-ci.org/busterjs/buster-test.png?branch=master)](http://travis-ci.org/busterjs/buster-test)

Test contexts, BDD specs, test runner and reporters for Buster.JS.


## Changelog

**0.7.8** (17.09.2014)

* Fix for issue [#416 - buster-server crash with IE 11 on W7 only if there is two browsers captured](https://github.com/busterjs/buster/issues/416)

**0.7.7** (06.06.2014)

* JsDom updated to version ~0.10 for issue [#410 - Buster is modifying the global `Error` object (via old JSDOM)](https://github.com/busterjs/buster/issues/410)

**0.7.6** (05.05.2014)

* [Runtime throttler and pre-event runtime removed](https://github.com/busterjs/buster-test/commit/e7cf870e1868f410b9130591d70fdade2c586b93)
* [uuid is consistently exposed with events now](https://github.com/busterjs/buster-test/commit/81515e8f386e6b9bf2c8dacb977857ac905c77de)
* fix for html2 reporter [Add quotes to `class` property in html2 reporter](https://github.com/busterjs/buster-test/commit/13bacc1a579db266e884722798f10c2adb3fca1a)
* fix for issue [#386 - console.log() outputs twice](https://github.com/busterjs/buster/issues/386)


# Running tests

To run tests in the browser:

    node_modules/buster-util/jstdhtml

Open test/test.html in a browser

You can also run JsTestDriver from the root directory.
