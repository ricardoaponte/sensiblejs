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
                titleColor: {type: String, default: '#FFFFFF'},
                backgroundColor: {type: String, default: '#5a67d8'},
                birthDate: {type: String, default: '1969-08-16'},
                birthDateTime: {type: String, default: '1969-08-16T20:00'},
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

**Example:** `<div s-bind="name">...</div>`

`s-bind` Makes a 2 way binding between the element and the variable (name).

---

### `s-if`

**Example:** `<div s-if="name.length > 0">...</div>`

`s-bind` Shows or hides the element based on boolean result from expression.

---

### `s-css`

**Example:** `<div s-css="background-color: backgroundColor, color: color">...</div>`

`s-css` Applies CSSShows or hides the element based on boolean result from expression.

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
