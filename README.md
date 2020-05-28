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
