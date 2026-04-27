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

            var initializing = true;
            var _pendingUpdates = {};
            var _rafScheduled = false;
            function scheduleUpdate(variable) {
                _pendingUpdates[variable] = true;
                if (!_rafScheduled) {
                    _rafScheduled = true;
                    requestAnimationFrame(function() {
                        _rafScheduled = false;
                        var vars = Object.keys(_pendingUpdates);
                        _pendingUpdates = {};
                        for (var i = 0; i < vars.length; i++) {
                            processElements(vars[i]);
                        }
                    });
                }
            }
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
                            scheduleUpdate(variable);
                        }
                    });
                } else if (store.data[variable].hasOwnProperty('type') && store.data[variable].type === Object) {
                    const observer = new Observer(_data, variable, variable);
                    observer.Observe(function (value) {
                        if (!initializing) {
                            scheduleUpdate(variable);
                        }
                    })
                    _data[variable] = {};
                    Object.keys(store.data[variable].default).forEach(function (property) {
                        const observer = new Observer(_data[variable], property, variable);
                        observer.Observe(function (value) {
                            if (!initializing) {
                                scheduleUpdate(variable);
                            }
                        })
                    });
                } else {
                    const observer = new Observer(_data, variable, false);
                    observer.Observe(function (value) {
                        if (!initializing) {
                            scheduleUpdate(variable);
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
            // Collect s-ref elements
            document.querySelectorAll('[s-ref]').forEach(function(el) {
                $refs[el.getAttribute('s-ref')] = el;
            });

            updateAll();
            initializing = false;

            // Seed previous values for watchers
            Object.keys(store.data).forEach(function(key) {
                if (store.data[key].hasOwnProperty('watch')) {
                    _previousValues[key] = typeof _data[key] === 'object'
                        ? JSON.parse(JSON.stringify(_data[key]))
                        : _data[key];
                }
            });

            // Remove s-cloak after initialization to reveal hidden elements
            document.querySelectorAll('[s-cloak]').forEach(function(el) {
                el.removeAttribute('s-cloak');
            });

            // Execute lifecycle hook
            if (typeof store.onInit === 'function') {
                store.onInit(_data);
            }
        }

        /**
         * Execute watchers for a variable
         * @param variable
         */
        var _previousValues = {};
        function executeWatcher(variable) {
            if (typeof store.data[variable] === 'undefined') return;
            if (store.data[variable].hasOwnProperty('watch') && typeof store.data[variable].watch === 'function') {
                var newVal = _data[variable];
                var oldVal = _previousValues[variable];
                store.data[variable].watch(newVal, oldVal);
            }
            _previousValues[variable] = typeof _data[variable] === 'object'
                ? JSON.parse(JSON.stringify(_data[variable]))
                : _data[variable];
        }

        /**
         * Process all directives
         */
        // Elements inside s-for are handled by processForDirectives — skip them in global processors
        // Checks both rendered s-for children ([s-key-value]) and unprocessed s-for templates ([s-for])
        function insideFor(el) { return el.closest('[s-key-value]') !== null || el.closest('[s-for]') !== null; }

        function updateAll() {
            elementBindings();
            elementTexts();
            elementHtmls();
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
                if (!insideFor(element)) cssElement(element);
            });
        }

        /**
         * Define s-class directives
         */
        function elementClasses() {
            document.querySelectorAll("[s-class]").forEach((element) => {
                if (!insideFor(element)) classElement(element);
            });
        }

        /**
         * Define s-attr directives
         */
        function elementAttrs() {
            document.querySelectorAll("[s-attr]").forEach((element) => {
                if (!insideFor(element)) attrElement(element);
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
                if (!insideFor(element)) ifElement(element);
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
         * Define s-text directives — sets textContent from an expression
         */
        function elementTexts() {
            document.querySelectorAll("[s-text]").forEach(function(element) {
                if (insideFor(element)) return;
                try {
                    element.textContent = exec(element.getAttribute('s-text'));
                } catch (error) {
                    console.error(error.message);
                }
            });
        }

        /**
         * Define s-html directives — sets innerHTML from an expression
         */
        function elementHtmls() {
            document.querySelectorAll("[s-html]").forEach(function(element) {
                if (insideFor(element)) return;
                try {
                    element.innerHTML = exec(element.getAttribute('s-html'));
                } catch (error) {
                    console.error(error.message);
                }
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
                            _data[element.attributes['s-bind'].value] = event.target.value;
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
                if (insideFor(element)) return;
                if (matches(element.getAttribute('s-if'), element.innerHTML)) {
                    ifElement(element);
                }
            });

            document.querySelectorAll("[s-css]").forEach((element) => {
                if (insideFor(element)) return;
                if (matches(element.getAttribute('s-css'), element.innerHTML)) {
                    cssElement(element);
                }
            });

            document.querySelectorAll("[s-class]").forEach((element) => {
                if (insideFor(element)) return;
                if (matches(element.getAttribute('s-class'))) {
                    classElement(element);
                }
            });

            document.querySelectorAll("[s-attr]").forEach((element) => {
                if (insideFor(element)) return;
                if (matches(element.getAttribute('s-attr'))) {
                    attrElement(element);
                }
            });

            document.querySelectorAll("[s-text]").forEach((element) => {
                if (insideFor(element)) return;
                if (matches(element.getAttribute('s-text'))) {
                    try { element.textContent = exec(element.getAttribute('s-text')); } catch (e) { console.error(e.message); }
                }
            });

            document.querySelectorAll("[s-html]").forEach((element) => {
                if (insideFor(element)) return;
                if (matches(element.getAttribute('s-html'))) {
                    try { element.innerHTML = exec(element.getAttribute('s-html')); } catch (e) { console.error(e.message); }
                }
            });

            executeWatcher(variable);
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
                setTimeout(function() {
                    _unclickElements.forEach(function(el) {
                        if (!el.contains(event.target)) {
                            try { exec(el.getAttribute('s-unclick')); } catch (e) { console.error(e.message); }
                        }
                    });
                }, 0);
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
                var display = exec(element.getAttribute('s-if'));
                if (!element.hasOwnProperty('originalDisplay')) {
                    element.originalDisplay = element.style.display;
                }

                var transition = element.getAttribute('s-transition');
                if (transition !== null) {
                    var prefix = transition || 's';
                    if (!element._sTransitionInit) {
                        // Initial render — apply state without animation
                        element.style.display = display ? (element.originalDisplay || '') : 'none';
                    } else if (display && element.style.display === 'none') {
                        // Enter transition
                        element.style.display = element.originalDisplay || '';
                        element.classList.remove(prefix + '-leave-active', prefix + '-leave-to');
                        element.classList.add(prefix + '-enter');
                        // Force reflow so the browser registers the starting state
                        void element.offsetHeight;
                        element.classList.remove(prefix + '-enter');
                        element.classList.add(prefix + '-enter-active', prefix + '-enter-to');
                        element.addEventListener('transitionend', function handler() {
                            element.classList.remove(prefix + '-enter-active', prefix + '-enter-to');
                            element.removeEventListener('transitionend', handler);
                        });
                    } else if (!display && element.style.display !== 'none') {
                        // Leave transition
                        element.classList.remove(prefix + '-enter-active', prefix + '-enter-to');
                        element.classList.add(prefix + '-leave');
                        void element.offsetHeight;
                        element.classList.remove(prefix + '-leave');
                        element.classList.add(prefix + '-leave-active', prefix + '-leave-to');
                        element.addEventListener('transitionend', function handler() {
                            element.classList.remove(prefix + '-leave-active', prefix + '-leave-to');
                            element.style.display = 'none';
                            element.removeEventListener('transitionend', handler);
                        });
                    }
                    element._sTransitionInit = true;
                } else {
                    element.style.display = display ? (element.originalDisplay || '') : 'none';
                }
            } catch (error) {
                console.error(error.message);
            }
        }

        /**
         * Apply enter transition to an element rendered inside an s-for.
         * Element must already be in the DOM at its final position.
         */
        function applyForEnter(el, prefix) {
            el.classList.remove(prefix + '-leave-active', prefix + '-leave-to');
            el.classList.add(prefix + '-enter');
            void el.offsetHeight;
            el.classList.remove(prefix + '-enter');
            el.classList.add(prefix + '-enter-active', prefix + '-enter-to');
            function handler(e) {
                if (e.target !== el) return;
                el.classList.remove(prefix + '-enter-active', prefix + '-enter-to');
                el.removeEventListener('transitionend', handler);
            }
            el.addEventListener('transitionend', handler);
        }

        /**
         * Apply leave transition to an element rendered inside an s-for.
         * Captures current height so a CSS max-height transition collapses
         * smoothly from the natural size to 0. Removes the node when done.
         */
        function applyForLeave(el, prefix) {
            if (el._sLeaving) return;
            el._sLeaving = true;
            var height = el.offsetHeight;
            el.style.maxHeight = height + 'px';
            el.style.overflow = 'hidden';
            void el.offsetHeight;
            el.classList.remove(prefix + '-enter-active', prefix + '-enter-to');
            el.classList.add(prefix + '-leave-active', prefix + '-leave-to');
            // Inline override so the transition has an explicit target value
            // even if the user's CSS class doesn't set max-height.
            requestAnimationFrame(function() { el.style.maxHeight = '0px'; });
            var done = false;
            function finish() {
                if (done) return;
                done = true;
                el.removeEventListener('transitionend', onEnd);
                if (el.parentElement) el.parentElement.removeChild(el);
            }
            function onEnd(e) { if (e.target === el) finish(); }
            el.addEventListener('transitionend', onEnd);
            // Safety net: if no transition fires (no matching CSS), still clean up.
            setTimeout(finish, 700);
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
                    if (/^on/i.test(attr)) return; // Block event handler attributes
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
        var _forFnCache = {};
        function execForItem(expression, itemVar, item, index) {
            if (_dangerous.test(expression)) throw new Error('Blocked: unsafe expression');
            _validateBrackets(expression);
            var cacheKey = expression + '|' + itemVar;
            var fn = _forFnCache[cacheKey];
            if (!fn) {
                var keys = Object.keys(store.data);
                var paramNames = keys.concat([itemVar, 'index']);
                fn = new Function(paramNames.join(','), '"use strict";' + _blocked + 'return ' + expression + ';');
                _forFnCache[cacheKey] = fn;
            }
            var keys = Object.keys(store.data);
            var paramVals = keys.map(function(k) { return _data[k]; }).concat([item, index]);
            return fn.apply(null, paramVals);
        }

        /**
         * Process directives on elements rendered inside s-for loops.
         * Uses execForItem so loop variables (e.g. "item") are in scope.
         */
        function processForDirectives(el, itemVar, item, index) {
            // s-text
            el.querySelectorAll('[s-text]').forEach(function(child) {
                try { child.textContent = execForItem(child.getAttribute('s-text'), itemVar, item, index); } catch(e) { console.error(e.message); }
            });
            // s-html
            el.querySelectorAll('[s-html]').forEach(function(child) {
                try { child.innerHTML = execForItem(child.getAttribute('s-html'), itemVar, item, index); } catch(e) { console.error(e.message); }
            });
            // s-if
            el.querySelectorAll('[s-if]').forEach(function(child) {
                try {
                    var display = !!execForItem(child.getAttribute('s-if'), itemVar, item, index);
                    if (!child.hasOwnProperty('originalDisplay')) child.originalDisplay = child.style.display;
                    child.style.display = display ? (child.originalDisplay || '') : 'none';
                } catch(e) { console.error(e.message); }
            });
            // s-class
            el.querySelectorAll('[s-class]').forEach(function(child) {
                try {
                    child.getAttribute('s-class').split(';').forEach(function(pair) {
                        if (!(pair = pair.trim())) return;
                        var cls = pair.substring(0, pair.indexOf(':')).trim();
                        var expr = pair.substring(pair.indexOf(':') + 1).trim();
                        if (execForItem(expr, itemVar, item, index)) child.classList.add(cls);
                        else child.classList.remove(cls);
                    });
                } catch(e) { console.error(e.message); }
            });
            // s-attr
            el.querySelectorAll('[s-attr]').forEach(function(child) {
                try {
                    child.getAttribute('s-attr').split(';').forEach(function(pair) {
                        if (!(pair = pair.trim())) return;
                        var attr = pair.substring(0, pair.indexOf(':')).trim();
                        if (/^on/i.test(attr)) return;
                        var expr = pair.substring(pair.indexOf(':') + 1).trim();
                        var val = execForItem(expr, itemVar, item, index);
                        if (val === false || val === null || val === undefined) child.removeAttribute(attr);
                        else if (val === true) child.setAttribute(attr, '');
                        else child.setAttribute(attr, val);
                    });
                } catch(e) { console.error(e.message); }
            });
            // s-css
            el.querySelectorAll('[s-css]').forEach(function(child) {
                try {
                    child.getAttribute('s-css').split(';').forEach(function(style) {
                        if (!(style = style.trim())) return;
                        var cssAttr = style.substring(0, style.indexOf(':')).trim();
                        var valExpr = "'" + getCode(style.substring(style.indexOf(':') + 1)) + "'";
                        var code = String(execForItem(valExpr, itemVar, item, index)).trim();
                        if (_data[code] === undefined) code = "'" + code + "'";
                        Object.assign(child.style, exec('{"' + cssAttr + '":' + code + '}'));
                    });
                } catch(e) { console.error(e.message); }
            });
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
                if (templateElement.innerHTML === '') return;
                var hasDirectives = hasCode(templateElement.innerHTML) ||
                    templateElement.querySelector('[s-text],[s-html],[s-if],[s-class],[s-attr],[s-css],[s-bind]') !== null;
                if (!hasDirectives) return;

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

                // Optional s-transition on the s-for template — animates each
                // item as it's added to or removed from the visible collection.
                let transitionPrefix = templateElement.getAttribute('s-transition');

                // Map existing children by key. Skip elements that are mid-leave
                // so they don't get matched against incoming items.
                let existingByKey = new Map();
                Array.from(parentElement.children).forEach(function(child) {
                    if (child._sLeaving) return;
                    let key = child.getAttribute('s-key-value');
                    if (key !== null) existingByKey.set(key, child);
                });

                // Build new children list with reconciliation
                let newChildren = [];
                let pendingEnter = [];
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
                        if (transitionPrefix) el.removeAttribute('s-transition');
                        el.innerHTML = content;
                        el.setAttribute('s-key-value', key);
                        if (transitionPrefix) pendingEnter.push(el);
                    }

                    if (valueExpr) {
                        try { el.value = execForItem(valueExpr, itemVar, item, index); } catch(e) {}
                    }

                    // Process directives on rendered children (s-text, s-if, s-class, s-attr, s-css, s-html)
                    processForDirectives(el, itemVar, item, index);

                    newChildren.push(el);
                });

                // Remove (or transition out) elements whose keys are no longer present
                existingByKey.forEach(function(el, key) {
                    if (usedKeys.has(key)) return;
                    if (transitionPrefix) applyForLeave(el, transitionPrefix);
                    else parentElement.removeChild(el);
                });

                // Reorder kept children. With transitions active, walk the DOM
                // and use insertBefore so leaving siblings stay in their slot.
                // Without transitions, appendChild is fine — it moves nodes.
                if (transitionPrefix) {
                    var cursor = parentElement.firstChild;
                    for (var i = 0; i < newChildren.length; i++) {
                        var target = newChildren[i];
                        while (cursor && cursor._sLeaving) cursor = cursor.nextSibling;
                        if (cursor !== target) {
                            parentElement.insertBefore(target, cursor);
                        } else {
                            cursor = cursor.nextSibling;
                        }
                    }
                } else {
                    newChildren.forEach(function(child) {
                        parentElement.appendChild(child);
                    });
                }

                // Run enter transitions after DOM ops settle so initial classes
                // are applied while the element is at its final position.
                if (transitionPrefix && pendingEnter.length) {
                    pendingEnter.forEach(function(el) { applyForEnter(el, transitionPrefix); });
                }

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
            'importScripts=void 0,setTimeout=void 0,setInterval=void 0,' +
            'Proxy=void 0,Reflect=void 0;';
        var _dangerous = /(\bconstructor\b|__proto__|getOwnPropertyDescriptor|defineProperty|getPrototypeOf|\beval\b|\bprototype\b)/;
        /**
         * Validate bracket notation used as property access (not array literals).
         * Blocks computed property access like obj["con"+"structor"], obj[atob(...)], etc.
         * Allows: arr[0], obj['key'], obj[variable], and array literals like [1,2,3].
         */
        function _validateBrackets(value) {
            // Match bracket access preceded by an identifier, closing paren, closing bracket, or quote
            // This distinguishes property access from array literals
            var bracketAccessRe = /(?:[\w$\)\]'"])\s*\[([^\[\]]*)\]/g;
            var match;
            while ((match = bracketAccessRe.exec(value)) !== null) {
                var inner = match[1].trim();
                // Allow: numbers, simple quoted strings, simple identifiers, identifier.property
                if (/^(\d+|'[^']*'|"[^"]*"|[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*)$/.test(inner)) continue;
                throw new Error('Blocked: unsafe bracket expression');
            }
        }
        var _fnCache = {};
        function exec(value) {
            if (_dangerous.test(value)) throw new Error('Blocked: unsafe expression');
            _validateBrackets(value);
            var fn = _fnCache[value];
            if (!fn) {
                fn = new Function('$refs', '"use strict";' + _blocked + 'return ' + value + ';');
                _fnCache[value] = fn;
            }
            return fn($refs);
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
            this.observers = [];

            this.Observe = function (notifyCallback) {
                _this.observers.push(notifyCallback);
            }

            // Pre-compute persist decision at creation time (not on every set)
            let _effective = obj !== false ? obj : property;
            let _shouldPersist = false;
            let _persistKey, _persistObjPrefix;
            if (store.persist && store.data[_effective] &&
                (!store.data[_effective].hasOwnProperty('persist') || store.data[_effective].persist === true)) {
                _shouldPersist = true;
                _persistKey = store.localPrefix + property;
                _persistObjPrefix = store.localPrefix + _effective + '.' + property;
            }

            Object.defineProperty(o, property, {
                set: function (value) {
                    _this.value = value;
                    for (let i = 0; i < _this.observers.length; i++) _this.observers[i](value);
                    if (_shouldPersist) {
                        if (typeof value == 'object') {
                            localStorage.setItem(_persistObjPrefix, JSON.stringify(value));
                        } else {
                            localStorage.setItem(_persistKey, value);
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
        var $refs = {};

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
                Object.keys(dataObjects).forEach(function(key) {
                    var val = dataObjects[key];
                    var type = Array.isArray(val) ? Array
                        : val !== null && typeof val === 'object' ? Object
                        : typeof val === 'boolean' ? Boolean
                        : typeof val === 'number' ? Number
                        : String;
                    store.data[key] = { type: type, default: val };
                });
            }
        }

        /**
         * Initiate callbacks recognition.
         */
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
