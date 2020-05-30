const sensible = (store) => {

    init(store);

    function init(store) {
        store.datosTemp = {};
        let initializing = true;
        Object.keys(store.data()).forEach(function (variable) {
            try {
                if (store.data()[variable].hasOwnProperty('type') && store.data()[variable].type === Array) {
                    window[variable] = [];
                    window[variable].length = 0;
                    let ao = new ArrayObserver(window[variable]);
                    ao.Observe(function (result, method) {
                        if (store.persist) {
                            localStorage.setItem(store.localPrefix + variable, JSON.stringify(window[variable]));
                        }
                        store.datosTemp[variable] = result;

                        if (!initializing) {
                            //Process data binding for elements
                            document.querySelectorAll([`[s-bind=${variable}]`]).forEach((element) => {
                                setElement(element);
                                // Process display of elements
                            })
                            ifElements();
                            // Process appearance of elements
                            cssElements();
                            // Elements with for loops
                            forElements();
                        }
                    });
                } else {
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
                                } else {
                                    localStorage.setItem(store.localPrefix + variable, value);
                                }
                            }
                            store.datosTemp[variable] = value;

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
                            }
                        }
                    });
                }
            } catch (error) {
                console.error(error.message);
            }
        });
        Object.keys(store.data()).forEach(function (variable) {
            // Initialize store data as internal variables
            let dataSource = null;
            let currentVariable = store.data()[variable];
            if (store.persist) {
                //dataSource = localStorage.getItem(JSON.stringify(store.localPrefix + variable).replace(/['"]+/g, ''));
                dataSource = localStorage.getItem(store.localPrefix + variable);
                try {
                    dataSource = JSON.parse(dataSource);
                } catch (error) {

                }
            }

            let internalValue;

            if (dataSource === null) {
                internalValue = currentVariable.default;
            } else {
                internalValue = dataSource;
            }

            //window[variable] = internalValue;
            if (currentVariable.hasOwnProperty('type')) {
                // Cast the value based on data type
                if (currentVariable.type === Array) {
                    if (internalValue) {
                        internalValue.forEach((value) => {
                            window[variable].push(value);
                        });
                    } else {
                        store.data()[variable].default.forEach((item) => {
                            window[variable].push(item);
                        });
                    }
                } else {
                    window[variable] = internalValue;
                }
            } else {
                // No casting information available
                window[variable] = internalValue;
            }
        })
        initializing = false;

        // Model bindings
        modelBindings();
        // Element visibility
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
     * Set element sensible events
     * @param element
     */
    function setElement(element) {
        switch (element.type) {
            case "select-one":
                element.onchange = function (event) {
                    new Function('"use strict";var value = ' + event.target.value + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
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
                    //new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
                };
                //element.value = Function('"use strict";return(' + element.attributes['s-bind'].value + ');')();
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
                if (!element.hasOwnProperty('originalInnerHTML')) {
                    element.originalInnerHTML = element.innerHTML;
                }
                if (element.originalInnerHTML !== '') {
                    let code = element.originalInnerHTML.substr(element.originalInnerHTML.indexOf('{{') + 2, element.originalInnerHTML.indexOf('}}') - 2)
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            let innerHTML = "'" + element.originalInnerHTML.replace(/{{/g, "' + ").replace(/}}/g, " + '").replace(/(\r\n|\n|\r)/gm, "") + "'";
                            element.innerHTML = new Function('"use strict";return ' + innerHTML + ';')();

                        } catch (error) {
                            console.error(error.message);
                        }
                    } else {
                        element.innerHTML = window[element.attributes['s-bind'].value];
                    }
                } else {
                    element.innerHTML = window[element.attributes['s-bind'].value];
                }
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
                let key = element.getAttribute('s-key');
                if (element.parentElement && element.parentElement.originalNode.innerHTML !== '') {
                    let code = element.parentElement.originalNode.innerHTML.substr(element.parentElement.originalNode.innerHTML.indexOf('{{') + 2, element.parentElement.originalNode.innerHTML.indexOf('}}') - 2)
                    // If there is code found then process it!
                    if (code && code.length > 1) {
                        try {
                            element.style.display = '';
                            innerHTML = "'" + element.parentElement.originalNode.innerHTML.replace(/{{/g, "' + ").replace(/}}/g, " + '").replace(/(\r\n|\n|\r)/gm, "") + "'";
                            localElement = element.cloneNode(true);
                            //Why does this work without using var o let?
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
                                        newElement.innerHTML = localElement.innerHTML;
                                        var att = document.createAttribute("s-key-value");       
                                        att.value = index;
                                        index++;                           
                                        newElement.setAttributeNode(att);
                                        this.parentElement.appendChild(newElement);
                                    }`;
                                new Function(fn)();
                                if (parentElement.children.length == 0) {
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
                    // } else {
                    //     element.innerHTML = new Function('"use strict";return ' + element.attributes['s-for'].value)();
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

    // //A new array
    // var myArray = [7, 8, 9];
    // window.myArray = myArray;
    //
    // //Wire up the observable
    // var ao = new ArrayObserver(myArray)
    // ao.Observe(function (result, method) {
    //     console.log(result, method);
    // });
    //
    // //Do stuff to the array.
    // myArray.push(4);
    // myArray.push(5);
    // myArray.push(6);
    // myArray.pop();
    // myArray.pop();
    // myArray.splice(2, 1);
    // myArray.sort();
    // console.log(myArray);
    /*
        //A New Object
        var obj = {prop1: 123}

        //A New Observer
        var observer = new Observer(obj, "prop1")
        //The notify callback method.
        observer.Observe(function (newValue) {
            document.getElementById("myValue").value = newValue
        })
        //set a property in code.
        obj.prop1 = 456

        //And from a DOM Event
        KeyValue = function (KeyedVAlue) {
            obj.prop1 = KeyedVAlue
        }
    */

}
exports = sensible;
