(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = global || self, global.sensible = factory());
}(this, (
    function () {
        'use strict';

        /**
         * Initialization function, executes automatically
         * @param store
         * @returns {Promise<void>}
         */
        async function init(store) {

            await domReady();
            getData(store);
            processCallbacks(store);

            var initializing = true;
            Object.keys(store.data).forEach(function (variable) {
                if (store.data[variable].hasOwnProperty('computed')) {
                    Object.defineProperty(_data, variable, {
                        get: function() { return exec(store.data[variable].computed); },
                        configurable: true
                    });
                    Object.defineProperty(window, variable, {
                        get: function() { return _data[variable]; },
                        configurable: true
                    });
                    return;
                }
                if (store.data[variable].hasOwnProperty('type') && store.data[variable].type === Array) {
                    if (_data[variable] === undefined) {
                        _data[variable] = [];
                    }
                    let arrayObserver = new ArrayObserver(_data[variable])
                    arrayObserver.Observe(function (result, method) {
                        if (store.persist) {
                            if ((store.data[variable].hasOwnProperty('persist') && store.data[variable].persist !== false)) {
                                localStorage.setItem(store.localPrefix + variable, JSON.stringify(_data[variable]));
                            }
                        }
                        if (!initializing) {
                            processElements(variable);
                        }
                    });
                } else if (store.data[variable].hasOwnProperty('type') && store.data[variable].type === Object) {
                    const observer = new Observer(_data, variable, variable);
                    observer.Observe(function (value) {
                        if (!initializing) {
                            processElements(variable);
                        }
                    })
                    _data[variable] = {};
                    Object.keys(store.data[variable].default).forEach(function (property) {
                        const observer = new Observer(_data[variable], property, variable);
                        observer.Observe(function (value) {
                            if (!initializing) {
                                processElements(variable);
                            }
                        })
                    });
                } else {
                    const observer = new Observer(_data, variable, false);
                    observer.Observe(function (value) {
                        if (!initializing) {
                            processElements(variable);
                        }
                    })
                }

                // Window pass-through for backward compatibility
                Object.defineProperty(window, variable, {
                    get: function() { return _data[variable]; },
                    set: function(v) { _data[variable] = v; },
                    configurable: true
                });

                let dataSource = null, currentVariable = store.data[variable];
                if (store.persist) {
                    if (store.data[variable].hasOwnProperty('persist') === false || store.data[variable].persist === true) {
                        dataSource = localStorage.getItem(store.localPrefix + variable);
                        try {
                            dataSource = JSON.parse(dataSource);
                        } catch (error) {
                            // Plain strings are stored without JSON encoding — parse failure is expected
                        }
                    }
                }

                let internalValue;
                if (dataSource === null || dataSource === 'undefined') {
                    internalValue = currentVariable.default;
                } else {
                    internalValue = dataSource;
                }
                if (currentVariable.hasOwnProperty('type')) {
                    if (currentVariable.type === Array) {
                        if (typeof internalValue !== 'undefined' && Array.isArray(internalValue)) {
                            internalValue.forEach((value) => {
                                if (_data[variable] === undefined) {
                                    _data[variable] = [];
                                }
                                _data[variable].push(value);
                            });
                        } else {
                            if (store.data[variable].hasOwnProperty('default')) {
                                store.data[variable].default.forEach((item) => {
                                    _data[variable].push(item);
                                });
                            }
                        }
                    } else if (currentVariable.type === Object) {
                        Object.keys(store.data[variable].default).forEach(function (property) {
                            _data[variable][property] = internalValue[property];
                        });
                    } else {
                        _data[variable] = internalValue;
                    }
                } else {
                    _data[variable] = internalValue;
                }
            });
            updateAll();
            initializing = false;
        }

        /**
         * Execute store data field callback
         * @param variable
         */
        function executeCallBack(variable) {
            // Execute field callbacks if any
            if (typeof store.data[variable] !== 'undefined' && store.data[variable].hasOwnProperty('callBack') && store.data[variable].callBack != '') {
                store.data[variable].callBack.call(_data[variable]);
            }
        }

        /**
         * Process all directives
         */
        function updateAll() {
            elementBindings();
            elementIfs();
            elementFors();
            elementCss();
            elementClasses();
            elementAttrs();
            elementClick()
            elementUnClick()
            elementOns();
        }

        /**
         * Define s-unclick directive
         */
        function elementUnClick() {
            // Element CSS
            document.querySelectorAll("[s-unclick]").forEach((element) => {
                unclickElement(element);
            });
        }

        /**
         * Define s-click directives
         */
        function elementClick() {
            // Element CSS
            document.querySelectorAll("[s-click]").forEach((element) => {
                clickElement(element);
            });
        }

        /**
         * Define s-css directives
         */
        function elementCss() {
            // Element CSS
            document.querySelectorAll("[s-css]").forEach((element) => {
                cssElement(element);
            });
        }

        /**
         * Define s-class directives
         */
        function elementClasses() {
            document.querySelectorAll("[s-class]").forEach((element) => {
                classElement(element);
            });
        }

        /**
         * Define s-attr directives
         */
        function elementAttrs() {
            document.querySelectorAll("[s-attr]").forEach((element) => {
                attrElement(element);
            });
        }

        /**
         * Define s-for directives
         */
        function elementFors() {
            // Element FOR
            document.querySelectorAll("[s-for]").forEach((element) => {
                forElement(element);
            });
        }

        /**
         * Define s-if directives
         * Evaluate each elements s-if. display or not
         */
        function elementIfs() {
            // Element display
            document.querySelectorAll("[s-if]").forEach((element) => {
                ifElement(element);
            });
        }

        /**
         * Define s-bind directive
         * Initialize existing elements with store data directives
         */
        function elementBindings() {
            // Element bindings
            document.querySelectorAll("[s-bind]").forEach((element) => {
                setElement(element);
            });
        }

        /**
         * Set element sensible events and content
         * s-bind
         * @param element
         */
        function setElement(element) {
            switch (element.type) {
                case "select-one":
                    element.onchange = function (event) {
                        // If there is code found then process it!
                        if (hasCode(event.target.value)) {
                            try {
                                let value = getCode(`'${event.target.value}'`);
                                _data[element.attributes['s-bind'].value] = exec(value);

                            } catch (error) {
                                console.error(error.message);
                            }
                        } else {
                            _data[element.attributes['s-bind'].value] = exec(event.target.value.replace(/\+/g, ""));
                        }
                    }
                    element.value = exec(getCode(element.attributes['s-bind'].value));
                    break;
                case "radio":
                    element.onchange = function (event) {
                        _data[element.attributes['s-bind'].value] = event.target.value;
                    }
                    if (element.attributes['s-bind'].value === element.id) {
                        element.value = exec(getCode(element.attributes['s-bind'].value));
                    }
                    element.checked = _data[element.attributes['s-bind'].value] === element.value;
                    break;
                case "checkbox":
                    element.onchange = function (event) {
                        _data[element.attributes['s-bind'].value] = event.target.checked;
                    }
                    element.checked = _data[element.attributes['s-bind'].value];
                    break;
                case "text":
                case "email":
                case "textarea":
                    var senser = 'onkeyup';
                    if (element.attributes['s-blur'] && element.attributes['s-blur'].value === "") {
                        senser = 'onblur';
                    }
                    var handler = function (event) {
                        if (event.target.value === _data[element.attributes['s-bind'].value]) return;
                        _data[element.attributes['s-bind'].value] = event.target.value;
                    };
                    var debounceMs = element.getAttribute('s-debounce');
                    element[senser] = debounceMs ? debounce(handler, parseInt(debounceMs, 10)) : handler;
                    element.value = exec(getCode(element.attributes['s-bind'].value));
                    break;
                case "number":
                case "range":
                case "color":
                case "date":
                case "datetime-local":
                    element.oninput = function (event) {
                        _data[element.attributes['s-bind'].value] = event.target.value;
                    };
                    element.value = exec(getCode(element.attributes['s-bind'].value));
                    break;
                case undefined:
                    if (element.getAttribute('contenteditable') === 'true') {
                        if (!element._sContentEditableBound) {
                            element._sContentEditableBound = true;
                            element.addEventListener('input', function() {
                                _data[element.attributes['s-bind'].value] = element.innerText;
                            });
                        }
                        var ceVal = _data[element.attributes['s-bind'].value];
                        if (ceVal !== undefined && element.innerText !== ceVal + '') {
                            element.innerText = ceVal;
                        }
                        break;
                    }
                    switch (element.tagName) {
                        case "IMG":
                            let srcCode = element.attributes['s-bind'].value;
                            try {
                                let image = exec(srcCode);
                                if (image) {
                                    element.src = image;
                                    // The only way I could set this.
                                    if (element.id === "") {
                                        element.id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
                                    }
                                    document.getElementById(element.id).src = image;
                                }
                                return;
                            } catch (error) {
                                return;
                            }
                    }
                    if (!element.hasOwnProperty('originalInnerHTML')) {
                        element.originalInnerHTML = element.innerHTML;
                    }
                    if (element.originalInnerHTML !== '') {
                        if (hasCode(element.originalInnerHTML)) {
                            try {
                                let codeResult = exec(getCode(`'${element.originalInnerHTML}'`));
                                switch (element.tagName) {
                                    default:
                                        element.innerHTML = codeResult;
                                        break;
                                }
                                break;

                            } catch (error) {
                                console.error(error.message);
                            }
                        }
                    }
                    element.innerHTML = _data[element.attributes['s-bind'].value];
                    break;
            }
        }

        /**
         * Process Elements directives
         * @param variable
         */
        function processElements(variable) {
            // Find computed properties that depend on the changed variable
            var varsToCheck = [variable];
            Object.keys(store.data).forEach(function(key) {
                if (store.data[key].hasOwnProperty('computed') && store.data[key].computed.indexOf(variable) >= 0) {
                    varsToCheck.push(key);
                }
            });

            function matches(attrValue, innerHTML) {
                for (var i = 0; i < varsToCheck.length; i++) {
                    if (attrValue.indexOf(varsToCheck[i]) >= 0) return true;
                    if (innerHTML && innerHTML.indexOf(varsToCheck[i]) >= 0) return true;
                }
                return false;
            }

            document.querySelectorAll("[s-bind]").forEach((element) => {
                if (matches(element.getAttribute('s-bind'), element.innerHTML)) {
                    setElement(element);
                }
            });

            document.querySelectorAll("[s-for]").forEach((element) => {
                if (matches(element.getAttribute('s-for'), element.innerHTML)) {
                    forElement(element);
                }
            });

            document.querySelectorAll("[s-if]").forEach((element) => {
                if (matches(element.getAttribute('s-if'), element.innerHTML)) {
                    ifElement(element);
                }
            });

            document.querySelectorAll("[s-css]").forEach((element) => {
                if (matches(element.getAttribute('s-css'), element.innerHTML)) {
                    cssElement(element);
                }
            });

            document.querySelectorAll("[s-class]").forEach((element) => {
                if (matches(element.getAttribute('s-class'))) {
                    classElement(element);
                }
            });

            document.querySelectorAll("[s-attr]").forEach((element) => {
                if (matches(element.getAttribute('s-attr'))) {
                    attrElement(element);
                }
            });
            executeCallBack(variable);
        }

        /**
         * Set elements click away behavior
         */
        const _unclickElements = new Set();
        let _unclickListenerSet = false;
        function _ensureUnclickListener() {
            if (_unclickListenerSet) return;
            _unclickListenerSet = true;
            document.addEventListener('click', function(event) {
                _unclickElements.forEach(function(el) {
                    if (!el.contains(event.target)) {
                        try { exec(el.getAttribute('s-unclick')); } catch (e) { console.error(e.message); }
                    }
                });
            });
        }
        function unclickElement(element) {
            _ensureUnclickListener();
            _unclickElements.add(element);
        }

        /**
         * Set elements click behavior
         */
        function clickElement(element) {
            if (element._sClickBound) return;
            element._sClickBound = true;
            element.addEventListener('click', function() {
                try { exec(element.getAttribute('s-click')); } catch (e) { console.error(e.message); }
            });
        }

        /**
         * Set elements sensible visibility
         */
        function ifElement(element) {
            try {
                const display = exec(element.getAttribute('s-if'));
                if (!element.hasOwnProperty('originalDisplay')) {
                    // Preserve original display
                    element.originalDisplay = element.style.display;
                }
                element.style.display = display ? (element.originalDisplay || '') : 'none';
            } catch (error) {
                console.error(error.message);
            }
        }

        /**
         * Set elements sensible appearance
         */
        function cssElement(element) {
            try {
                element.getAttribute('s-css').split(';').forEach(function (style) {
                    //Object.assign(element.style, new Function(`return {"${style.split(':')[0].trim()}":${style.split(':')[1].trim()}}`)());
                    let cssAttribute = style.substring(0, style.indexOf(':')).trim()
                    let code = exec("'" + getCode(style.substring(style.indexOf(':') + 1)) + "'").trim();
                    if (code.indexOf('${') >= 0) {
                        code = exec(code);
                    }
                    if (_data[code] === undefined) {
                        code = "'" + code + "'";
                    }
                    Object.assign(element.style, exec(`{"${cssAttribute}":${code}}`));
                });
            } catch (error) {
                console.error(error.message);
            }
        }

        /**
         * Toggle CSS classes based on expressions
         */
        function classElement(element) {
            try {
                element.getAttribute('s-class').split(';').forEach(function (pair) {
                    if (!(pair = pair.trim())) return;
                    var cls = pair.substring(0, pair.indexOf(':')).trim();
                    var expr = pair.substring(pair.indexOf(':') + 1).trim();
                    element.classList.toggle(cls, !!exec(expr));
                });
            } catch (error) {
                console.error(error.message);
            }
        }

        /**
         * Set HTML attributes based on expressions
         */
        function attrElement(element) {
            try {
                element.getAttribute('s-attr').split(';').forEach(function (pair) {
                    if (!(pair = pair.trim())) return;
                    var attr = pair.substring(0, pair.indexOf(':')).trim();
                    var expr = pair.substring(pair.indexOf(':') + 1).trim();
                    var val = exec(expr);
                    if (val === false || val === null || val === undefined) {
                        element.removeAttribute(attr);
                    } else if (val === true) {
                        element.setAttribute(attr, '');
                    } else {
                        element.setAttribute(attr, val);
                    }
                });
            } catch (error) {
                console.error(error.message);
            }
        }

        /**
         * Define s-on directives
         */
        function elementOns() {
            document.querySelectorAll("[s-on]").forEach((element) => {
                onElement(element);
            });
        }

        /**
         * Bind general DOM events with modifiers
         */
        function onElement(element) {
            if (element._sOnBound) return;
            element._sOnBound = true;
            element.getAttribute('s-on').split(';').forEach(function (binding) {
                if (!(binding = binding.trim())) return;
                var eventPart = binding.substring(0, binding.indexOf(':')).trim();
                var expr = binding.substring(binding.indexOf(':') + 1).trim();
                var parts = eventPart.split('.');
                var eventName = parts[0];
                var modifiers = parts.slice(1);
                element.addEventListener(eventName, function (event) {
                    if (modifiers.indexOf('prevent') >= 0) event.preventDefault();
                    if (modifiers.indexOf('stop') >= 0) event.stopPropagation();
                    if (modifiers.indexOf('enter') >= 0 && event.key !== 'Enter') return;
                    if (modifiers.indexOf('escape') >= 0 && event.key !== 'Escape') return;
                    try { exec(expr); } catch (e) { console.error(e.message); }
                });
            });
        }

        /**
         * Evaluate a template expression with a loop item in scope
         */
        function execForItem(expression, itemVar, item, index) {
            var keys = Object.keys(store.data);
            var paramNames = keys.concat([itemVar, 'index']);
            var paramVals = keys.map(function(k) { return _data[k]; }).concat([item, index]);
            var fn = new Function(paramNames.join(','), '"use strict";' + _blocked + 'return ' + expression + ';');
            return fn.apply(null, paramVals);
        }

        /**
         * Process s-for directive with keyed reconciliation
         */
        function forElement(element) {
            try {
                let templateElement;
                let parentElement;

                if (element.hasOwnProperty('templateElement')) {
                    templateElement = element.templateElement;
                    parentElement = element;
                } else if (element.parentElement && !element.parentElement.hasOwnProperty('originalNode')) {
                    parentElement = element.parentElement;
                    parentElement.templateElement = element.cloneNode(true);
                    parentElement.setAttribute('s-for', element.getAttribute('s-for'));
                    parentElement.setAttribute('s-key', element.getAttribute('s-key'));
                    templateElement = parentElement.templateElement;
                    element.parentElement.removeChild(element);
                } else {
                    return;
                }

                let forAttr = templateElement.getAttribute('s-for');
                let keyAttr = templateElement.getAttribute('s-key');
                if (templateElement.innerHTML === '' || !hasCode(templateElement.innerHTML)) return;

                // Parse "item of collection"
                let parts = forAttr.split(/\s+of\s+/);
                let itemVar = parts[0].trim();
                let collectionName = parts[1].trim();
                let collection = _data[collectionName];
                if (!collection || !Array.isArray(collection)) return;

                // Prepare template expression
                let innerHTML = getCode(templateElement.innerHTML);
                if (innerHTML.indexOf('s-src') >= 0) {
                    innerHTML = innerHTML.replace('s-src', 'src');
                }
                let contentExpr = getCode("'" + innerHTML + "'");

                // Prepare value expression for OPTION tags
                let valueExpr = null;
                if (templateElement.tagName === 'OPTION') {
                    let code = getCode(templateElement.value);
                    if (code && code.length > 1) {
                        valueExpr = getCode("'" + getCode(templateElement.value) + "'");
                    }
                }

                // Key function: use s-key attribute or fall back to index
                function getKey(item, index) {
                    if (!keyAttr) return String(index);
                    let prop = keyAttr.replace(itemVar + '.', '');
                    return String(item[prop]);
                }

                // Map existing children by key
                let existingByKey = new Map();
                Array.from(parentElement.children).forEach(function(child) {
                    let key = child.getAttribute('s-key-value');
                    if (key !== null) existingByKey.set(key, child);
                });

                // Build new children list with reconciliation
                let newChildren = [];
                let usedKeys = new Set();
                collection.forEach(function(item, index) {
                    let key = getKey(item, index);
                    usedKeys.add(key);
                    let el = existingByKey.get(key);

                    // Evaluate content for this item
                    let content;
                    try {
                        content = execForItem(contentExpr, itemVar, item, index);
                    } catch (e) {
                        console.error(e.message);
                        return;
                    }

                    if (el) {
                        // Reuse existing element, update content
                        el.innerHTML = content;
                        el.setAttribute('s-key-value', key);
                    } else {
                        // Create new element from template
                        el = templateElement.cloneNode(true);
                        el.removeAttribute('s-for');
                        el.removeAttribute('s-key');
                        el.innerHTML = content;
                        el.setAttribute('s-key-value', key);
                    }

                    if (valueExpr) {
                        try { el.value = execForItem(valueExpr, itemVar, item, index); } catch(e) {}
                    }

                    newChildren.push(el);
                });

                // Remove elements whose keys are no longer present
                existingByKey.forEach(function(el, key) {
                    if (!usedKeys.has(key)) parentElement.removeChild(el);
                });

                // Append in correct order (appendChild moves existing nodes)
                newChildren.forEach(function(child) {
                    parentElement.appendChild(child);
                });

            } catch (error) {
                console.error(error.message);
            }
        }

        /**
         * Verify that the value contains code
         * @param value
         * @returns {boolean}
         */
        function hasCode(value) {
            return value.indexOf('{') !== -1 && value.indexOf('}') !== -1;
        }

        /**
         * Get the code from the value
         * @param value
         * @returns {string}
         */
        function getCode(value) {
            return value.replace(/{/g, "' + ").replace(/}/g, " + '").replace(/(\r\n|\n|\r)/gm, "");
        }

        /**
         * Execute code and return result
         * Dangerous globals are shadowed to prevent XSS via injected expressions
         * @param value
         * @returns {*}
         */
        var _blocked = 'var document=void 0,window=void 0,self=void 0,globalThis=void 0,' +
            'fetch=void 0,XMLHttpRequest=void 0,Function=void 0,' +
            'importScripts=void 0,setTimeout=void 0,setInterval=void 0;';
        function exec(value) {
            return new Function('"use strict";' + _blocked + 'return ' + value + ';')();
        }

        /**
         * Code by Blaize Stewart, Aug 7, 2019
         * @param a
         * @constructor
         */
        function ArrayObserver(a) {
            let _this = this;
            this.observers = [];

            this.Observe = function (notifyCallback) {
                _this.observers.push(notifyCallback);
            }
            try {
                a.push = function (obj) {
                    let push = Array.prototype.push.apply(a, arguments);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](obj, "push");
                    return push;
                }

                a.concat = function (obj) {
                    let concat = Array.prototype.concat.apply(a, obj);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](concat, "concat");
                    return concat;
                }

                a.pop = function () {
                    let popped = Array.prototype.pop.apply(a, arguments);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](popped, "pop");
                    return popped;
                }

                a.reverse = function () {
                    let result = Array.prototype.reverse.apply(a, arguments);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](result, "reverse");
                    return result;
                };

                a.shift = function () {
                    let deleted_item = Array.prototype.shift.apply(a, arguments);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](deleted_item, "shift");
                    return deleted_item;
                };

                a.sort = function () {
                    let result = Array.prototype.sort.apply(a, arguments);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](result, "sort");
                    return result;
                };

                a.splice = function (i, length, ...items) {
                    let returnObj = Array.prototype.splice.apply(a, [i, length, ...items]);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](returnObj, "splice");
                    return returnObj;
                };

                a.unshift = function () {
                    let new_length = Array.prototype.unshift.apply(a, arguments);
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](new_length, "unshift");
                    return arguments;
                };

            } catch (error) {
                console.log(error);
            }
        }

        /**
         * Original Code by Blaize Stewart, Aug 7, 2019
         * @param o
         * @param property
         * @constructor
         */
        function Observer(o, property, obj) {
            let _this = this;
            let _obj = obj;
            this.observers = [];

            this.Observe = function (notifyCallback) {
                _this.observers.push(notifyCallback);
            }

            Object.defineProperty(o, property, {
                set: function (value) {
                    _this.value = value;
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](value);
                    let effective = _obj !== false ? _obj : property;
                    if (store.persist) {
                        if (!store.data[effective].hasOwnProperty('persist') || store.data[effective].persist === true) {
                            if (typeof value == 'object') {
                                localStorage.setItem(store.localPrefix + effective + '.' + property, JSON.stringify(value));
                            } else {
                                localStorage.setItem(store.localPrefix + property, value);
                            }
                        }
                    }
                },
                get: function () {
                    return _this.value;
                }
            });
        }

        // Taken from @stimulus:
        function domReady() {
            return new Promise(resolve => {
                if (document.readyState == "loading") {
                    document.addEventListener("DOMContentLoaded", resolve);
                } else {
                    resolve();
                }
            });
        }

        function debounce(fn, delay) {
            var timer;
            return function() {
                var args = arguments, ctx = this;
                clearTimeout(timer);
                timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
            };
        }

        var _data = {};

        const storeTemplate = {
            persist: true,
            localPrefix: '__',
            data: {},
        };

        /**
         * Initiate s-data recognition and add it to store.
         */
        function getData(store) {
            for (let variable of document.querySelectorAll('[s-data]')) {
                const attribute = variable.getAttribute('s-data');
                const data = attribute === '' ? {} : attribute;
                const dataObjects = exec(`${data}`);
                Object.assign(store.data, dataObjects);
            }
        }

        /**
         * Initiate callbacks recognition.
         */
        function processCallbacks(store) {
            for (let variable of document.querySelectorAll('[s-bind]')) {
                let variableName = variable.getAttribute('s-bind');
                if (variable.getAttribute('s-callback') !== null) {
                    store.data[variableName]['callBack'] = new Function('"use strict";' + _blocked + variable.getAttribute('s-callback'));
                }
            }
        }

        /**
         * Initiate existing id recognition.
         */
        function getVariables(store) {
            for (let variable of document.querySelectorAll('[s-bind]')) {
                let variableName = variable.getAttribute('s-bind');
                if (variable.type === 'select-one') {
                    let dataSource = variable.getAttribute('s-data');
                    if (dataSource !== null) {
                        _data[dataSource] = [];
                        Array.from(variable.options).forEach(function(option) {
                            _data[dataSource].push({id: option.value, value: option.text})
                        });
                    }
                    store.data[variableName] = {};
                    store.data[variableName].type = String;
                }
                else if (variableName.indexOf('[') >= 0) {
                    variableName = variableName.replace('[', '').replace(']', '');
                    store.data[variableName] = {};
                    store.data[variableName].type = Array;
                } else if (variableName.indexOf('{') >= 0) {
                    variableName = variableName.replace('{', '').replace('}', '');
                    store.data[variableName] = {};
                    store.data[variableName].type = Object;
                }
                if (!store.data.hasOwnProperty(variableName)) {
                    store.data[variableName] = {};
                    store.data[variableName].type = String;
                    if (variable.hasOwnProperty('value')) {
                        store.data[variableName].default = variable.value;
                    } else if (variable.getAttribute('value')) {
                        store.data[variableName].default = variable.getAttribute('value');
                    } else {
                        store.data[variableName].default = '';
                    }
                }
                if (variable.getAttribute('s-callback') !== null) {
                    store.data[variableName].callBack = new Function('"use strict";' + _blocked + variable.getAttribute('s-callback'));
                }
            }
        }

        // Check if we are being run inside a browser.
        if (typeof navigator !== 'undefined' && !(navigator.userAgent.includes("Node.js") || navigator.userAgent.includes("jsdom"))) {
            if (typeof store === 'undefined') {
                window.store = storeTemplate;
                console.log('Store not defined.')
                return init(storeTemplate);
            }
            return init(store);
        }

        // Export internals for testing
        return {
            init: init,
            exec: exec,
            hasCode: hasCode,
            getCode: getCode,
            Observer: Observer,
            ArrayObserver: ArrayObserver,
            storeTemplate: storeTemplate,
            debounce: debounce,
            _data: _data
        };
    }
)));