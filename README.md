# SensibleJS

Super lightweight Javascript sensible utilities

*** DO NOT USE IN PRODUCTION ***

## Getting Started



### Installing

```
npm i sensibljs
```
Start by referencing the script

```
<script src="sensible.js">
```
Then in your html document create the elements that you need. In this example we have a simple form.
```
<form>
    <label for="name">Name</>
    <input id="name" type="text" placeholder="Name">
    <input id="email" type="email" placeholder="Email address">
</form>
```
Now configure the elements that will be sensed. This is done by using the `s-bind` directive.
This is a basic 2 field example that declares 2 variables.
Sensiblejs will detect this and configure the variable and bind it to the element. 
```
<form>
    <label for="name">Name</>
    <input s-bind="name" id="name" type="text" placeholder="Name">
    <input s-bind="email" id="email" type="email" placeholder="Email address">
</form>
```
Now anything you type inside either element will automatically update the variable specified.

You can also specify to show or hide an element based on an expression. For this you need to use the
`s-if` directive.
```
<form>
    <label for="name">Name</>
    <input s-bind="name" id="name" type="text" placeholder="Name">
    <input s-bind="email" id="email" type="email" placeholder="Email address">
    <button s-if="name.length > 0">Create record</button>
</form>
```
In the example above we added a button, and it has the `v-if` directive with the expression
`name.length > 0` meaning that the button will be visible if the length of the variable name
is larger than zero.

Furthermore, you can dynamically specify css properties to sense variables value changes. Let's say
that you want to make the background color of the name field to green once it reached at least 5 characters.
To accomplish this you need to use the `s-css` directive.
```
<form>
    <label for="name">Name</>
    <input s-bind="name" id="name" type="text" placeholder="Name">
    <input s-bind="email" id="email" type="email" placeholder="Email address">
    <button s-if="name.length > 0" s-css="backgroundColor: [[name.length >= 5 ? 'green' : 'white']]">Create record</button>
</form>
```


That is all you need to start.

As you have more variables to sense, it is better to declare all by declaring them in the store object.

The store object allows you to specify the persistence of the data, a way to prefix your variables, and declare
the variables you will be using.

The store object has to be declared this way:
```
<script>
    let store = {
        persist: true,
        localPrefix: '__',
        data: {
            results: {
                type: Array, default: [
                    {fullName: 'Fulano de Tal', email: 'fulano@detal.com', phone: '7871234567'},
                    {fullName: 'Mengano de Tal', email: 'mengano@detal.com', phone: '7871234568'},
                ]
            },
            show: {type: Boolean, default: true, callBack: function() {console.log(show)},
        },
    };
</script>
```
In the example above we are declaring that the **store** will persist the data in the browser's local storage engine,
specified __ as the prefix of every persisted variable, and the **data** property which will have the variables and
properties of these variables. The syntax for declaring a variable inside the data property is:
```
{variable_name: {
    type: Array|Object|String|Number|etc..., 
    default: 'a default value', 
    callBack: a function that will be executed each time the variable changes.
}
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
