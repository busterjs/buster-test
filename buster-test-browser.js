var buster = (function (buster) {
    var toString = Object.prototype.toString;
    var div = typeof document != "undefined" && document.createElement("div");

    function extend(target) {
        if (!target) {
            return;
        }

        for (var i = 1, l = arguments.length, prop; i < l; ++i) {
            for (prop in arguments[i]) {
                target[prop] = arguments[i][prop];
            }
        }

        return target;
    }

    return extend(buster, {
        isNode: function (obj) {
            if (!div) {
                return false;
            }

            try {
                obj.appendChild(div);
                obj.removeChild(div);
            } catch (e) {
                return false;
            }

            return true;
        },

        isElement: function (obj) {
            return obj && this.isNode(obj) && obj.nodeType === 1;
        },

        bind: function (obj, methOrProp) {
            var method = typeof methOrProp == "string" ? obj[methOrProp] : methOrProp;
            var args = Array.prototype.slice.call(arguments, 2);

            return function () {
                var allArgs = args.concat(Array.prototype.slice.call(arguments));
                return method.apply(obj, allArgs);
            };
        },

        isArguments: function (obj) {
            if (typeof obj != "object" || typeof obj.length != "number" ||
                toString.call(obj) == "[object Array]") {
                return false;
            }

            if (typeof obj.callee == "function") {
                return true;
            }

            try {
                obj[obj.length] = 6;
                delete obj[obj.length];
            } catch (e) {
                return true;
            }

            return false;
        },

        keys: (function () {
            if (Object.keys) {
                return function (obj) {
                    return Object.keys(obj)
                };
            }

            return function (object) {
                var keys = [];

                for (var prop in object) {
                    if (Object.prototype.hasOwnProperty.call(object, prop)) {
                        keys.push(prop);
                    }
                }

                return keys;
            }
        }()),

        create: (function () {
            function F() {}

            return function create(object) {
                F.prototype = object;
                return new F();
            }
        }()),

        extend: extend,

        customError: function (name, superError) {
            superError = superError || Error;

            var error = function (msg) {
                this.message = msg;
            };

            error.prototype = this.create(superError.prototype);
            error.prototype.type = name;

            return error;
        },

        nextTick: function (callback) {
            if (typeof process != "undefined" && process.nextTick) {
                return process.nextTick(callback);
            }

            setTimeout(callback, 0);
        }
    });
}(buster || {}));

if (typeof module != "undefined") {
    module.exports = buster;
}
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global buster, require, module*/
if (typeof buster == "undefined") {
    var buster = {};
}

(function () {
    function eventListeners(eventEmitter, event) {
        if (!eventEmitter.listeners) {
            eventEmitter.listeners = {};
        }

        if (!eventEmitter.listeners[event]) {
            eventEmitter.listeners[event] = [];
        }

        return eventEmitter.listeners[event];
    }

    function thisObjects(eventEmitter, event) {
        if (!eventEmitter.contexts) {
            eventEmitter.contexts = {};
        }

        if (!eventEmitter.contexts[event]) {
            eventEmitter.contexts[event] = [];
        }

        return eventEmitter.contexts[event];
    }

    buster.eventEmitter = {
        create: function () {
            return buster.util.create(this);
        },

        addListener: function addListener(event, listener, thisObject) {
            if (typeof listener != "function") {
                throw new TypeError("Listener is not function");
            }

            eventListeners(this, event).push(listener);
            thisObjects(this, event).push(thisObject);
        },

        hasListener: function hasListener(event, listener, thisObject) {
            var listeners = eventListeners(this, event);
            var contexts = thisObjects(this, event);

            for (var i = 0, l = listeners.length; i < l; i++) {
                if (listeners[i] == listener && contexts[i] === thisObject) {
                    return true;
                }
            }

            return false;
        },

        emit: function emit(event) {
            var listeners = eventListeners(this, event);
            var contexts = thisObjects(this, event);
            var args = Array.prototype.slice.call(arguments, 1);

            for (var i = 0, l = listeners.length; i < l; i++) {
                try {
                    listeners[i].apply(contexts[i] || this, args);
                } catch (e) {}
            }
        },

        bind: function (object, events) {
            var method;

            if (!events) {
                for (method in object) {
                    if (object.hasOwnProperty(method) && typeof object[method] == "function") {
                        this.addListener(method, object[method], object);
                    }
                }
            } else if (typeof events == "string" ||
                       Object.prototype.toString.call(events) == "[object Array]") {
                events = typeof events == "string" ? [events] : events;

                for (var i = 0, l = events.length; i < l; ++i) {
                    this.addListener(events[i], object[events[i]], object);
                }
            } else {
                for (var prop in events) {
                    if (events.hasOwnProperty(prop)) {
                        method = events[prop];

                        if (typeof method == "function") {
                            object[method.name || prop] = method;
                        } else {
                            method = object[events[prop]];
                        }

                        this.addListener(prop, method, object);
                    }
                }
            }

            return object;
        }
    };

    buster.eventEmitter.on = buster.eventEmitter.addListener;
}());

if (typeof module != "undefined") {
    module.exports = buster.eventEmitter;
}
if (typeof require != "undefined") {
    var buster = require("buster-core");
}

buster.format = buster.format || {};
buster.format.excludeConstructors = ["Object", /^.$/];

buster.format.ascii = (function () {
    function keys(object) {
        var k = Object.keys && Object.keys(object) || [];

        if (k.length == 0) {
            for (var prop in object) {
                if (object.hasOwnProperty(prop)) {
                    k.push(prop);
                }
            }
        }

        return k.sort();
    }

    function isCircular(object, objects) {
        if (typeof object != "object") {
            return false;
        }

        for (var i = 0, l = objects.length; i < l; ++i) {
            if (objects[i] === object) {
                return true;
            }
        }

        return false;
    }

    function ascii(object, processed, indent) {
        if (typeof object == "string") {
            return '"' + object + '"';
        }

        if (typeof object == "function" && !(object instanceof RegExp)) {
            return ascii.func(object);
        }

        processed = processed || [];

        if (isCircular(object, processed)) {
            return "[Circular]";
        }

        if (Object.prototype.toString.call(object) == "[object Array]") {
            return ascii.array(object);
        }

        if (!object) {
            return "" + object;
        }

        if (buster.isElement(object)) {
            return ascii.element(object);
        }

        if (object.toString !== Object.prototype.toString) {
            return object.toString();
        }

        return ascii.object.call(this, object, processed, indent);
    }

    ascii.func = function (func) {
        return "function " + ascii.functionName(func) + "() {}";
    };

    ascii.array = function (array, processed) {
        processed = processed || [];
        processed.push(array);
        var pieces = [];

        for (var i = 0, l = array.length; i < l; ++i) {
            pieces.push(ascii(array[i], processed));
        }

        return "[" + pieces.join(", ") + "]";
    };

    ascii.object = function (object, processed, indent) {
        processed = processed || [];
        processed.push(object);
        indent = indent || 0;
        var pieces = [], properties = keys(object), prop, str, obj;
        var is = "";
        var length = 3;

        for (var i = 0, l = indent; i < l; ++i) {
            is += " ";
        }

        for (i = 0, l = properties.length; i < l; ++i) {
            prop = properties[i];
            obj = object[prop];

            if (isCircular(obj, processed)) {
                str = "[Circular]";
            } else {
                str = ascii.call(this, obj, processed, indent + 2);
            }

            str = (/\s/.test(prop) ? '"' + prop + '"' : prop) + ": " + str;
            length += str.length;
            pieces.push(str);
        }

        var cons = ascii.constructorName.call(this, object);
        var prefix = cons ? "[" + cons + "] " : ""

        return (length + indent) > 80 ?
            prefix + "{\n  " + is + pieces.join(",\n  " + is) + "\n" + is + "}" :
            prefix + "{ " + pieces.join(", ") + " }";
    };

    ascii.element = function (element) {
        var tagName = element.tagName.toLowerCase();
        var attrs = element.attributes, attribute, pairs = [];

        for (var i = 0, l = attrs.length; i < l; ++i) {
            attribute = attrs.item(i);

            if (!!attribute.nodeValue) {
                pairs.push(attribute.nodeName + "=\"" + attribute.nodeValue + "\"");
            }
        }

        var formatted = "<" + tagName + (l > 0 ? " " : "");
        var content = element.innerHTML;

        if (content.length > 20) {
            content = content.substr(0, 20) + "[...]";
        }

        var res = formatted + pairs.join(" ") + ">" + content + "</" + tagName + ">";

        return res.replace(/ contentEditable="inherit"/, "");
    };

    ascii.functionName = function (func) {
        if (!func) {
            return "";
        }

        var name = func.displayName || func.name;

        if (!name) {
            var matches = func.toString().match(/function ([^\s\(]+)/);
            name = matches && matches[1] || "";
        }

        return name;
    };

    ascii.constructorName = function (object) {
        var name = ascii.functionName(object && object.constructor);
        var excludes = this.excludeConstructors || buster.format.excludeConstructors || [];

        for (var i = 0, l = excludes.length; i < l; ++i) {
            if (typeof excludes[i] == "string" && excludes[i] == name) {
                return "";
            } else if (excludes[i].test && excludes[i].test(name)) {
                return "";
            }
        }

        return name;
    };

    return ascii;
}());

if (typeof module != "undefined") {
    module.exports = buster.format;
}
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global buster, require, module*/
if (typeof require == "function") {
    var buster = require("buster-core");
}

(function () {
    var slice = Array.prototype.slice;
    var toString = Object.prototype.toString;
    var assert;

    function indexOf(arr, item) {
        for (var i = 0, l = arr.length; i < l; i++) {
            if (arr[i] == item) {
                return i;
            }
        }

        return -1;
    }

    function prepareAssertion(name, args, num) {
        if (typeof assert.count != "number") {
            assert.count = 0;
        }

        assert.count += 1;

        if (args.length < num) {
            assert.fail("[" + name + "] Expected to receive at least " +
                        num + " argument" + (num > 1 ? "s" : ""));
        }

        if (args.length >= num + 1) {
            var msg = args[num];

            if (typeof msg == "string") {
                msg += !/[\?\!\.\:\;\,]$/.test(msg) ? ": " : " ";
            }

            return msg;
        }

        return "";
    }

    function fail(assertion, msg) {
        msg = assert[assertion][msg];

        for (var i = 2, l = arguments.length; i < l; i++) {
            if (i == 2) {
                msg = msg.replace("${" + (i-2) + "}", arguments[i]);
            } else {
                msg = msg.replace("${" + (i-2) + "}", assert.format(arguments[i]));
            }
        }

        assert.fail("[assert." + assertion + "] " + msg);
    }

    function areEqual(expected, actual) {
        if (expected === actual) {
            return true;
        }

        // Elements are only equal if expected === actual
        if (buster.isElement(expected) || buster.isElement(actual)) {
            return false;
        }

        // null and undefined only pass for null === null and
        // undefined === undefined
        /*jsl: ignore*/
        if (expected == null || actual == null) {
            return actual === expected;
        }
        /*jsl: end*/

        if (expected instanceof Date || actual instanceof Date) {
            return expected instanceof Date && actual instanceof Date &&
                expected.getTime() == actual.getTime();
        }

        var useCoercingEquality = typeof expected != "object" || typeof actual != "object";

        if (expected instanceof RegExp && actual instanceof RegExp) {
            if (expected.toString() != actual.toString()) {
                return false;
            }

            useCoercingEquality = false;
        }

        // Coerce and compare when primitives are involved
        if (useCoercingEquality) {
            return expected == actual;
        }

        var expectedKeys = buster.keys(expected);
        var actualKeys = buster.keys(actual);

        if (buster.isArguments(expected) || buster.isArguments(actual)) {
            if (expected.length != actual.length) {
                return false;
            }
        } else {
            if (typeof expected != typeof actual ||
                toString.call(expected) != toString.call(actual) ||
                expectedKeys.length != actualKeys.length) {
                return false;
            }
        }

        var key;

        for (var i = 0, l = expectedKeys.length; i < l; i++) {
            key = expectedKeys[i];

            if (!Object.prototype.hasOwnProperty.call(actual, key) ||
                !areEqual(expected[key], actual[key])) {
                return false;
            }
        }

        return true;
    }

    assert = buster.assert = function (actual, message) {
        prepareAssertion("assert", arguments, 1);

        if (!actual) {
            var val = assert.format(actual)
            assert.fail(message || "[assert] Expected " + val + " to be truthy");
        }

        assert.pass("assert", message || "", actual);
    };

    assert.msgFail = "[assert] Expected ${1} to be thruthy";
    assert.count = 0;

    assert.fail = function (message) {
        var exception = new Error(message);
        exception.name = "AssertionError";
        throw exception;
    };

    assert.pass = function () {};

    assert.format = function (object) {
        return "" + object;
    };

    assert.isTrue = function (actual, message) {
        message = prepareAssertion("assert.isTrue", arguments, 1);

        if (actual !== true) {
            fail("isTrue", "msgFail", message, actual);
        }

        assert.pass("isTrue", message, actual);
    };

    assert.isTrue.msgFail = "${0}Expected ${1} to be true";

    assert.isFalse = function (actual, message) {
        message = prepareAssertion("assert.isFalse", arguments, 1);

        if (actual !== false) {
            fail("isFalse", "msgFail", message, actual);
        }

        assert.pass("isFalse", message, actual);
    };

    assert.isFalse.msgFail = "${0}Expected ${1} to be false";

    assert.same = function (actual, expected, message) {
        message = prepareAssertion("assert.same", arguments, 2);

        if (actual !== expected) {
            fail("same", "msgFail", message, actual, expected);
        }

        assert.pass("same", message, actual, expected);
    };

    assert.same.msgFail = "${0}Expected ${1} to be the same object as ${2}";

    assert.notSame = function (actual, expected, message) {
        message = prepareAssertion("assert.notSame", arguments, 2);

        if (actual === expected) {
            fail("notSame", "msgFail", message, actual, expected);
        }

        assert.pass("notSame", message, actual, expected);
    };

    assert.notSame.msgFail = "${0}Expected ${1} not to be the same object as ${2}";

    assert.equals = function (actual, expected, message) {
        message = prepareAssertion("assert.equals", arguments, 2);

        if (!areEqual(actual, expected)) {
            fail("equals", "msgFail", message, actual, expected);
        }

        assert.pass("equals", message, actual, expected);
    };

    assert.equals.msgFail = "${0}Expected ${1} to be equal to ${2}";

    assert.notEquals = function (actual, expected, message) {
        message = prepareAssertion("assert.notEquals", arguments, 2);

        if (areEqual(actual, expected)) {
            fail("notEquals", "msgFail", message, actual, expected);
        }

        assert.pass("notEquals", message, actual, expected);
    };

    assert.notEquals.msgFail = "${0}Expected ${1} not to be equal to ${2}";

    assert.typeOf = function (actual, expected, message) {
        message = prepareAssertion("assert.typeOf", arguments, 2);

        if (typeof actual != expected) {
            fail("typeOf", "msgFail", message, actual, expected, typeof actual);
        }

        assert.pass("typeOf", message, actual, expected);
    };

    assert.typeOf.msgFail = "${0}Expected typeof ${1} (${3}) to be ${2}";

    assert.notTypeOf = function (actual, expected, message) {
        message = prepareAssertion("assert.notTypeOf", arguments, 2);

        if (typeof actual == expected) {
            fail("notTypeOf", "msgFail", message, actual, expected);
        }

        assert.pass("notTypeOf", message, actual, expected);
    };

    assert.notTypeOf.msgFail = "${0}Expected typeof ${1} not to be ${2}";

    assert.isString = function (actual, message) {
        message = prepareAssertion("assert.isString", arguments, 1);

        if (typeof actual != "string") {
            fail("isString", "msgFail", message, actual, typeof actual);
        }

        assert.pass("isString", message, actual);
    };

    assert.isString.msgFail = "${0}Expected typeof ${1} (${2}) to be string";

    assert.isObject = function (actual, message) {
        message = prepareAssertion("assert.isObject", arguments, 1);

        if (typeof actual != "object" || !actual) {
            fail("isObject", "msgFail", message, actual, typeof actual);
        }

        assert.pass("isObject", message, actual);
    };

    assert.isObject.msgFail = "${0}Expected typeof ${1} (${2}) to be object and not null";

    assert.isFunction = function (actual, message) {
        message = prepareAssertion("assert.isFunction", arguments, 1);

        if (typeof actual != "function") {
            fail("isFunction", "msgFail", message, actual, typeof actual);
        }

        assert.pass("isFunction", message, actual);
    };

    assert.isFunction.msgFail = "${0}Expected typeof ${1} (${2}) to be function";

    assert.isBoolean = function (actual, message) {
        message = prepareAssertion("assert.isBoolean", arguments, 1);

        if (typeof actual != "boolean") {
            fail("isBoolean", "msgFail", message, actual, typeof actual);
        }

        assert.pass("isBoolean", message, actual);
    };

    assert.isBoolean.msgFail = "${0}Expected typeof ${1} (${2}) to be boolean";

    assert.isNumber = function (actual, message) {
        message = prepareAssertion("assert.isNumber", arguments, 1);

        if (typeof actual != "number") {
            fail("isNumber", "msgFail", message, actual, typeof actual);
        }

        assert.pass("isNumber", message, actual);
    };

    assert.isNumber.msgFail = "${0}Expected typeof ${1} (${2}) to be number";

    assert.isUndefined = function (actual, message) {
        message = prepareAssertion("assert.isUndefined", arguments, 1);

        if (typeof actual != "undefined") {
            fail("isUndefined", "msgFail", message, actual, typeof actual);
        }

        assert.pass("isUndefined", message, actual);
    };

    assert.isUndefined.msgFail = "${0}Expected typeof ${1} (${2}) to be undefined";

    assert.isNotUndefined = function (actual, message) {
        message = prepareAssertion("assert.isNotUndefined", arguments, 1);

        if (typeof actual == "undefined") {
            fail("isNotUndefined", "msgFail", message, actual);
        }

        assert.pass("isNotUndefined", message, actual);
    };

    assert.isNotUndefined.msgFail = "${0}Expected not to be undefined";

    assert.isNull = function (actual, message) {
        message = prepareAssertion("assert.isNull", arguments, 1);

        if (actual !== null) {
            fail("isNull", "msgFail", message, actual);
        }

        assert.pass("isNull", message, actual);
    };

    assert.isNull.msgFail = "${0}Expected ${1} to be null";

    assert.isNotNull = function (actual, message) {
        message = prepareAssertion("assert.isNotNull", arguments, 1);

        if (actual === null) {
            fail("isNotNull", "msgFail", message);
        }

        assert.pass("isNotNull", message);
    };

    assert.isNotNull.msgFail = "${0}Expected not to be null";

    assert.isNaN = function (actual, message) {
        message = prepareAssertion("assert.isNaN", arguments, 1);

        if (!isNaN(actual)) {
            fail("isNaN", "msgFail", message, actual);
        }

        assert.pass("isNaN", message, actual);
    };

    assert.isNaN.msgFail = "${0}Expected ${1} to be NaN";

    assert.isNotNaN = function (actual, message) {
        message = prepareAssertion("assert.isNotNaN", arguments, 1);

        if (isNaN(actual)) {
            fail("isNotNaN", "msgFail", message, actual);
        }

        assert.pass("isNotNaN", message, actual);
    };

    assert.isNotNaN.msgFail = "${0}Expected not to be NaN";

    assert.isArray = function (actual, message) {
        message = prepareAssertion("assert.isArray", arguments, 1);

        if (toString.call(actual) != "[object Array]") {
            fail("isArray", "msgFail", message, actual);
        }

        assert.pass("isArray", message, actual);
    };

    assert.isArray.msgFail = "${0}Expected ${1} to be array";

    assert.isNotArray = function (actual, message) {
        message = prepareAssertion("assert.isNotArray", arguments, 1);

        if (toString.call(actual) == "[object Array]") {
            fail("isNotArray", "msgFail", message, actual);
        }

        assert.pass("isNotArray", message, actual);
    };

    assert.isNotArray.msgFail = "${0}Expected ${1} not to be array";

    function isArrayLike(object) {
        return toString.call(object) == "[object Array]" ||
            (!!object && typeof object.length == "number" &&
            typeof object.splice == "function") ||
            buster.isArguments(object);
    }

    assert.isArrayLike = function (actual, message) {
        message = prepareAssertion("assert.isArrayLike", arguments, 1);

        if (!isArrayLike(actual)) {
            fail("isArrayLike", "msgFail", message, actual);
        }

        assert.pass("isArrayLike", message, actual);
    };

    assert.isArrayLike.msgFail = "${0}Expected ${1} to be array like";

    assert.isNotArrayLike = function (actual, message) {
        message = prepareAssertion("assert.isNotArrayLike", arguments, 1);

        if (isArrayLike(actual)) {
            fail("isNotArrayLike", "msgFail", message, actual);
        }

        assert.pass("isNotArrayLike", message, actual);
    };

    assert.isNotArrayLike.msgFail = "${0}Expected ${1} not to be array like";

    function match(object, matcher) {
        if (matcher && typeof matcher.test == "function") {
            return matcher.test(object);
        }

        if (typeof matcher == "function") {
            return matcher(object) === true;
        }

        if (typeof matcher == "string") {
            matcher = matcher.toLowerCase();
            return !!object && ("" + object).toLowerCase().indexOf(matcher) >= 0;
        }

        if (typeof matcher == "number") {
            return matcher == object;
        }

        if (matcher && typeof matcher == "object") {
            for (var prop in matcher) {
                if (!match(object[prop], matcher[prop])) {
                    return false;
                }
            }

            return true;
        }

        throw new Error("Matcher (" + assert.format(matcher) + ") was not a " +
                        "string, a number, a function or an object");
    }

    assert.match = function (actual, matcher, message) {
        message = prepareAssertion("assert.match", arguments, 2);
        var passed;

        try {
            passed = match(actual, matcher);
        } catch (e) {
            fail("match", "msgException", message, e.message);
        }

        if (!passed) {
            fail("match", "msgFail", message, actual, matcher);
        }

        assert.pass("match", message, actual, matcher);
    };

    assert.match.msgException = "${0}${1}";
    assert.match.msgFail = "${0}Expected ${1} to match ${2}";

    assert.noMatch = function (actual, matcher, message) {
        message = prepareAssertion("assert.noMatch", arguments, 2);
        var passed;

        try {
            passed = match(actual, matcher);
        } catch (e) {
            fail("noMatch", "msgException", message, e.message);
        }

        if (passed) {
            fail("noMatch", "msgFail", message, matcher, actual);
        }

        assert.pass("noMatch", message, matcher, actual);
    };

    assert.noMatch.msgException = "${0}${1}";
    assert.noMatch.msgFail = "${0}Expected ${2} not to match ${1}";

    function captureException(callback) {
        try {
            callback();
        } catch (e) {
            return e;
        }

        return null;
    }

    assert.exception = function (callback, exception, message) {
        prepareAssertion("assert.exception", arguments, 1);
        var err = captureException(callback);
        message = message ? message + ": " : "";

        if (!err) {
            if (exception) {
                fail("exception", "msgTypeNoException", message, exception);
            } else {
                fail("exception", "msgFail", message, exception);
            }
        }

        if (exception && err.name != exception) {
            fail("exception", "msgTypeFail", message, exception, err.name);
        }

        assert.pass("exception", message, callback, exception);
    };

    assert.exception.msgTypeNoException = "${0}Expected ${1} but no exception was thrown";
    assert.exception.msgFail = "${0}Expected exception";
    assert.exception.msgTypeFail = "${0}Expected ${1} but threw ${2}";

    assert.noException = function (callback, message) {
        message = prepareAssertion("assert.noException", arguments, 1);
        var err = captureException(callback);

        if (err) {
            fail("noException", "msgFail", message, err.name, callback);
        }

        assert.pass("noException", message, callback);
    };

    assert.noException.msgFail = "${0}Expected not to throw but threw ${1}";

    assert.tagName = function (element, tagName, message) {
        message = prepareAssertion("assert.tagName", arguments, 2);

        if (!element.tagName) {
            fail("tagName", "msgNoTagName", message, tagName, element);
        }

        if (!tagName.toLowerCase ||
            tagName.toLowerCase() != element.tagName.toLowerCase()) {
            fail("tagName", "msgFail", message, tagName, element.tagName);
        }

        assert.pass("tagName", message, tagName, element);
    };

    assert.tagName.msgNoTagName = "${0}Expected ${2} to have tagName property";
    assert.tagName.msgFail = "${0}Expected tagName to be ${1} but was ${2}";

    assert.notTagName = function (element, tagName, message) {
        message = prepareAssertion("assert.notTagName", arguments, 2);

        if (!element.tagName) {
            fail("notTagName", "msgNoTagName", message, tagName, element);
        }

        if (tagName.toLowerCase &&
            tagName.toLowerCase() == element.tagName.toLowerCase()) {
            fail("notTagName", "msgFail", message, tagName);
        }

        assert.pass("notTagName", message, tagName, element);
    };

    assert.notTagName.msgNoTagName = "${0}Expected ${2} to have tagName property";
    assert.notTagName.msgFail = "${0}Expected tagName not to be ${1}";

    assert.className = function (element, tagName, message) {
        message = prepareAssertion("assert.className", arguments, 2);

        if (typeof element.className == "undefined") {
            fail("className", "msgNoClassName", message, tagName, element);
        }

        var expected = typeof tagName == "string" ? tagName.split(" ") : tagName;
        var actual = element.className.split(" ");

        for (var i = 0, l = expected.length; i < l; i++) {
            if (indexOf(actual, expected[i]) < 0) {
                fail("className", "msgFail", message, tagName, element.className);
            }
        }

        assert.pass("className", message, tagName, element);
    };

    assert.className.msgNoClassName = "${0}Expected object to have className property";
    assert.className.msgFail = "${0}Expected object's className to include ${1} but was ${2}";

    assert.notClassName = function (element, tagName, message) {
        message = prepareAssertion("assert.notClassName", arguments, 2);

        if (typeof element.className == "undefined") {
            fail("notClassName", "msgNoClassName", message, tagName, element);
        }

        var expected = typeof tagName == "string" ? tagName.split(" ") : tagName;
        var actual = element.className.split(" ");

        for (var i = 0, l = expected.length; i < l; i++) {
            if (indexOf(actual, expected[i]) < 0) {
                return assert.pass("notClassName", message, tagName, element);;
            }
        }

        fail("notClassName", "msgFail", message, tagName, element.className);
    };

    assert.notClassName.msgNoClassName = "${0}Expected object to have className property";
    assert.notClassName.msgFail = "${0}Expected object's className not to include ${1}";

    if (typeof module != "undefined") {
        module.exports = buster.assert;
    }
}());
var buster = buster || {};

if (typeof module != "undefined") {
    buster = require("buster-core");
}

(function () {
    var states = {
        unresolved: "unresolved",
        resolve: "resolve",
        reject: "reject"
    };

    function notify(listener) {
        if (typeof listener[this.state] == "function") {
            listener[this.state].apply(null, this.resolution);
        }
    }

    function fulfill(how, args) {
        if (this.state != states.unresolved) {
            throw new Error("Promise is already fulfilled");
        }

        this.state = states[how];
        var callbacks = this.callbacks || [];
        this.resolution = Array.prototype.slice.call(args);

        for (var i = 0, l = callbacks.length; i < l; ++i) {
            notify.call(this, callbacks[i]);
        }

        return this;
    }

    var id = 0;

    buster.promise = {
        state: states.unresolved,

        create: function (func) {
            var promise = buster.create(this);
            promise.id = id++;

            if (func) {
                func(this);
            }

            return promise;
        },

        then: function (resolve, reject) {
            var listener = { resolve: resolve, reject: reject };

            if (this.state == states.unresolved) {
                this.callbacks = this.callbacks || [];
                this.callbacks.push(listener);
            } else {
                notify.call(this, listener);
            }
        },

        resolve: function () {
            return fulfill.call(this, "resolve", arguments);
        },

        reject: function () {
            return fulfill.call(this, "reject", arguments);
        }
    };

    buster.promise.sequential = function (funcs, opt) {
        opt = opt || {};
        var promise = buster.promise.create();
        var next = function () { runOne(funcs.shift()); }

        if (typeof funcs.slice == "function") {
            funcs = funcs.slice();
        }

        function runOne(func) {
            var resolution;

            if (!func) {
                return promise.resolve();
            }

            try {
                resolution = func.call(opt.thisObj);
            } catch (e) {
                if (opt.error) {
                    opt.error(e);
                } else {
                    promise.reject(e);
                    return;
                }
            }

            if (resolution) {
                resolution.then(next, function () {
                    promise.reject.apply(promise, arguments);
                });
            } else {
                buster.nextTick(next);
            }
        }

        buster.nextTick(next);
        return promise;
    };

    buster.promise.thenable = function (val) {
        if (!val || typeof val.then != "function") {
            var promise = buster.promise.create();
            promise.resolve(val);

            return promise;
        }

        return val;
    };

    buster.promise.all = function () {
        var promise = buster.promise.create();
        var count = arguments.length;
        var done = false;
        var data = [];

        function rejecter() {
            if (!done) {
                promise.reject.apply(promise, arguments);
                done = true;
            }
        }

        function resolver(index) {
            return function () {
                if (done) {
                    return;
                }

                data[index] = Array.prototype.slice.call(arguments);
                count -= 1;

                if (count <= 0) {
                    promise.resolve.apply(promise, data);
                    done = true;
                }
            }
        }

        for (var i = 0, l = count; i < l; ++i) {
            arguments[i].then(resolver(i), rejecter);
        }

        if (arguments.length == 0) {
            promise.resolve();
            done = true;
        }

        return promise;
    };
}());

if (typeof module != "undefined") {
    module.exports = buster.promise;
}var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.eventEmitter = require("buster-event-emitter");
}

function log(messages, level) {
    if (levels[level] > levels[this.level]) {
        return;
    }

    var message = [];

    for (var i = 0, l = messages.length; i < l; ++i) {
        message.push(this.format(messages[i]));
    }

    this.emit("log", { message: message.join(" "), level: level });
}

var levels = {
    "error": 1,
    "warn": 2,
    "log": 3,
    "debug": 4
};

buster.eventedLogger = buster.extend(buster.create(buster.eventEmitter), {
    level: "debug",

    create: function () {
        return buster.create(this);
    },

    debug: function () {
        return log.call(this, arguments, "debug");
    },

    log: function () {
        return log.call(this, arguments, "log");
    },

    warn: function () {
        return log.call(this, arguments, "warn");
    },

    error: function () {
        return log.call(this, arguments, "error");
    },

    format: function (obj) {
        if (typeof obj != "object") {
            return "" + obj;
        }

        try {
            return JSON.stringify(obj);
        } catch (e) {
            return "" + obj;
        }
    }
});

if (typeof module != "undefined") {
    module.exports = buster.eventedLogger;
}
var buster = buster || {};

if (typeof require == "function") {
    buster = require("buster-core");
    buster.promise = require("buster-promise");
}

buster.test = {};

buster.test.pluralize = function (num, phrase) {
    num = typeof num == "undefined" ? 0 : num;
    return num + " " + (num == 1 ? phrase : phrase + "s");
};

buster.test.extractStack = function (stack) {
    var lines = (stack || "").split("\n");
    var stackLines = [];

    for (var i = 0, l = lines.length; i < l; ++i) {
        if (/(\d+)?:\d+\)?$/.test(lines[i])) {
            if (!filterMatch(lines[i])) {
                stackLines.push(lines[i].trim());
            }
        }
    }

    return stackLines;
};

var regexpes = {};

function filterMatch(line) {
    var filters = buster.test.stackFilters;

    for (var i = 0, l = filters.length; i < l; ++i) {
        if (!regexpes[filters[i]]) {
            regexpes[filters[i]] = new RegExp(filters[i]);
        }

        if (regexpes[filters[i]].test(line)) {
            return true;
        }
    }

    return false;
}

buster.test.stackFilters = ["buster-assert/lib",
                            "buster-test/lib", 
                            "buster-util/lib",
                            "buster-core/lib",
                            "node.js",
                            "static/runner.js"/* JsTestDriver */];

buster.test.ansiOut = {
    color: false,
    bright: false,

    create: function (opt) {
        var ansiOut = buster.create(this);
        opt = opt || {};

        if (typeof opt.color == "boolean") {
            ansiOut.color = opt.color;
        }

        if (typeof opt.bright == "boolean") {
            ansiOut.bright = opt.bright;
        }

        return ansiOut;
    },

    red: function (str) {
        return this.colorize(str, 31);
    },

    yellow: function (str) {
        return this.colorize(str, 33);
    },

    green: function (str) {
        return this.colorize(str, 32);
    },

    purple: function (str) {
        return this.colorize(str, 35);
    },

    cyan: function (str) {
        return this.colorize(str, 36);
    },

    colorize: function (str, color) {
        if (!this.color) {
            return str;
        }

        return (this.bright ? "\033[1m" : "") +
            "\033[" + color + "m" + str + "\033[0m";
    },
};

if (typeof module != "undefined") {
    module.exports = buster.test;
}
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.eventEmitter = require("buster-event-emitter");
}

(function (B) {
    var current = [];
    B.spec = {};

    if (typeof module != "undefined") {
        module.exports = B.spec;
    }

    B.spec.describe = function (name, spec) {
        if (current.length > 0) {
            var currCtx = current[current.length - 1];
            var ctx = B.spec.describe.context.create(name, spec, currCtx);
            currCtx.contexts.push(ctx.parse());
            return;
        }

        var context = buster.extend(B.spec.describe.context.create(name, spec));
        context.parse();

        if (B.spec.describe.onCreate) {
            B.spec.describe.onCreate(context);
        }

        return context;
    };

    buster.extend(B.spec.describe, buster.eventEmitter);

    B.spec.should = function (name, func) {
        var context = current[current.length - 1];
        var prefix = "should ";

        if (/^\/\//.test(name)) {
            prefix = "//" + prefix;
            name = name.replace(/^\/\/\s*/, "");
        }

        context.tests.push({
            name: prefix + name,
            func: func,
            context: context
        });
    };

    B.spec.shouldEventually = function (name, func) {
        return B.spec.should("//" + name, func);
    };

    B.spec.before = function (func) {
        var context = current[current.length - 1];
        context.setUp = func;
    };

    B.spec.after = function (func) {
        var context = current[current.length - 1];
        context.tearDown = func;
    };

    B.spec.describe.context = {
        create: function (name, spec, parent) {
            if (!name || typeof name != "string") {
                throw new Error("Spec name required");
            }

            if (!spec || typeof spec != "function") {
                throw new Error("spec should be a function");
            }

            var context = buster.create(this);
            context.name = name;
            context.parent = parent;
            context.spec = spec;

            return context;
        },

        parse: function () {
            if (!this.spec) {
                return;
            }

            this.testCase = {
                before: B.spec.before,
                after: B.spec.after,
                should: B.spec.should,
                shouldEventually: B.spec.shouldEventually,
                describe: B.spec.describe
            };

            this.tests = [];
            current.push(this);
            this.contexts = [];
            this.spec.call(this.testCase);
            current.pop();
            delete this.spec;

            return this;
        }
    };

    var g = typeof global != "undefined" && global || this;

    B.spec.expose = function (env) {
        env = env || g;
        env.describe = B.spec.describe;
        env.should = B.spec.should;
        env.before = B.spec.before;
        env.after = B.spec.after;
        env.shouldEventually = B.spec.shouldEventually;
    };
}(buster));
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.eventEmitter = require("buster-event-emitter");
}

(function (B) {
    var testCase = B.testCase = function (name, tests, opt) {
        if (!name || typeof name != "string") {
            throw new Error("Test case name required");
        }

        if (!tests || typeof tests != "object") {
            throw new Error("Tests should be an object");
        }

        var context = buster.extend(testCase.context.create(name, tests), opt || {});
        context.parse();

        if (typeof B.testCase.onCreate == "function") {
            B.testCase.onCreate(context);
        }

        return context;
    };

    if (typeof module != "undefined") {
        module.exports = B.testCase;
    }

    B.extend(testCase, B.eventEmitter);

    function nonTestNames(context) {
        if (!context.nonTestNames) {
            var keys = ["setUp", "contextSetUp", "tearDown", "contextTearDown"];
            context.nonTestNames = {};

            for (var i = 0, l = keys.length; i < l; ++i) {
                context.nonTestNames[context[keys[i] + "Name"]] = true;
            }
        }

        return context.nonTestNames;
    }

    testCase.context = {
        contextSetUpName: "contextSetUp",
        setUpName: "setUp",
        tearDownName: "tearDown",
        contextTearDownName: "contextTearDown",

        create: function (name, tests, parent) {
            var context = B.create(this);
            context.name = name;
            context.content = tests;
            context.parent = parent;
            context.testCase = {};

            return context;
        },

        parse: function () {
            this.tests = this.getTests();
            this.contexts = this.getContexts();
            this.setUp = this.getSetUp();
            this.tearDown = this.getTearDown();
            this.contextSetUp = this.getContextSetUp();
            this.contextTearDown = this.getContextTearDown();
            return this;
        },

        getTests: function () {
            var tests = [];

            for (var prop in this.content) {
                if (this.isTest(prop)) {
                    tests.push({
                        name: prop,
                        func: this.content[prop],
                        context: this
                    });
                }
            }

            return tests;
        },

        getContexts: function () {
            var contexts = [], ctx;

            for (var prop in this.content) {
                if (this.isContext(prop)) {
                    ctx = testCase.context.create(prop, this.content[prop], this);
                    ctx.contextSetUpName = this.contextSetUpName;
                    ctx.setUpName = this.setUpName;
                    ctx.contextTearDownName = this.contextTearDownName;
                    ctx.tearDownName = this.tearDownName;
                    contexts.push(ctx.parse());
                }
            }

            return contexts;
        },

        getSetUp: function () {
            return this.content[this.setUpName];
        },

        getContextSetUp: function () {
            return this.content[this.contextSetUpName];
        },

        getTearDown: function () {
            return this.content[this.tearDownName];
        },

        getContextTearDown: function () {
            return this.content[this.contextTearDownName];
        },

        isTest: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "function" &&
                !nonTestNames(this)[prop];
        },

        isContext: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "object" &&
                !!this.content[prop];
        }
    };
}(buster));
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.eventEmitter = require("buster-event-emitter");
    buster.promise = require("buster-promise");
    buster.eventedLogger = require("./evented-logger");
}

(function (B) {
    var thenable = buster.promise.thenable;
    var sequential = buster.promise.sequential;

    function processAll(opt, method, items) {
        var i = 0, args = Array.prototype.slice.call(arguments, 3);
        var runner = this;

        return sequential({
            shift: function () {
                var item = items[i++];

                if (item) {
                    return function () {
                        return runner[method].apply(runner, [item].concat(args));
                    };
                } else {
                    return null;
                }
            }
        }, opt);
    }

    function all() {
        var args = Array.prototype.slice.call(arguments);
        return processAll.apply(this, [{ error: function () {} }].concat(args));
    }

    function noisyAll() {
        var args = Array.prototype.slice.call(arguments);
        return processAll.apply(this, [null].concat(args));
    }

    function asyncFunction(func, thisObj) {
        var promise, arg;

        if (func.length == 1) {
            promise = buster.promise.create();

            arg = function (err) {
                try {
                    if (err) {
                        promise.reject(err);
                    } else {
                        promise.resolve();
                    }
                } catch (e) {}
            };
        }

        return func.call(thisObj, arg) || promise;
    }

    function getAll(context, getter, appendMethod) {
        var funcs = [];

        while (context) {
            if (typeof context[getter] == "function") {
                funcs[appendMethod](context[getter]);
            }

            context = context.parent;
        }

        return funcs;
    }

    function getResults(runner) {
        if (!runner.results) {
            runner.results = {
                contexts: 0,
                tests: 0,
                errors: 0,
                failures: 0,
                assertions: 0,
                timeouts: 0,
                deferred: 0
            };
        }

        return runner.results;
    }

    B.testRunner = B.extend(B.create(B.eventEmitter), {
        failOnNoAssertions: true,
        timeout: 250,

        create: function (opt) {
            opt = opt || {};
            var runner = buster.create(this);
            runner.console = opt.logger || buster.eventedLogger.create();

            if (typeof opt.timeout == "number") {
                runner.timeout = opt.timeout;
            }

            if (typeof opt.failOnNoAssertions == "boolean") {
                runner.failOnNoAssertions = opt.failOnNoAssertions
            }

            if (this.onCreate) {
                this.onCreate(runner);
            }

            return runner;
        },

        runSuite: function (contexts) {
            this.emit("suite:start");
            var self = this, i = 0;
            var results = getResults(this);
            var promise = buster.promise.create();

            sequential({
                shift: function () {
                    var context = contexts[i++];

                    if (context) {
                        results.contexts += 1;
                        return B.bind(self, "run", context);
                    } else {
                        return null;
                    }
                }
            }).then(function () {
                results.ok = results.errors == 0 && results.failures == 0 &&
                    results.timeouts == 0;

                if (self.failOnNoAssertions && results.assertions == 0) {
                    results.ok = false;
                }

                self.emit("suite:end", results);
                promise.resolve();
            });

            return promise;
        },

        run: function (context) {
            this.emit("context:start", context);
            var promise = buster.promise.create();
            var self = this;

            if (!context) {
                return promise.reject();
            }

            var setUps = getAll(context, "setUp", "unshift");
            var tearDowns = getAll(context, "tearDown", "push");
            var testCase = context.testCase;

            sequential([
                B.bind(this, all, "runTest", context.tests, setUps, tearDowns, testCase),
                B.bind(this, all, "run", context.contexts)
            ]).then(function () {
                self.emit("context:end", context);
                promise.resolve();
            });

            return promise;
        },

        runTest: function (test, setUps, tearDowns, testCase) {
            if (this.isDeferred(test)) {
                return this.deferTest(test);
            }

            var self = this, results = getResults(this);
            var promise = buster.promise.create();
            testCase = B.create(testCase);
            testCase.console = this.console;

            function cleanUp(err) {
                function done(err2) {
                    var assertions = self.assertionCount();
                    var error = err || err2 || self.verifyAssertionCount(testCase);
                    delete testCase.expectedAssertions;

                    if (!error) {
                        results.assertions += assertions;

                        self.emit("test:success", {
                            name: test.name,
                            assertions: assertions
                        });
                    } else {
                        self.error(error, test);
                    }

                    results.tests += 1;
                    promise.resolve();
                }

                self.runTearDowns(tearDowns, test, testCase).then(done, done);
            }

            sequential([
                B.bind(this, "runSetUps", setUps, test, testCase),
                B.bind(this, "emit", "test:start", { name: test.name, testCase: testCase }),
                B.bind(this, "runTestFunction", test, testCase)
            ]).then(cleanUp, cleanUp);

            return promise;
        },

        runTestFunction: function (test, testCase) {
            var result = asyncFunction(test.func, testCase);

            if (result && result.then) {
                if (!test.asyncEmitted) {
                    this.emit("test:async", { name: test.name });
                }

                this.timebox(test, result);
            }

            return thenable(result);
        },

        runSetUps: function (setUps, test, testCase) {
            this.emit("test:setUp", { name: test.name, testCase: testCase });
            return noisyAll.call(this, "runSetUp", setUps, test, testCase);
        },

        runSetUp: function (setUp, test, testCase) {
            var promise = this.timebox(test, asyncFunction(setUp, testCase));

            if (promise && !test.asyncEmitted) {
                test.asyncEmitted = true;
                this.emit("test:async", { name: test.name });
            }

            return promise;
        },

        runTearDowns: function (tearDowns, test, testCase) {
            this.emit("test:tearDown", { name: test.name, testCase: testCase });
            return noisyAll.call(this, "runTearDown", tearDowns, test, testCase);
        },

        runTearDown: function (tearDown, test, testCase) {
            var promise = this.timebox(test, asyncFunction(tearDown, testCase));

            if (promise && !test.asyncEmitted) {
                this.emit("test:async", { name: test.name });
            }

            return promise;
        },

        timebox: function (test, promise) {
            if (!promise) {
                return;
            }

            var self = this;

            var timer = setTimeout(function () {
                try {
                    promise.resolve();
                    self.emit("test:timeout", { name: test.name });
                    getResults(self).timeouts += 1;
                } catch (e) {}
            }, this.timeout);

            promise.then(function () {
                clearTimeout(timer);
            });

            return promise;
        },

        isDeferred: function (test) {
            return /^\/\//.test(test.name);
        },

        deferTest: function (test) {
            test.name = test.name.replace(/^\/\/\s*/, "");
            this.emit("test:deferred", test);
            getResults(this).deferred += 1;
        },

        error: function (error, test) {
            var data = {
                name: test.name,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            };

            var results = getResults(this);

            if (error.name == "AssertionError") {
                results.failures += 1;
                this.emit("test:failure", data);
            } else {
                results.errors += 1;
                this.emit("test:error", data);
            }
        },

        assertionCount: function () {},

        verifyAssertionCount: function (testCase) {
            var message, assertions = this.assertionCount();
            var expected = testCase.expectedAssertions;

            if (this.failOnNoAssertions && assertions == 0) {
                message = "No assertions!";
            }

            if (expected && assertions != expected) {
                message = "Expected " + expected + " assertions, ran " + assertions;
            }

            if (message) {
                try {
                    var error = new Error(message);
                    error.name = "AssertionError";
                    throw error;
                } catch (e) {
                    return e;
                }
            }
        }
    });
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.testRunner
}
buster.htmlReporter = (function () {
    function createElement(tagName, properties) {
        var el = document.createElement(tagName), value;

        for (var prop in properties) {
            value = properties[prop];

            if (prop == "text") {
                prop = "innerHTML";
            }

            el[prop] = value;
        }

        return el;
    }

    function addListItem(tagName, test, className) {
        var prefix = tagName ? "<" + tagName + ">" : "";
        var suffix = tagName ? "</" + tagName + ">" : "";
        var name = this.contexts.slice(1).join(" ") + " " + test.name;

        var item = createElement("li", {
            className: className,
            text: prefix + name.replace(/^\s+|\s+$/, "") + suffix
        });

        this.list().appendChild(item);
        return item;
    }

    function addException(li, error) {
        if (!error) {
            return;
        }

        var name = error.name == "AssertionError" ? "" : error.name + ": ";

        li.appendChild(createElement("p", {
            innerHTML: name + error.message,
            className: "error-message"
        }));

        var stack = buster.test.extractStack(error.stack) || [];

        if (stack.length > 0) {
            stack = stack.slice(1);

            li.appendChild(createElement("ul", {
                className: "stack",
                innerHTML: "<li>" + stack.join("</li><li>") + "</li>"
            }));
        }
    }

    var pluralize = buster.test.pluralize;

    return {
        create: function (opt) {
            if (!opt || !opt.root) {
                throw new TypeError("Need root element");
            }

            var reporter = buster.create(this);
            reporter.root = opt.root;
            reporter.contexts = [];

            return reporter;
        },

        listen: function (runner) {
            runner.bind(this, {
                "context:start": "contextStart", "context:end": "contextEnd",
                "test:success": "testSuccess", "test:failure": "testFailure",
                "test:error": "testError", "test:timeout": "testTimeout",
                "test:deferred": "testDeferred", "suite:end": "addStats"
            });

            if (runner.console) {
                runner.console.bind(this, "log");
            }

            return this;
        },

        contextStart: function (context) {
            this.startedAt = new Date();
            this.contexts.push(context.name);
            this.root.appendChild(createElement("h2", { text: context.name }));
        },

        contextEnd: function (context) {
            this.contexts.pop();
            this._list = null;
        },

        testSuccess: function (test) {
            var li = addListItem.call(this, "h3", test, "success");
            this.addMessages(li);
        },

        testFailure: function (test) {
            var li = addListItem.call(this, "h3", test, "failure");
            this.addMessages(li);
            addException(li, test.error);
        },

        testError: function (test) {
            var li = addListItem.call(this, "h3", test, "error");
            this.addMessages(li);
            addException(li, test.error);
        },

        testDeferred: function (test) {
            var li = addListItem.call(this, "h3", test, "deferred");
        },

        testTimeout: function (test) {
            var li = addListItem.call(this, "h3", test, "timeout");
            this.addMessages(li);
        },

        log: function (msg) {
            this.messages = this.messages || [];
            this.messages.push(msg);
        },

        addMessages: function (li) {
            var messages = this.messages || [];
            var html = "";

            if (messages.length == 0) {
                return;
            }

            for (var i = 0, l = messages.length; i < l; ++i) {
                html += "<li class=\"" + messages[i].level + "\">";
                html += messages[i].message + "</li>";
            }

            li.appendChild(createElement("ul", {
                className: "messages",
                innerHTML: html
            }));

            this.messages = [];
        },

        success: function (stats) {
            return stats.failures == 0 && stats.errors == 0 &&
                stats.tests > 0 && stats.assertions > 0;
        },

        addStats: function (stats) {
            var diff = (new Date() - this.startedAt) / 1000;
            var statsEl = createElement("div", { className: "stats" });
            this.root.appendChild(statsEl);

            statsEl.appendChild(createElement("h2", {
                text: this.success(stats) ? "Tests OK" : "Test failures!"
            }));

            var html = "";
            html += "<li>" + pluralize(stats.contexts, "test case") + "</li>";
            html += "<li>" + pluralize(stats.tests, "test") + "</li>";
            html += "<li>" + pluralize(stats.assertions, "assertion") + "</li>";
            html += "<li>" + pluralize(stats.failures, "failure") + "</li>";
            html += "<li>" + pluralize(stats.errors, "error") + "</li>";
            html += "<li>" + pluralize(stats.timeouts, "timeout") + "</li>";

            if (stats.deferred > 0) {
                html += "<li>" + stats.deferred + " deferred</li>";
            }

            statsEl.appendChild(createElement("ul", { innerHTML: html }));
            statsEl.appendChild(createElement("p", {
                className: "time",
                innerHTML: "Finished in " + diff + "s"
            }));
        },

        list: function () {
            if (!this._list) {
                this._list = createElement("ul", { className: "test-results" });
                this.root.appendChild(this._list);
            }

            return this._list;
        }
    };
}());
if (typeof require != "undefined") {
    var buster = require("buster-core");

    module.exports = buster.extend(buster, {
        assert: require("buster-assert"),
        format: require("buster-format"),
        testCase: require("./buster-test/test-case"),
        spec: require("./buster-test/spec"),
        testRunner: require("./buster-test/test-runner"),
        filteredRunner: require("./buster-test/filtered-runner"),
        xUnitConsoleReporter: require("./buster-test/reporters/xunit-console"),
        bddConsoleReporter: require("./buster-test/reporters/bdd-console"),
        quietConsoleReporter: require("./buster-test/reporters/quiet-console")
    });
}

buster.assert.format = buster.format.ascii;
var assertions = 0;

buster.assert.pass = function () {
    assertions += 1;
};

buster.testRunner.on("test:start", function () {
    assertions = 0;
});

buster.testRunner.assertionCount = function () {
    return assertions;
};

var create = buster.testRunner.create;
var instances = 0;

buster.testRunner.create = function () {
    instances += 1;
    return create.apply(this, arguments);
};

var testCases = [];

buster.testCase.onCreate = function (tc) {
    testCases.push(tc);
};

buster.spec.describe.onCreate = buster.testCase.onCreate;

buster.nextTick(function () {
    var reporter;

    if (instances == 0 && testCases.length > 0) {
        var runner = buster.testRunner.create({
            timeout: 750,
            failOnNoAssertions: false
        });

        var opt = {
            color: true,
            bright: true
        };

        if (typeof document != "undefined") {
            reporter = "htmlReporter";
            opt.root = document.getElementById("buster");
        } else {
            var env = process && process.env;
            reporter = env && env.BUSTER_REPORTER || "xUnitConsoleReporter";
        }

        buster[reporter].create(opt).listen(runner);
        runner.runSuite(testCases);
    }
});
