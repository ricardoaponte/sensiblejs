# SensibleJS

Super lightweight Javascript sensible utilities

## Getting Started



### Installing

```
npm i sensibljs
```
Start by referencing the script

```
<script src="sensible.js">
```
Then declare the store object with the settings and fields needed.
```
<script>
    let store = {
        persist: true,
        localPrefix: '__',
        data() {
            return {
                show: true,
                title: {type: String, default: 'This is the default title'},
                total: {type: Number, default: 100},
                selectedOption: {type: Number, default: 0},
                fullName: {type: String, default: 'Your name'},
                email: {type: String, default: 'example@example.com'},
                phone: {type: String, default: '123-45678'},
                message: {type: String, default: 'This is a message'},
                gender: {type: String, default: 'male'},
                favcolor: {type: String, default: 'blue'},
                backgroundColor: {type: String, default: '#000'},
                birthDate: {type: String, default: ''},
                birthDateTime: {type: String, default: ''}
            }
        },
    };
</script>
```
Then call the tool passing the store object.
```
sensible(store)
```

## Documentation

There are 3 directives available to use:

| Directive | Description |
| --- | --- |
| [`s-bind`](#s-bind) | Adds "two-way data binding" to an element. |
| [`s-if`](#s-if) | Show or hide an element based on expression. |
| [`s-css`](#s-css) | Binds element css to a local variable. |

### Directives

---

### `s-bind`

**Example:** `<div s-bind="foo">...</div>`

`s-bind` Makes a 2 way binding between the element and the variable (foo).

Think of it like the `data` property of a Vue component.

**Extract Component Logic**

You can extract data (and behavior) into reusable functions:

```html
<div x-data="dropdown()">
    <button x-on:click="open">Open</button>

    <div x-show="isOpen()" x-on:click.away="close">
        // Dropdown
    </div>
</div>

<script>
    function dropdown() {
        return {
            show: false,
            open() { this.show = true },
            close() { this.show = false },
            isOpen() { return this.show === true },
        }
    }
</script>
```

> **For bundler users**, note that Alpine.js accesses functions that are in the global scope (`window`), you'll need to explicitly assign your functions to `window` in order to use them with `x-data` for example `window.dropdown = function () {}` (this is because with Webpack, Rollup, Parcel etc. `function`'s you define will default to the module's scope not `window`).


You can also mix-in multiple data objects using object destructuring:

```html
<div x-data="{...dropdown(), ...tabs()}">
```

---

### `x-init`
**Example:** `<div x-data="{ foo: 'bar' }" x-init="foo = 'baz'"></div>`

**Structure:** `<div x-data="..." x-init="[expression]"></div>`

`x-init` runs an expression when a component is initialized.

If you wish to run code AFTER Alpine has made its initial updates to the DOM (something like a `mounted()` hook in VueJS), you can return a callback from `x-init`, and it will be run after:

`x-init="() => { // we have access to the post-dom-initialization state here // }"`

---


## HTML

This tool will allow you to bind local varibles to DOM elements in an easy and light way.

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

* **Ricardo Aponte Yunqué** - *Initial work* - [ricardoaponte](https://github.com/ricardoaponte)

See also the list of [contributors](https://github.com/ricardoaponte/contributors) who participated in this project.

## License

Copyright © 2020 Ricardo Aponte and contributors
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Inspired by pure necessity
