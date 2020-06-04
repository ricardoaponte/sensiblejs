'use strict';

function sensible(store) {

    const storeTemplate = {
        persist: true,
        localPrefix: '__',
        private: false,
        data: {},
    };

    function getIds() {
        let ids = [];
        for (let variable of document.querySelectorAll('[id]')) {
            ids.push(variable.id);
        }
        console.log(ids);
    }

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
                        //updateAll();
                        bindElements(variable)
                        ifElements(variable);
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
                        //updateAll();
                        bindElements(variable);
                        ifElements(variable);
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
        processElements();
        //updateAll();
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
        // Element bindings
        elementBindings();
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
    function elementBindings(variable) {
        // Element bindings
        let elements = document.querySelectorAll(['[s-bind]']);
        elements.forEach((element) => {
            setElement(element);
        })
    }

    /**
     * Initialize existing elements with store data directives
     */
    function bindElements(elements) {
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

    function processElements() {
        let bindedElementsVariables = [];
        let forElementsVariables = [];
        let cssElementsVariables = [];
        let ifElementsVariables = [];
        Object.keys(store.data).forEach(function (variable) {
            document.querySelectorAll("[s-bind]").forEach((element) => {
                if (element.innerHTML.indexOf(variable) >= 0 || (element.hasOwnProperty('value') && element.value.indexOf(variable) >= 0)) {
                    if (bindedElementsVariables.indexOf(element) === -1) {
                        bindedElementsVariables.push(element);
                    }
                }
            });
            document.querySelectorAll("[s-for]").forEach((element) => {
                if (element.innerHTML.indexOf(variable) >= 0) {
                    if (forElementsVariables.indexOf(element) === -1) {
                        forElementsVariables.push(element);
                    }
                }
            });
            document.querySelectorAll("[s-if]").forEach((element) => {
                if (element.innerHTML.indexOf(variable) >= 0) {
                    if (ifElementsVariables.indexOf(element) === -1) {
                        ifElementsVariables.push(element);
                    }
                }
            });
            document.querySelectorAll("[c-css]").forEach((element) => {
                if (element.innerHTML.indexOf(variable) >= 0) {
                    if (cssElementsVariables.indexOf(element) === -1) {
                        cssElementsVariables.push(element);
                    }
                }
            });
            bindElements(bindedElementsVariables);
            forElements(forElementsVariables);
            ifElements(ifElementsVariables);
            cssElements(cssElementsVariables);
        });

        // document.querySelectorAll("[s-bind],[s-for],[s-if],[s-blur]").forEach((element) => {
        //     Object.keys(store.data).forEach(function (variable) {
        //         if (element.innerHTML.indexOf(variable) >= 0) {
        //             if (elements.indexOf(element) === -1) {
        //                 elements.push(element);
        //             }
        //         }
        //     });
        // });
        // console.log(elements);
    }

    /**
     * Set elements sensible visibility
     */
    function ifElements(elements) {
        elements.forEach((element) => {
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
    // function ifElements(variable) {
    //     let selector = ['[s-if]'];
    //     if (variable) {
    //         selector = [`[s-if*=${variable}]`];
    //     }
    //
    //     document.querySelectorAll(selector).forEach((element) => {
    //         try {
    //             //TODO: Evaluate code inside
    //             const display = exec(element.getAttribute('s-if'));
    //             if (!element.hasOwnProperty('originalDisplay')) {
    //                 element.originalDisplay = element.style.display;
    //             }
    //             // Preserve original display
    //             element.style.display = display ? element.originalDisplay : 'none';
    //         } catch (error) {
    //             console.error(error.message);
    //         }
    //     })
    // }

    /**
     * Set elements sensible appearance
     */
    function cssElements(elements) {
        elements.forEach((element) => {
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
    // function cssElements(variable) {
    //     let selector = ['[s-css]'];
    //     if (variable) {
    //         selector = [`[s-css*=${variable}]`];
    //     }
    //     document.querySelectorAll([selector]).forEach((element) => {
    //         try {
    //             element.getAttribute('s-css').split(';').forEach(function (style) {
    //                 //Object.assign(element.style, new Function(`return {"${style.split(':')[0].trim()}":${style.split(':')[1].trim()}}`)());
    //                 Object.assign(element.style, exec(`{"${style.split(':')[0].trim()}":${style.split(':')[1].trim()}}`));
    //             });
    //         } catch (error) {
    //             console.error(error.message);
    //         }
    //     })
    // }

    /**
     * Process FOR directive
     */
    function forElements(elements) {
        elements.forEach((element) => {
            try {
                // If the original node is already set then assign it to the current element
                let templateElement;
                let parentElement;
                if (element.hasOwnProperty('templateElement')) {
                    templateElement = element.templateElement.cloneNode(true);
                    parentElement = element;
                } else if (element.parentElement && !element.parentElement.hasOwnProperty('originalNode')) {
                    // Save the original element and directive attributes inside it's parent element
                    element.parentElement.templateElement = element.cloneNode(true);
                    element.parentElement.setAttribute('s-for', element.getAttribute('s-for'));
                    element.parentElement.setAttribute('s-key', element.getAttribute('s-key'));
                    // Set the template element to its parents' template element
                    templateElement = element.parentElement.templateElement;
                    parentElement = element.parentElement;
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
                                    newElement.innerHTML = new Function('"use strict";return' + innerHTML + ';')();
                                    if (value !== '' && value !== undefined && value !== 'undefined' ) {
                                        newElement.value = new Function('"use strict";return ' + value + ';')();
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
        })
    }
    // function forElements(variable) {
    //     let selector = ['[s-for]'];
    //     if (variable) {
    //         selector = [`[s-for*=${variable}]`];
    //     }
    //     document.querySelectorAll(['[s-for]']).forEach((element) => {
    //         try {
    //             // If the original node is already set then assign it to the current element
    //             let templateElement;
    //             let parentElement;
    //             if (element.hasOwnProperty('templateElement')) {
    //                 templateElement = element.templateElement.cloneNode(true);
    //                 parentElement = element;
    //             } else if (element.parentElement && !element.parentElement.hasOwnProperty('originalNode')) {
    //                 // Save the original element and directive attributes inside it's parent element
    //                 element.parentElement.templateElement = element.cloneNode(true);
    //                 element.parentElement.setAttribute('s-for', element.getAttribute('s-for'));
    //                 element.parentElement.setAttribute('s-key', element.getAttribute('s-key'));
    //                 // Set the template element to its parents' template element
    //                 templateElement = element.parentElement.templateElement;
    //                 parentElement = element.parentElement;
    //             } else {
    //                 console.log('Unexpected route...');
    //                 return;
    //             }
    //             let forloop = templateElement.getAttribute('s-for');
    //             // Will we need a key?
    //             // let key = templateElement.getAttribute('s-key');
    //             if (templateElement.innerHTML !== '') {
    //                 // If there is code found then process it!
    //                 if (hasCode(templateElement.innerHTML)) {
    //                     try {
    //                         let value = '';
    //                         let innerHTML = getCode("'" + templateElement.innerHTML + "'");
    //                         // TODO: Evaluate other elements like OPTIONS or a different way to evaluate this
    //                         if (templateElement.tagName === 'OPTION') {
    //                             let code = getCode(templateElement.value);
    //                             if (code && code.length > 1) {
    //                                 value = getCode(templateElement.value);
    //                             }
    //                         }
    //                         let fn = `
    //                             var index = 0;
    //                             var newElements = [];
    //                             // Create new elements
    //                             for(${forloop}) {
    //                                 let newElement = templateElement.cloneNode(true);
    //                                 newElement.removeAttribute('s-for');
    //                                 newElement.removeAttribute('s-key');
    //                                 newElement.innerHTML = new Function('"use strict";return' + innerHTML + ';')();
    //                                 if (value !== '' && value !== undefined && value !== 'undefined' ) {
    //                                     newElement.value = new Function('"use strict";return ' + value + ';')();
    //                                 }
    //                                 // Assign index to s-key-value attribute
    //                                 let attribute = document.createAttribute("s-key-value");
    //                                 attribute.value = index;
    //                                 newElement.setAttributeNode(attribute);
    //                                 newElements.push(newElement);
    //                                 index++;
    //                             }
    //                             // Remove existing elements
    //                             let child = parentElement.lastElementChild;
    //                             while (child) {
    //                                 parentElement.removeChild(child);
    //                                 child = parentElement.lastElementChild;
    //                             }
    //                             // Insert new elements into parent
    //                             for (newElement of newElements) {
    //                                 parentElement.appendChild(newElement);
    //                             }
    //                             `;
    //                         let func = new Function('parentElement', 'templateElement', 'innerHTML', 'value', fn);
    //                         func(parentElement, templateElement, innerHTML, value);
    //                     } catch (error) {
    //                         console.error(error.message);
    //                     }
    //                 }
    //             }
    //         } catch (error) {
    //             console.error(error.message);
    //         }
    //     })
    // }

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
} else {
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return sensible();
        });
    } else {
        window.sensible = sensible;
    }
}
