'use strict';

function sensible(store) {

    const storeTemplate = {
        persist: true,
        localPrefix: '__',
        private: false,
        data: {},
    };

    function hasCode(value) {
        return value.substr(value.indexOf('[[') + 2, value.indexOf(']]') - 2).length > 0
    }

    function getCode(value) {
        return value.replace(/\[\[/g, "' + ").replace(/\]\]/g, " + '").replace(/(\r\n|\n|\r)/gm, "");
    }

    init(store);

    function init(store) {
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
                        updateAll();
                        executeCallBack(variable);
                    }
                });
            } else if (store.data[variable].hasOwnProperty('type') && store.data[variable].type === Object) {
                window[variable] = {};
                const observer = new Observer(window, variable, variable);
                observer.Observe(function (value) {
                    if (!initializing) {
                        updateAll();
                        executeCallBack(variable);
                    }
                })
                Object.keys(store.data[variable].default).forEach(function (property) {
                    window[variable] = {};
                    const observer = new Observer(window[variable], property, variable);
                    observer.Observe(function (value) {
                        if (!initializing) {
                            updateAll();
                            executeCallBack(variable);
                        }
                    })
                });
            } else {
                //The notify callback method.
                const observer = new Observer(window, variable, false);
                observer.Observe(function (value) {
                    if (!initializing) {
                        updateAll();
                        executeCallBack(variable);
                    }
                })
            }
            let dataSource = null;
            let currentVariable = store.data[variable];
            if (store.persist || (store.data[variable].hasOwnProperty('persist') && store.data[variable].persist === true)) {
                dataSource = localStorage.getItem(store.localPrefix + variable);
                try {
                    dataSource = JSON.parse(dataSource);
                } catch (error) {

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
                            if (!window[variable]) {
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
        initializing = false;
        updateAll();
    }

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
        // Model bindings
        modelBindings();
        // Element display
        ifElements();
        // Element appearance
        cssElements()
        // Elements with for loops
        forElements();
    }

    /**
     * Initialize existing elements with store data directives
     */
    function modelBindings() {
        // Model bindings
        let elements = document.querySelectorAll(['[s-bind]']);
        elements.forEach((element) => {
            setElement(element);
        })
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
     * Set elements sensible visibility
     */
    function ifElements() {
        document.querySelectorAll(['[s-if]']).forEach((element) => {
            try {
                //TODO: Evaluate code inside
                const display = exec(element.getAttribute('s-if'));
                if (!element.hasOwnProperty('originalDisplay')) {
                    element.originalDisplay = element.style.display;
                }
                // Preserve original display
                element.style.display = display ? element.originalDisplay : 'none';
            } catch (error) {
                console.error(error.message);
            }
        })
    }

    /**
     * Set elements sensible appearance
     */
    function cssElements() {
        document.querySelectorAll(['[s-css]']).forEach((element) => {
            try {
                element.getAttribute('s-css').split(';').forEach(function (style) {
                    //Object.assign(element.style, new Function(`return {"${style.split(':')[0].trim()}":${style.split(':')[1].trim()}}`)());
                    Object.assign(element.style, exec(`{"${style.split(':')[0].trim()}":${style.split(':')[1].trim()}}`));
                });
            } catch (error) {
                console.error(error.message);
            }
        })
    }

    /**
     * Process FOR directive
     */
    function forElements() {
        document.querySelectorAll(['[s-for]']).forEach((element) => {
            try {
                if (element.hasOwnProperty('originalNode')) {
                    let newElement = element.originalNode.cloneNode(true);
                    let parentElement = element;
                    element = element.originalNode;
                    parentElement.appendChild(newElement);
                } else if (element.parentElement && !element.parentElement.hasOwnProperty('originalNode')) {
                    element.parentElement.originalNode = element;
                    element.parentElement.setAttribute('s-for', element.getAttribute('s-for'));
                    element.parentElement.setAttribute('s-key', element.getAttribute('s-key'));
                }
                element.style.display = 'none';
                let forloop = element.getAttribute('s-for');
                // Will we need a key?
                // let key = element.getAttribute('s-key');
                if (element.parentElement && element.parentElement.originalNode.innerHTML !== '') {
                    let code = getCode(element.parentElement.originalNode.innerHTML);
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            element.style.display = '';
                            let value = '';
                            let innerHTML = "'" + element.parentElement.originalNode.innerHTML.replace(/\[\[/g, "' + ").replace(/\]\]/g, " + '").replace(/(\r\n|\n|\r)/gm, "") + "'";
                            if (element.tagName === 'OPTION') {
                                let code = getCode(element.parentElement.originalNode.value);
                                if (code && code.length > 1) {
                                    value = element.parentElement.originalNode.value.replace(/\[\[/g, "").replace(/\]\]/g, "").replace(/(\r\n|\n|\r)/gm, "");
                                }
                            }
                            let localElement = element.cloneNode(true);
                            let parentElement = element.parentElement;
                            if (parentElement) {
                                let child = parentElement.lastElementChild;
                                while (child) {
                                    parentElement.removeChild(child);
                                    child = parentElement.lastElementChild;
                                }
                                let fn = `
                                    var index = 0;
                                    for(${forloop}) {
                                        var newElement = localElement.cloneNode(true);
                                        localElement.innerHTML = new Function('"use strict";return' + innerHTML + ';')();
                                        if (this.value !== '' && this.value !== undefined && this.value !== 'undefined' ) {
                                            newElement.value = new Function('"use strict";return ' + value + ';')();
                                        }
                                        newElement.innerHTML = localElement.innerHTML;
                                        var att = document.createAttribute("s-key-value");
                                        att.value = index;
                                        index++;
                                        newElement.setAttributeNode(att);
                                        parentElement.appendChild(newElement);
                                    }`;
                                let func = new Function('localElement', 'innerHTML', 'parentElement', 'value', fn);
                                func(localElement, innerHTML, parentElement, value);
                                if (parentElement.children.length === 0) {
                                    if (!element.hasOwnProperty('originalDisplay')) {
                                        element.originalDisplay = element.style.display;
                                    }
                                    element.style.display = 'none';
                                    parentElement.appendChild(element);
                                } else {
                                    if (!element.hasOwnProperty('originalDisplay')) {
                                        element.style.display = element.originalDisplay;
                                    } else {
                                        element.style.display = '';
                                    }

                                }
                            }
                        } catch (error) {
                            console.error(error.message);
                        }
                    }
                }
            } catch (error) {
                console.error(error.message);
            }
        })
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
     * Execute code and return result
     * @param value
     * @returns {*}
     */
    function exec(value) {
        return new Function('"use strict";return ' + value + ';')();
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
}

// Adapt for either browser or not. AMD support
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = sensible;
}
else {
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return sensible();
        });
    }
    else {
        window.sensible = sensible;
    }
}
