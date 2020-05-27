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
                        new Function('"use strict";' + 'localStorage.setItem("' + store.localPrefix + variable + '",' + JSON.stringify(value) + ');')();
                    }
                    // Process data binding for elements
                    document.querySelectorAll([`[s-bind=${variable}]`]).forEach((element) => {
                        setElement(element);
                    })

                    // Process display of elements
                    ifElements();
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
            if (dataSource === null) {
                dataSource = store.data()[variable];
            }
        } else {
            dataSource = store.data()[variable];
        }
        // Set internal variable value;
        new Function(`${store.localPrefix}${variable} = ${JSON.stringify(dataSource)}`)();
    }

    // Model bindings
    modelBindings();
    // Element visibility
    ifElements();

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
        case "checkbox":
            element.onchange = function (event) {
                new Function('"use strict";var value = ' + JSON.stringify(event.target.checked) + ';' + store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
            }
            element.checked = Function('"use strict";return(' + store.localPrefix + element.attributes['s-bind'].value + ');')();
            break;
        case "text":
        case "email":
            element.onkeyup = function (event) {
                new Function('"use strict";var value = ' + JSON.stringify(event.target.value) + ';' + store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value;')();
            };
            element.value = Function('"use strict";return(' + store.localPrefix + element.attributes['s-bind'].value + ');')();
            setInner = true;
            break;
        case undefined:
            switch (element.tagName) {
                case "SPAN":
                    element.value = Function('"use strict";return (' + 'store.data().' + element.attributes['s-bind'].value + ')')();
                    if (element.innerHTML !== '') {
                        // Parse the code from existing innerHTML
                        let code = element.innerHTML.match(/{{([^}]+)}}/);
                        if (code && code.length > 0) {
                            let codeValue = new Function('"use strict";return ' + code[1] + ';')();
                            let text = element.innerHTML.replace(element.innerHTML.match(/{{([^}]+)}}/)[0], codeValue);
                            element.innerHTML = text;
                        }
                    }
                    // else {
                    //     element.innerHTML = new Function('"use strict";return ' + store.localPrefix + element.attributes['s-bind'].value)();
                    // }
                    break;
                default:
                    element.value = Function('"use strict";return (' + 'store.data().' + element.attributes['s-bind'].value + ')')();
                    setInner = true;
            }

    }
    if (setInner) {
        element.innerHTML = new Function('"use strict";return ' + store.localPrefix + element.attributes['s-bind'].value)();
    }
}

/**
 * Set elements sensible visibility
 */
function ifElements() {
    let ifElements = document.querySelectorAll(['[s-if]']);
    ifElements.forEach((element) => {
        try {
            const display = new Function('"use strict";' + ' return ' + store.localPrefix + element.getAttribute('s-if') + ';')()
            element.style.display = display ? 'block' : 'none';
        } catch (error) {
            console.error(error.message);
        }
    })
}
