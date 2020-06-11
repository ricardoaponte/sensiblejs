'use strict';

function sensible(store) {

    init(store);

    function init(store) {

        // New feature, needs documentation
        getVariables(store);

        let initializing = true;
        Object.keys(store.data).forEach(function (variable) {
            if (store.data[variable].hasOwnProperty('type') && store.data[variable].type === Array) {
                if (window[variable] === undefined) {
                    window[variable] = [];
                }
                let arrayObserver = new ArrayObserver(window[variable])
                arrayObserver.Observe(function (result, method) {
                    if (store.persist) {
                        if ((store.data[variable].hasOwnProperty('persist') && store.data[variable].persist !== false)) {
                            localStorage.setItem(store.localPrefix + variable, JSON.stringify(window[variable]));
                        }
                    }
                    if (!initializing) {
                        processElements(variable);
                    }
                });
            } else if (store.data[variable].hasOwnProperty('type') && store.data[variable].type === Object) {
                window[variable] = {};
                const observer = new Observer(window, variable, variable);
                observer.Observe(function (value) {
                    if (!initializing) {
                        processElements(variable);
                    }
                })
                Object.keys(store.data[variable].default).forEach(function (property) {
                    window[variable] = {};
                    const observer = new Observer(window[variable], property, variable);
                    observer.Observe(function (value) {
                        if (!initializing) {
                            processElements(variable);
                        }
                    })
                });
            } else {
                const observer = new Observer(window, variable, false);
                observer.Observe(function (value) {
                    if (!initializing) {
                        processElements(variable);
                    }
                })
            }
            let dataSource = null, currentVariable = store.data[variable];
            if (store.persist) {
                if (store.data[variable].hasOwnProperty('persist') === false || store.data[variable].persist === true) {
                    //TODO: Find a way to identify if the data stored is an object.
                    dataSource = localStorage.getItem(store.localPrefix + variable);
                    try {
                        dataSource = JSON.parse(dataSource);
                    } catch (error) {
                    }
                }
            }

            let internalValue;
            if (dataSource === null || dataSource === "") {
                internalValue = currentVariable.default;
            } else {
                internalValue = dataSource;
            }
            if (currentVariable.hasOwnProperty('type')) {
                if (currentVariable.type === Array) {
                    if (internalValue !== 'undefined' && internalValue !== undefined && internalValue !== '') {
                        internalValue.forEach((value) => {
                            if (window[variable] === undefined) {
                                window[variable] = [];
                            }
                            window[variable].push(value);
                        });
                    } else {
                        if (store.data[variable].hasOwnProperty('default')) {
                            store.data[variable].default.forEach((item) => {
                                window[variable].push(item);
                            });
                        }
                    }
                } else if (currentVariable.type === Object) {
                    Object.keys(store.data[variable].default).forEach(function (property) {
                        window[variable][property] = internalValue[property];
                    });
                } else {
                    window[variable] = internalValue;
                }
            } else {
                window[variable] = internalValue;
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
        if (store.data[variable].hasOwnProperty('callBack') && store.data[variable].callBack != '') {
            store.data[variable].callBack.call(window[variable]);
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
    }

    function elementCss() {
        // Element CSS
        document.querySelectorAll("[s-css]").forEach((element) => {
            cssElement(element);
        });
    }

    function elementFors() {
        // Element FOR
        document.querySelectorAll("[s-for]").forEach((element) => {
            forElement(element);
        });
    }

    /**
     * Evaluate each elements s-if. display or not
     */
    function elementIfs() {
        // Element display
        document.querySelectorAll("[s-if]").forEach((element) => {
            ifElement(element);
        });
    }

    /**
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
            // TODO: multiple
            case "select-one":
                element.onchange = function (event) {
                    // If there is code found then process it!
                    if (hasCode(event.target.value)) {
                        try {
                            let value = getCode(`'${event.target.value}'`);
                            window[element.attributes['s-bind'].value] = exec(value);

                        } catch (error) {
                            console.error(error.message);
                        }
                    } else {
                        window[element.attributes['s-bind'].value] = event.target.value;
                    }
                }
                element.value = exec(getCode(element.attributes['s-bind'].value));
                break;
            case "radio":
                element.onchange = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.value;
                }
                if (element.attributes['s-bind'].value === element.id) {
                    element.value = exec(getCode(element.attributes['s-bind'].value));
                }
                element.checked = window[element.attributes['s-bind'].value] === element.value;
                break;
            case "checkbox":
                element.onchange = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.checked;
                }
                element.checked = window[element.attributes['s-bind'].value];
                break;
            case "text":
            case "email":
            case "textarea":
                let senser = 'onkeyup';
                if (element.attributes['s-blur'] && element.attributes['s-blur'].value === "") {
                    senser = 'onblur';
                }
                element[senser] = function (event) {
                    // If the data did not change, don't trigger
                    if (event.target.value === window[element.attributes['s-bind'].value]) {
                        return;
                    }
                    window[element.attributes['s-bind'].value] = event.target.value;
                };
                element.value = exec(getCode(element.attributes['s-bind'].value));
                break;
            case "color":
            case "date":
            case "datetime-local":
                element.oninput = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.value;
                };
                element.value = exec(getCode(element.attributes['s-bind'].value));
                break;
            case undefined:
                switch (element.tagName) {
                    case "IMG":
                        let srcCode = element.attributes['s-bind'].value;
                        try {
                            let image = exec(srcCode);
                            if (image) {
                                element.src = image;
                                // The only way I could set this.
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
                element.innerHTML = window[element.attributes['s-bind'].value];
                break;
        }
    }

    /**
     * Process Elements by variable
     * @param variable
     */
    function processElements(variable) {
        document.querySelectorAll("[s-bind]").forEach((element) => {
            if (element.innerHTML.indexOf(variable) >= 0 || element.getAttribute('s-bind').indexOf(variable) >= 0 || element.getAttribute('s-bind') === variable) {
                setElement(element);
            }
        });

        document.querySelectorAll("[s-for]").forEach((element) => {
            if (element.innerHTML.indexOf(variable) >= 0 || element.getAttribute('s-for').indexOf(variable) >= 0 ||element.getAttribute('s-for') === variable) {
                forElement(element);
            }
        });

        document.querySelectorAll("[s-if]").forEach((element) => {
            if (element.innerHTML.indexOf(variable) >= 0 || element.getAttribute('s-if').indexOf(variable) >= 0 || element.getAttribute('s-if') === variable) {
                ifElement(element);
            }
        });

        document.querySelectorAll("[s-css]").forEach((element) => {
            if (element.innerHTML.indexOf(variable) >= 0|| element.getAttribute('s-css').indexOf(variable) >= 0  || element.getAttribute('s-css') === variable) {
                cssElement(element);
            }
        });
        executeCallBack(variable);
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
            //TODO: Evaluate how this impacts other display settings
            element.style.display = display ? 'block' : 'none';
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
                let code = exec(getCode("'" + style.substring(style.indexOf(':') + 1) + "'"));
                if (code.indexOf('${') >= 0) {
                    code = exec(code);
                }
                Object.assign(element.style, exec(`{"${cssAttribute}":'${code}'}`));
            });
        } catch (error) {
            console.error(error.message);
        }
    }

    /**
     * Process s-for directive
     */
    function forElement(element) {
        try {
            let templateElement;
            let parentElement;
            // Check if this element has already been processed by checking if it already
            // has the template element property set.
            if (element.hasOwnProperty('templateElement')) {
                // The element has been processed before. Set the template element to the one saved within.
                templateElement = element.templateElement.cloneNode(true);
                // Save the element's parent element for later usage.
                parentElement = element;
            } else if (element.parentElement && !element.parentElement.hasOwnProperty('originalNode')) {
                // Save the element's parent element for later usage.
                parentElement = element.parentElement;
                // Save the original element and directive attributes inside it's parent element
                parentElement.templateElement = element.cloneNode(true);
                parentElement.setAttribute('s-for', element.getAttribute('s-for'));
                parentElement.setAttribute('s-key', element.getAttribute('s-key'));

                // Set the template element to the parents element template element
                templateElement = parentElement.templateElement;
            } else {
                console.log('Unexpected route...');
                return;
            }
            let forloop = templateElement.getAttribute('s-for');
            // Will we need a key?
            // let key = templateElement.getAttribute('s-key');
            if (templateElement.innerHTML !== '') {
                // If there is code found then process it!
                if (hasCode(templateElement.innerHTML)) {
                    try {
                        let value = '';
                        let innerHTML = getCode("'" + templateElement.innerHTML + "'");
                        // TODO: Evaluate other elements like OPTIONS or a different way to evaluate this
                        if (templateElement.tagName === 'OPTION') {
                            let code = getCode(templateElement.value);
                            if (code && code.length > 1) {
                                value = getCode(templateElement.value);
                            }
                        }
                        let fn = `
                                var index = 0;
                                var newElements = [];
                                // Create new elements
                                for(${forloop}) {
                                    let newElement = templateElement.cloneNode(true);
                                    newElement.removeAttribute('s-for');
                                    newElement.removeAttribute('s-key');
                                    let fn = new Function('index', '"use strict";return' + innerHTML + ';');
                                    newElement.innerHTML = fn(index);
                                    if (value !== '' && value !== undefined && value !== 'undefined' ) {
                                       let fn = new Function('index', '"use strict";return' + value + ';');
                                       newElement.value = fn(index);
                                    }
                                    // Assign index to s-key-value attribute
                                    let attribute = document.createAttribute("s-key-value");
                                    attribute.value = index;
                                    newElement.setAttributeNode(attribute);
                                    newElements.push(newElement);
                                    index++;
                                }
                                // Remove existing elements
                                let child = parentElement.lastElementChild;
                                while (child) {
                                    parentElement.removeChild(child);
                                    child = parentElement.lastElementChild;
                                }
                                // Insert new elements into parent
                                for (newElement of newElements) {
                                    parentElement.appendChild(newElement);
                                }
                                `;
                        let func = new Function('parentElement', 'templateElement', 'innerHTML', 'value', fn);
                        func(parentElement, templateElement, innerHTML, value);
                    } catch (error) {
                        console.error(error.message);
                    }
                }
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
        return value.substr(value.indexOf('[[') + 2, value.indexOf(']]') - 2).length > 0
    }

    /**
     * Get the code from the value
     * @param value
     * @returns {string}
     */
    function getCode(value) {
        return value.replace(/\[\[/g, "' + ").replace(/\]\]/g, " + '").replace(/(\r\n|\n|\r)/gm, "");
    }
    /**
     * Execute code and return result
     * @param value
     * @returns {*}
     */
    function exec(value) {
        return new Function('"use strict";return ' + value + ';')();
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

            a.splice = function (i, length, itemsToInsert) {
                let returnObj
                if (itemsToInsert) {
                    Array.prototype.slice.call(arguments, 2);
                    returnObj = itemsToInsert;
                } else {
                    returnObj = Array.prototype.splice.apply(a, arguments);
                }
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

    // const storeTemplate = {
    //     persist: true,
    //     localPrefix: '__',
    //     private: false,
    //     data: {},
    // };

    /**
     * Initiate existing id recognition.
     */
    function getVariables(store) {
        for (let variable of document.querySelectorAll('[s-bind]')) {
            let variableName = variable.getAttribute('s-bind');
            if (variableName.indexOf('[') >= 0) {
                variableName = variableName.replace('[', '').replace(']', '');
                store.data[variableName] = {};
                store.data[variableName].type = Array;
            }
            else if (variableName.indexOf('{') >= 0) {
                variableName = variableName.replace('{', '').replace('}', '');
                store.data[variableName] = {};
                store.data[variableName].type = Object;
            }
            if (!store.data.hasOwnProperty(variableName)) {
                store.data[variableName] = {};
                store.data[variableName].type = String;
                if (variable.hasOwnProperty('value')) {
                    store.data[variableName].default = variable.value;
                }
                else if (variable.getAttribute('value')) {
                    store.data[variableName].default = variable.getAttribute('value');
                }
                else {
                    store.data[variableName].default = '';
                }
                if (variable.getAttribute('s-callback') !== null) {
                    store.data[variableName].callBack = new Function('"use strict"; ' + variable.getAttribute('s-callback'));
                }
            }
        }
    }

}

// Adapt for either browser or not. AMD support
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = sensible;
} else {
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return sensible();
        });
    } else {
        window.sensible = sensible;
    }
}
