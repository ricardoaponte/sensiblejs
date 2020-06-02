function sensible(store) {
    String.prototype.hasCode = function () {
        return this.search(/\[\[/g, "' + ") >= 0;
    }

    init(store);

    function init(store) {
        store.datosTemp = {};
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
                    store.datosTemp[variable] = result;

                    if (!initializing) {
                        //Process data binding for elements
                        document.querySelectorAll([`[s-bind=${variable}]`]).forEach((element) => {
                            setElement(element);
                        })
                        // Process display of elements
                        ifElements();
                        // Process appearance of elements
                        cssElements();
                        // Elements with for loops
                        forElements();

                        // Execute field callbacks if any
                        if (store.data[variable].hasOwnProperty('callBack') && store.data[variable].callBack != '') {
                            store.data[variable].callBack.call(window[variable]);
                        }
                    }
                });
            }
            else if (store.data[variable].hasOwnProperty('type') && store.data[variable].type === Object) {
                window[variable] = {};
                var observer = new Observer(window, variable, variable);
                observer.Observe(function (value) {
                    if (!initializing) {
                        updateAll();
                        // Execute field callbacks if any
                        if (store.data[variable].hasOwnProperty('callBack') && store.data[variable].callBack != '') {
                            store.data[variable].callBack.call(window[variable]);
                        }

                    }
                })
                Object.keys(store.data[variable].default).forEach(function (property) {
                    window[variable] = {};
                    var observer = new Observer(window[variable], property, variable);
                    observer.Observe(function (value) {
                        if (!initializing) {
                            updateAll();
                            // Execute field callbacks if any
                            if (store.data[variable].hasOwnProperty('callBack') && store.data[variable].callBack != '') {
                                store.data[variable].callBack.call(window[variable]);
                            }

                        }
                    })
                });
            }
            else {
                //The notify callback method.
                var observer = new Observer(window, variable, false);
                observer.Observe(function (value) {
                    if (!initializing) {
                        updateAll();
                        // Execute field callbacks if any
                        if (store.data[variable].hasOwnProperty('callBack') && store.data[variable].callBack != '') {
                            store.data[variable].callBack.call(window[variable]);
                        }
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
                }
                else if (currentVariable.type === Object) {
                    Object.keys(store.data[variable].default).forEach(function (property) {
                        window[variable][property] = internalValue[property];
                    });
                }
                else {
                    window[variable] = internalValue;
                }
            } else {
                window[variable] = internalValue;
            }
        });
        initializing = false;
        updateAll();
    }

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
     * Initialize existing elements with store data
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
                    let code = event.target.value.substr(event.target.value.indexOf('[[') + 2, event.target.value.indexOf(']]') - 2)
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            let value = "'" + event.target.value.replace(/\[\[/g, "' + ").replace(/\]\]/g, " + '").replace(/(\r\n|\n|\r)/gm, "") + "'";
                            window[element.attributes['s-bind'].value] = exec(value);

                        } catch (error) {
                            console.error(error.message);
                        }
                    } else {
                        window[element.attributes['s-bind'].value] = event.target.value;
                    }
                }
                element.value = window[element.attributes['s-bind'].value];
                break;
            case "radio":
                element.onchange = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.value;
                }
                if (element.attributes['s-bind'].value === element.id) {
                    element.value = window[element.attributes['s-bind'].value];
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
                element.onkeyup = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.value;
                };
                element.value = window[element.attributes['s-bind'].value];
                break;
            case "color":
            case "date":
            case "datetime-local":
                element.oninput = function (event) {
                    new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
                };
                element.value = window[element.attributes['s-bind'].value];
                break;
            case undefined:
                switch (element.tagName) {
                    case "IMG":
                        let code = element.attributes['s-bind'].value;
                        try {
                            let result = exec(code);
                            if (result) {
                                element.src = result;
                                // The only way I could set this.
                                document.getElementById(element.id).src = result;
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
                    let code = element.originalInnerHTML.substr(element.originalInnerHTML.indexOf('[[') + 2, element.originalInnerHTML.indexOf(']]') - 2)
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            code = "'" + element.originalInnerHTML.replace(/\[\[/g, "' + ").replace(/\]\]/g, " + '").replace(/(\r\n|\n|\r)/gm, "") + "'";
                            let codeResult = exec(code);
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
     * Process For directive
     */
    function forElements() {
        document.querySelectorAll(['[s-for]']).forEach((element) => {
            try {
                if (element.hasOwnProperty('originalNode')) {
                    var newElement = element.originalNode.cloneNode(true);
                    parentElement = element;
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
                    let code = element.parentElement.originalNode.innerHTML.substr(element.parentElement.originalNode.innerHTML.indexOf('[[') + 2, element.parentElement.originalNode.innerHTML.indexOf(']]') - 2)
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            element.style.display = '';
                            value = '';
                            innerHTML = "'" + element.parentElement.originalNode.innerHTML.replace(/\[\[/g, "' + ").replace(/\]\]/g, " + '").replace(/(\r\n|\n|\r)/gm, "") + "'";
                            if (element.tagName === 'OPTION') {
                                let code = element.parentElement.originalNode.value.substr(element.parentElement.originalNode.value.indexOf('[[') + 2, element.parentElement.originalNode.value.indexOf(']]') - 2)
                                if (code && code.length > 1) {
                                    value = element.parentElement.originalNode.value.replace(/\[\[/g, "").replace(/\]\]/g, "").replace(/(\r\n|\n|\r)/gm, "");
                                }
                            }
                            localElement = element.cloneNode(true);
                            parentElement = element.parentElement;
                            if (parentElement) {
                                var child = parentElement.lastElementChild;
                                while (child) {
                                    parentElement.removeChild(child);
                                    child = parentElement.lastElementChild;
                                }
                                let fn = `
                                    var index = 0;
                                    for(${forloop}) {
                                        var newElement = localElement.cloneNode(true);
                                        localElement.innerHTML = new Function('"use strict";return' + this.innerHTML + ';')();
                                        if (this.value !== '' && this.value !== undefined && this.value !== 'undefined' ) {
                                            newElement.value = new Function('"use strict";return ' + this.value + ';')();
                                        }
                                        newElement.innerHTML = localElement.innerHTML;
                                        var att = document.createAttribute("s-key-value");
                                        att.value = index;
                                        index++;
                                        newElement.setAttributeNode(att);
                                        this.parentElement.appendChild(newElement);
                                    }`;
                                new Function(fn)();
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
        var _this = this;
        this.array = a;
        this.observers = [];

        this.Observe = function (notifyCallback) {
            _this.observers.push(notifyCallback);
        }
        try {
            a.push = function (obj) {
                var push = Array.prototype.push.apply(a, arguments);
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](obj, "push");
                return push;
            }

            a.concat = function (obj) {
                var concat = Array.prototype.concat.apply(a, obj);
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](concat, "concat");
                return concat;
            }

            a.pop = function () {
                var popped = Array.prototype.pop.apply(a, arguments);
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](popped, "pop");
                return popped;
            }

            a.reverse = function () {
                var result = Array.prototype.reverse.apply(a, arguments);
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](result, "reverse");
                return result;
            };

            a.shift = function () {
                var deleted_item = Array.prototype.shift.apply(a, arguments);
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](deleted_item, "shift");
                return deleted_item;
            };

            a.sort = function () {
                var result = Array.prototype.sort.apply(a, arguments);
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](result, "sort");
                return result;
            };

            a.splice = function (i, length, itemsToInsert) {
                var returnObj
                if (itemsToInsert) {
                    Array.prototype.slice.call(arguments, 2);
                    returnObj = itemsToInsert;
                } else {
                    returnObj = Array.prototype.splice.apply(a, arguments);
                }
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](returnObj, "splice");
                return returnObj;
            };

            a.unshift = function () {
                var new_length = Array.prototype.unshift.apply(a, arguments);
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](new_length, "unshift");
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
        var _this = this;
        var _obj = obj;
        this.observers = [];

        this.Observe = function (notifyCallback) {
            _this.observers.push(notifyCallback);
        }

        Object.defineProperty(o, property, {
            set: function (value) {
                _this.value = value;
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](value);
                if (store.persist) {
                    if (_obj !== false) {
                        if ((store.data[_obj].hasOwnProperty('persist') && store.data[_obj].persist !== false)) {
                            if (typeof value == 'object') {
                                localStorage.setItem(store.localPrefix + _obj + '.' + property, JSON.stringify(value));
                            } else {
                                localStorage.setItem(store.localPrefix + _obj + '.' + property, value);
                            }
                        }
                    }
                    else {
                        if ((store.data[property].hasOwnProperty('persist') && store.data[property].persist !== false)) {
                            if (typeof value == 'object') {
                                localStorage.setItem(store.localPrefix + property, JSON.stringify(value));
                            } else {
                                localStorage.setItem(store.localPrefix + property, value);
                            }
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

module.exports = sensible;
