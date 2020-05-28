function sense(store) {
    for (const variable in store.data()) {
        try {
            Object.defineProperty(this, variable, {
                get: function () {
                    return new Function('"use strict";return ' + store.localPrefix + variable + ';')();
                },
                set: function (value) {
                    // Set the internal variable
                    new Function('"use strict";' + store.localPrefix + variable + ' = ' + JSON.stringify(value) + ';')();
                    // Persist it if needed
                    if (store.persist) {
                        // Check that the variable has a type
                        new Function('"use strict";' + 'localStorage.setItem("' + store.localPrefix + variable + '",' + JSON.stringify(value) + ');')();
                    }

                    // Process data binding for elements
                    document.querySelectorAll([`[s-bind=${variable}]`]).forEach((element) => {
                        setElement(element);
                    })

                    // Process display of elements
                    ifElements();
                    // Process appearance of elements
                    cssElements();
                }
            });
        } catch (error) {
            console.error(error.message);
        }

        // Initialize store data as internal variables
        let dataSource;
        if (store.persist) {
            dataSource = localStorage.getItem(store.localPrefix + JSON.stringify(variable).replace(/['"]+/g, ''));
            try {
                dataSource = JSON.parse(dataSource);
            } catch (error) {

            }
        } else {
            dataSource = store.data()[variable];
        }

        let internalValue;

        // Validate the variable type
        if (dataSource == null && store.data()[variable].hasOwnProperty('default')) {
            // Get the default value
            internalValue = JSON.stringify(store.data()[variable].default);
        } else {
            // No casting information available set to direct value assignment
            if (dataSource != null) {
                internalValue = JSON.stringify(dataSource);
            }
            else {
                internalValue = JSON.stringify(store.data()[variable]);
            }
        }

        if (store.data()[variable].hasOwnProperty('type')) {
            // Cast the value based on data type
            new Function(`${store.localPrefix}${variable} = store.data()['${variable}'].type(${internalValue})`)();
        } else {
            // No casting information available
            new Function(`${store.localPrefix}${variable} = ${internalValue}`)();
        }
    }

    // Model bindings
    modelBindings();
    // Element visibility
    ifElements();
    // Element appearance
    cssElements()
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
                new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
            }
            element.value = Function('"use strict";return(' + store.localPrefix + element.attributes['s-bind'].value + ');')();
            break;
        case "radio":
            element.onchange = function (event) {
                new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
            }
            element.checked = Function('"use strict";return(' + JSON.stringify(element.value) + ' == ' + store.localPrefix + element.attributes['s-bind'].value + ');')();
            break;
        case "checkbox":
            element.onchange = function (event) {
                new Function('"use strict";var value = ' + JSON.stringify(event.target.checked) + ';' + store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
            }
            element.checked = Function('"use strict";return(' + store.localPrefix + element.attributes['s-bind'].value + ');')();
            break;
        case "text":
        case "email":
        case "textarea":
            element.onkeyup = function (event) {
                new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
            };
            element.value = Function('"use strict";return(' + store.localPrefix + element.attributes['s-bind'].value + ');')();
            setInner = true;
            break;
        case "color":
        case "date":
        case "datetime-local":
            element.oninput = function (event) {
                new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
            };
            element.value = Function('"use strict";return ' + store.localPrefix + element.attributes['s-bind'].value + ';')();
            setInner = true;
            break;
        case undefined:
            if (!element.hasOwnProperty('original')) {
                element.original = element.innerHTML;
            }
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
                element.innerHTML = new Function('"use strict";return ' + store.localPrefix + element.attributes['s-bind'].value)();
            }
            break;
    }
    if (setInner) {
        element.innerHTML = new Function('"use strict";return ' + store.localPrefix + element.attributes['s-bind'].value)();
    }
}

/**
 * Set elements sensible visibility
 */
function ifElements() {
    document.querySelectorAll(['[s-if]']).forEach((element) => {
        try {
            const display = new Function('"use strict";' + ' return ' + store.localPrefix + element.getAttribute('s-if') + ';')()
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
            element.getAttribute('s-css').split(';').forEach(function(style) {
                Object.assign(element.style, new Function(`return {"${style.split(':')[0].trim()}":${style.split(':')[1].trim()}}`)());
            });
        } catch (error) {
            console.error(error.message);
        }
    })
}
