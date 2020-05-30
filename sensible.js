const sensible = (store) => {

    init(store);
    //let parentElement = {};

    function init(store) {
        store.datosTemp = {};
        let initializing = true;
        Object.keys(store.data()).forEach(function (variable) {
            try {
                Object.defineProperty(window, variable, {
                    get: function () {
                        //return new Function('"use strict";return window.' + variable + ';')();
                        return store.datosTemp[variable];
                    },
                    set: function (value) {
                        // Persist it if needed
                        if (store.persist) {
                            // Check that the variable has a type
                            if (typeof value == 'object') {
                                localStorage.setItem(store.localPrefix + variable, JSON.stringify(value));
                            }
                            else {
                                localStorage.setItem(store.localPrefix + variable, value);
                            }
                        }
                        store.datosTemp[variable] = value;

                        if (!initializing) {
                            //Process data binding for elements
                            document.querySelectorAll([`[s-bind=${variable}]`]).forEach((element) => {
                                setElement(element);
                                // Process display of elements
                                ifElements();
                                // Process appearance of elements
                                cssElements();
                            })

                        }
                    }
                });
            } catch (error) {
                console.error(error.message);
            }
        });
        Object.keys(store.data()).forEach(function (variable) {
            // Initialize store data as internal variables
            let dataSource = null;
            if (store.persist) {
                //dataSource = localStorage.getItem(JSON.stringify(store.localPrefix + variable).replace(/['"]+/g, ''));
                dataSource = localStorage.getItem(JSON.stringify(store.localPrefix + variable));
                try {
                    dataSource = JSON.parse(dataSource);
                } catch (error) {

                }
            }

            let internalValue;

            if (dataSource === null) {
                internalValue = store.data()[variable].default;
            } else {
                internalValue = dataSource;
            }

            window[variable] = internalValue;
            // if (store.data()[variable].hasOwnProperty('type')) {
            //     // Cast the value based on data type
            //     window[variable] = store.data()[variable].type(internalValue);
            // } else {
            //     // No casting information available
            //     window[variable] = internalValue;
            // }
        })
        initializing = false;

        // Model bindings
        modelBindings();
        // Element visibility
        ifElements();
        // Element appearance
        cssElements()

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
     * Set element sensible events
     * @param element
     */
    function setElement(element) {
        let setInner = false;
        switch (element.type) {
            case "select-one":
                element.onchange = function (event) {
                    new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
                }
                element.value = window[element.attributes['s-bind'].value];
                break;
            case "radio":
                element.onchange = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.value;
                    //new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
                }
                if (element.attributes['s-bind'].value === element.id) {
                    element.value = window[element.attributes['s-bind'].value];
                }
                element.checked = window[element.attributes['s-bind'].value] === element.value;
                break;
            case "checkbox":
                element.onchange = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.checked;
                    //new Function('"use strict";var value = ' + JSON.stringify(event.target.checked) + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
                }
                element.checked = window[element.attributes['s-bind'].value];
                break;
            case "text":
            case "email":
            case "textarea":
                element.onkeyup = function (event) {
                    window[element.attributes['s-bind'].value] = event.target.value;
                    //new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
                };
                //element.value = Function('"use strict";return(' + element.attributes['s-bind'].value + ');')();
                element.value = window[element.attributes['s-bind'].value];
                setInner = true;
                break;
            case "color":
            case "date":
            case "datetime-local":
                element.oninput = function (event) {
                    new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
                };
                element.value = window[element.attributes['s-bind'].value];
                setInner = true;
                break;
            case undefined:
                if (!element.hasOwnProperty('original')) {
                    element.original = element.innerHTML;
                }
                element.innerHTML = window[element.attributes['s-bind'].value];
                if (element.original !== '') {
                    let code = element.original.substr(element.original.indexOf('{{') + 2, element.original.indexOf('}}') - 2)
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            let nonCodeNode1Location = element.original.indexOf('{{');
                            let nonCodeNode1 = element.original.substring(0, element.original.indexOf('{{'));
                            let nonCodeNode2Location = element.original.indexOf('}}') + 2;
                            let nonCodeNode2 = element.original.substring(element.original.indexOf('}}') + 2);
                            let code = element.original.substr(nonCodeNode1Location + 2, nonCodeNode2Location - nonCodeNode1Location - 4);
                            let codeValue = new Function('"use strict";return ' + code + ';')();
                            element.innerHTML = `${nonCodeNode1}${codeValue}${nonCodeNode2}`;
                        } catch (error) {
                            console.error(error.message);
                        }
                    }
                } else {
                    //element.innerHTML = new Function('"use strict";return ' + element.attributes['s-bind'].value)();
                    element.innerHTML = window[element.attributes['s-bind'].value];
                }
                break;
        }
        if (setInner) {
            element.innerHTML = window[element.attributes['s-bind'].value];
        }
    }

    /**
     * Set elements sensible visibility
     */
    function ifElements() {
        document.querySelectorAll(['[s-if]']).forEach((element) => {
            try {
                //TODO: Evaluate code inside
                const display = new Function('"use strict";' + ' return ' + element.getAttribute('s-if') + ';')();
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
                    Object.assign(element.style, new Function(`return {"${style.split(':')[0].trim()}":${style.split(':')[1].trim()}}`)());
                });
            } catch (error) {
                console.error(error.message);
            }
        })
    }

    /**
     * Process for directive
     */
    function forElements() {
        document.querySelectorAll(['[s-for]']).forEach((element) => {
            try {
                if (!element.hasOwnProperty('original')) {
                    element.original = element.innerHTML;
                }
                let forloop = element.getAttribute('s-for');
                if (element.original !== '') {
                    let code = element.original.substr(element.original.indexOf('{{') + 2, element.original.indexOf('}}') - 2)
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            let nonCodeNode1Location = element.original.indexOf('{{');
                            let nonCodeNode1 = element.original.substring(0, element.original.indexOf('{{'));
                            let nonCodeNode2Location = element.original.indexOf('}}') + 2;
                            let nonCodeNode2 = element.original.substring(element.original.indexOf('}}') + 2);
                            code = element.original.substr(nonCodeNode1Location + 2, nonCodeNode2Location - nonCodeNode1Location - 4);
                            //let codeValue = new Function('"use strict";return ' + code + ';')();
                            //let insertElement = `${nonCodeNode1}${codeValue}${nonCodeNode2}`;
                            localElement = element.cloneNode(true);
                            localElement.removeAttribute('s-for');
                            //Why does this work without using var o let?
                            parentElement = element.parentElement;
                            let fn = `
                            for(${forloop}) {
                                var newElement = localElement.cloneNode(true);
                                localElement.innerHTML = ${code};
                                newElement.innerHTML = ${code};
                                this.parentElement.appendChild(newElement);
                            }
                            `;
                            new Function(fn)();
                            element.remove();
                        } catch (error) {
                            console.error(error.message);
                        }
                    }
                } else {
                    element.innerHTML = new Function('"use strict";return ' + element.attributes['s-bind'].value)();
                }
            } catch (error) {
                console.error(error.message);
            }
        })
    }

    function ArrayObserver(a) {
        var _this = this;
        this.array = a;
        this.observers = [];

        this.Observe = function (notifyCallback) {
            _this.observers.push(notifyCallback);
        }

        a.push = function (obj) {
            var push = Array.prototype.push.apply(a, arguments);
            for (var i = 0; i < _this.observers.length; i++) _this.observers[i](obj, "push");
            return push;
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
    }

    function Observer(o, property) {
        var _this = this;
        var value = o[property];
        this.observers = [];

        this.Observe = function (notifyCallback) {
            _this.observers.push(notifyCallback);
        }

        Object.defineProperty(o, property, {
            set: function (val) {
                _this.value = val;
                for (var i = 0; i < _this.observers.length; i++) _this.observers[i](val);
            },
            get: function () {
                return _this.value;
            }
        });
    }


}
exports = sensible;
