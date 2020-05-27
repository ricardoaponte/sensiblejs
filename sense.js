function sense(store) {
    for (const variable in store.data()) {
        try {
            Object.defineProperty(this, variable, {
                get: function () {
                    return new Function('"use strict";' +
                        'return ' + store.localPrefix + variable + ';')();
                },
                set: function (value) {
                    // Set the variable
                    new Function('"use strict";' +
                        store.localPrefix + variable + ' = ' + JSON.stringify(value) + ';')();
                    // Persist it if needed
                    if (store.persist) {
                        new Function('"use strict";' +
                            'localStorage.setItem("' + store.localPrefix + variable + '",' + JSON.stringify(value) + ');')();
                    }
                    // Process data binding for elements
                    let elements = document.querySelectorAll(['[s-bind]']);
                    elements.forEach((element) => {
                        if (element.getAttribute('s-bind') === variable) {
                            element.onkeyup = function (event) {
                                new Function('"use strict";' +
                                    'var value = ' + JSON.stringify(event.target.value) + ';' +
                                    store.localPrefix + variable + ' = ' + variable + ' = value;')();
                            };
                            switch (element.type) {
                                case "text":
                                    element.value = value;
                                    break;
                                default:
                                    element.innerHTML = value;
                            }
                        }
                    })
                    // Process display of elements
                    var ifElements = document.querySelectorAll(['[s-if]']);
                    ifElements.forEach((element) => {
                        try {
                            const display = new Function('"use strict";' + ' return ' + store.localPrefix + element.getAttribute('s-if') + ';')()
                            element.style.display = display ? 'block' : 'none';
                        } catch(error) {
                            console.error(error.message);
                        }
                    })
                }
            });

        } catch(error) {
            console.error(error.message);
        }
        // Initialize store data as internal variables
        let dataSource;
        if (store.persist) {
            dataSource = localStorage.getItem(store.localPrefix + JSON.stringify(variable).replace(/['"]+/g, ''));
            try {
                dataSource = JSON.parse(dataSource);
            } catch(error) {

            }
            if (dataSource == undefined) {
                dataSource = store.data()[variable];
            }
        } else {
            dataSource = store.data()[variable];
        }
        new Function(`${store.localPrefix}${variable} = ${JSON.stringify(dataSource)}`)();
    }

    /*
    Initialize existing elements with store data
     */
    // Element visibility
    let ifElements = document.querySelectorAll(['[s-if]']);
    ifElements.forEach((element) => {
        try {
            const display = new Function('"use strict";' + ' return ' + store.localPrefix + element.getAttribute('s-if') + ' == true;')()
            element.style.display = display ? 'block' : 'none';
        } catch(error) {
            console.error(error.message);
        }
    })
    // Model bindings
    let elements = document.querySelectorAll(['[s-bind]']);
    elements.forEach((element) => {
        // TODO: Evaluate type of element
        element.innerHTML = new Function('return ' + store.localPrefix + element.attributes['s-bind'].value)();
        switch (element.type) {
            case "text":
                element.onkeyup = function (event) {
                    new Function('"use strict";' +
                        'var value = ' + JSON.stringify(event.target.value) + ';' +
                        store.localPrefix + element.attributes['s-bind'].value + ' = ' + element.attributes['s-bind'].value + ' = value' +
                        ';return;')();
                };
                element.value = Function('"use strict";' +

                    'return(' + store.localPrefix + element.attributes['s-bind'].value +
                    ');')();
                break;
            default:
                element.value = Function('"use strict";return (' + 'store.data().' + element.attributes['s-bind'].value + ')')();
        }
    })
}
