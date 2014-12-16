# buster-test

[![Build status](https://secure.travis-ci.org/busterjs/buster-test.png?branch=master)](http://travis-ci.org/busterjs/buster-test)

Test contexts, BDD specs, test runner and reporters for Buster.JS.


## Changelog

**0.7.12** (16.12.2014)

* [mark deferred tests as skipped in xml report](https://github.com/busterjs/buster-test/commit/28b7a61)

**0.7.11** (15.11.2014)

* [Fix export global for buster.testRunner](https://github.com/busterjs/buster-test/commit/7a10e17)

**0.7.10** (02.11.2014)

* Separate contexts via | in brief reporter [#254 - default mode separate test name from test case name](https://github.com/busterjs/buster/issues/254)

**0.7.9** (21.10.2014)

* New option `allowFocusMode`to disable focus rocket [#327 - Command line switch to fail on focus rocket](https://github.com/busterjs/buster/issues/327)

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
