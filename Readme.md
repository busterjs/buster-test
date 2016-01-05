# buster-test

[![Build status](https://secure.travis-ci.org/busterjs/buster-test.png?branch=master)](http://travis-ci.org/busterjs/buster-test)
[![Build status](https://ci.appveyor.com/api/projects/status/github/busterjs/buster-test?branch=master&svg=true)](https://ci.appveyor.com/project/dominykas/buster-test)

Test contexts, BDD specs, test runner and reporters for Buster.JS.

## Changelog

**0.8.0** (2016-Jan-03)

* BREAKING: updated all deps, incl. a breaking change - `when` to `v3.x`
* BREAKING: added an engine requirement (node LTS) in `package.json` 

**0.7.14** (2015-Nov-23)

* `jsdom` updated to a more recent version (`3.x`)

**0.7.13** (2015-Jun-19)

* Fix for issue [util.print deprecation warnings appearing in reporter output](https://github.com/busterjs/buster/issues/452)

**0.7.12** (2014-Dec-16)

* [mark deferred tests as skipped in xml report](https://github.com/busterjs/buster-test/commit/28b7a61)

**0.7.11** (2014-Nov-15)

* [Fix export global for buster.testRunner](https://github.com/busterjs/buster-test/commit/7a10e17)

**0.7.10** (2014-Nov-02)

* Separate contexts via | in brief reporter [#254 - default mode separate test name from test case name](https://github.com/busterjs/buster/issues/254)

**0.7.9** (2014-Oct-21)

* New option `allowFocusMode`to disable focus rocket [#327 - Command line switch to fail on focus rocket](https://github.com/busterjs/buster/issues/327)

**0.7.8** (2014-Sep-17)

* Fix for issue [#416 - buster-server crash with IE 11 on W7 only if there is two browsers captured](https://github.com/busterjs/buster/issues/416)

**0.7.7** (2014-Jun-06)

* JsDom updated to version ~0.10 for issue [#410 - Buster is modifying the global `Error` object (via old JSDOM)](https://github.com/busterjs/buster/issues/410)

**0.7.6** (2014-May-05)

* [Runtime throttler and pre-event runtime removed](https://github.com/busterjs/buster-test/commit/e7cf870e1868f410b9130591d70fdade2c586b93)
* [uuid is consistently exposed with events now](https://github.com/busterjs/buster-test/commit/81515e8f386e6b9bf2c8dacb977857ac905c77de)
* fix for html2 reporter [Add quotes to `class` property in html2 reporter](https://github.com/busterjs/buster-test/commit/13bacc1a579db266e884722798f10c2adb3fca1a)
* fix for issue [#386 - console.log() outputs twice](https://github.com/busterjs/buster/issues/386)


# Running tests

To run tests in the browser:

    node_modules/buster-util/jstdhtml

Open test/test.html in a browser

You can also run JsTestDriver from the root directory.
