# SensibleJS

Reactive UI in ~10KB. No build step. No virtual DOM. No dependencies. Just HTML attributes.

```html
<script src="sensibljs.min.js" defer></script>

<input s-bind="name" placeholder="Your name">
<p s-bind="name">Hello, {name}!</p>
```

That's a working two-way binding. Type in the input, the paragraph updates.

## Install

**CDN / direct download** (recommended for what this tool is designed for):
```html
<script src="sensibljs.min.js" defer></script>
```

**npm:**
```
npm i sensibljs
```

## Quick Start

Define a store with your variables, then use directives in your HTML:

```html
<script src="sensibljs.min.js" defer></script>

<input s-bind="name" placeholder="Name">
<p s-bind="name" s-if="name.length > 0">Hello, {name}!</p>
<button s-click="count++">Clicked <span s-bind="count">{count}</span> times</button>

<script>
let store = {
    persist: true,
    data: {
        name:  { type: String, default: '' },
        count: { type: Number, default: 0 }
    }
};
</script>
```

That's it. No initialization call needed — SensibleJS detects the store and starts automatically.

## Store Configuration

The store object controls persistence and declares your reactive variables:

```js
let store = {
    persist: true,       // Save to localStorage (default: true)
    localPrefix: '__',   // Prefix for stored keys (default: '__')
    data: {
        username: {
            type: String,
            default: 'guest',
            persist: true,           // Per-variable persistence override
            callBack: function() {   // Runs when the value changes
                console.log('Username changed to:', this);
            }
        },
        items: {
            type: Array,
            default: [{ id: 1, text: 'First item' }],
            persist: false
        },
        settings: {
            type: Object,
            default: { theme: 'dark', lang: 'en' }
        },
        visible: {
            type: Boolean,
            default: true
        },
        count: {
            type: Number,
            default: 0
        }
    }
};
```

### Variable Types

| Type | Description |
| --- | --- |
| `String` | Text values. Default input type. |
| `Number` | Numeric values. Works with `number`, `range` inputs. |
| `Boolean` | True/false. Works with `checkbox` inputs. |
| `Array` | Lists. Used with `s-for`. Mutations (`push`, `pop`, `splice`, etc.) are observed. |
| `Object` | Key-value pairs. Property changes are observed. |

### Variable Options

| Option | Description |
| --- | --- |
| `type` | JavaScript type constructor (`String`, `Number`, `Array`, etc.) |
| `default` | Initial value |
| `persist` | `true`/`false` — override the store-level persist setting for this variable |
| `callBack` | Function called whenever the value changes. `this` is the new value. |
| `computed` | Expression string — makes this a read-only computed variable (no `type` or `default` needed) |

If no store is defined, SensibleJS creates one automatically and detects variables from `s-bind` attributes in the DOM.

## Directives

### `s-bind` — Two-Way Data Binding

Connects an element to a variable. Works with inputs, textareas, selects, and display elements.

```html
<!-- Text input: updates on keyup -->
<input type="text" s-bind="name">

<!-- Update on blur instead of keyup -->
<input type="text" s-bind="name" s-blur>

<!-- Display the value (with template expressions) -->
<p s-bind="name">Hello, {name}!</p>

<!-- Checkbox: binds to a Boolean -->
<input type="checkbox" s-bind="isActive">

<!-- Radio buttons -->
<input type="radio" s-bind="color" value="red" name="color"> Red
<input type="radio" s-bind="color" value="blue" name="color"> Blue

<!-- Select -->
<select s-bind="option">
    <option value="a">Option A</option>
    <option value="b">Option B</option>
</select>

<!-- Color, date, number, range -->
<input type="color" s-bind="themeColor">
<input type="date" s-bind="startDate">
<input type="number" s-bind="quantity">
<input type="range" s-bind="volume" min="0" max="100">

<!-- Image src binding -->
<img s-bind="avatarUrl">
```

### `s-if` — Conditional Rendering

Show or hide elements based on an expression. The element's original display style (flex, grid, inline, etc.) is preserved.

```html
<div s-if="isLoggedIn">Welcome back!</div>
<div s-if="!isLoggedIn">Please log in.</div>

<!-- Works with any expression -->
<button s-if="items.length > 0">Checkout</button>
<p s-if="name != ''">Hello, {name}</p>
```

### `s-for` — List Rendering

Iterate over arrays. Uses keyed reconciliation — existing DOM elements are reused, not rebuilt.

```html
<ul>
    <li s-for="item of items" s-key="item.id">
        {item.name} - ${item.price}
    </li>
</ul>

<!-- Access the index -->
<div s-for="user of users" s-key="user.email">
    {index + 1}. {user.name} ({user.email})
</div>

<!-- Images inside loops -->
<div s-for="photo of photos">
    <img s-src="{photo.url}">
    <span>{photo.caption}</span>
</div>
```

The `s-key` attribute tells SensibleJS how to identify each item (e.g., `s-key="item.id"`). When items change, only affected elements are updated. Without `s-key`, the index is used.

### `s-css` — Dynamic Styling

Bind CSS properties to variables or expressions.

```html
<!-- Direct variable binding -->
<div s-css="background-color: bgColor; color: textColor">
    Styled content
</div>

<!-- Ternary expressions -->
<div s-css="background-color: {score >= 50 ? 'green' : 'red'}">
    {score}%
</div>

<!-- Template expressions -->
<div s-css="width: {percentage + '%'}; opacity: {opacity / 100}">
    Progress bar
</div>
```

### `s-class` — Conditional CSS Classes

Toggle CSS classes based on expressions. Uses semicolon-separated `class: expression` pairs.

```html
<!-- Toggle a single class -->
<input s-class="valid-border: email.length > 5; invalid-border: email.length <= 5">

<!-- Multiple classes on one element -->
<div s-class="active: isActive; highlighted: score > 90; dimmed: !isVisible">
    Content
</div>
```

### `s-attr` — Dynamic HTML Attributes

Set or remove HTML attributes based on expressions. If the expression evaluates to `false`, `null`, or `undefined`, the attribute is removed. `true` sets an empty attribute (e.g., `disabled`). Any other value sets the attribute to that value.

```html
<!-- Disable a button conditionally -->
<button s-attr="disabled: !formValid">Submit</button>

<!-- Dynamic href -->
<a s-attr="href: linkUrl; target: openInNew ? '_blank' : '_self'">Link</a>

<!-- Toggle aria attributes -->
<div s-attr="aria-hidden: !isVisible; aria-expanded: isOpen">Panel</div>
```

### `s-on` — General Event Binding

Bind any DOM event with optional modifiers. Format: `event.modifier: expression`. Multiple bindings separated by semicolons.

**Modifiers:**
| Modifier | Effect |
| --- | --- |
| `.prevent` | Calls `event.preventDefault()` |
| `.stop` | Calls `event.stopPropagation()` |
| `.enter` | Only fires on Enter key |
| `.escape` | Only fires on Escape key |

```html
<!-- Keyboard events -->
<input s-on="keydown.enter: submitForm()">
<div s-on="keydown.escape: closeModal()">

<!-- Prevent default form submission -->
<form s-on="submit.prevent: handleSubmit()">

<!-- Multiple events -->
<div s-on="mouseenter: hover = true; mouseleave: hover = false">
    Hover me
</div>
```

### `s-click` — Click Handler

Execute an expression when the element is clicked.

```html
<button s-click="count++">Increment</button>
<button s-click="count = 0">Reset</button>
<button s-click="items.push({id: Date.now(), text: 'New'})">Add Item</button>
```

### `s-unclick` — Click Away Handler

Execute an expression when a click occurs *outside* the element.

```html
<div s-unclick="menuOpen = false">
    <!-- Dropdown menu that closes when you click elsewhere -->
</div>
```

### `s-cloak` — Hide Until Ready

Prevents the flash of raw template expressions (e.g., `{name}`) before SensibleJS initializes. The element stays hidden until all data is bound, then the attribute is automatically removed.

```html
<p s-cloak s-bind="name">Hello, {name}!</p>
```

No CSS needed — SensibleJS injects `[s-cloak] { display: none !important }` automatically.

### `s-data` — Inline Variable Definition

Define variables directly in HTML without a store.

```html
<div s-data="{isOpen: false, message: 'Hello'}">
    <button s-click="isOpen = !isOpen">Toggle</button>
    <div s-if="isOpen" s-bind="message">{message}</div>
</div>
```

### `s-callback` — Inline Change Callback

Execute a function when a bound variable changes. Defined on the element, not in the store.

```html
<input s-bind="email" s-callback="validateEmail()">
```

If both `s-callback` and a store-level `callBack` are defined, the store-level callback takes precedence.

### `s-debounce` — Debounced Input

Delay reactive updates on text inputs until the user stops typing. Useful for search fields, API calls, or expensive computations. Value is in milliseconds.

```html
<!-- Wait 300ms after the user stops typing before updating -->
<input s-bind="search" s-debounce="300">

<!-- Works with text, email, and textarea -->
<textarea s-bind="notes" s-debounce="500"></textarea>
```

Without `s-debounce`, the bound variable updates on every keystroke. With it, the update is delayed until the specified pause — reducing unnecessary re-renders and making downstream effects (like filtering a list or calling a function) more efficient.

### `s-src` — Dynamic Image Source

Set an image's `src` attribute from a variable. Particularly useful inside `s-for` loops.

```html
<img s-src="{user.avatar}">
```

## Computed Values

Define variables whose values are derived from other variables. They update automatically whenever their dependencies change.

```js
let store = {
    data: {
        price:    { type: Number, default: 10 },
        quantity: { type: Number, default: 1 },
        subtotal: { computed: 'price * quantity' },
        tax:      { computed: 'subtotal * 0.07' },
        total:    { computed: 'subtotal + tax' }
    }
};
```

```html
<p s-bind="total">Total: ${total.toFixed(2)}</p>
```

Computed values are read-only getters — you can't assign to them directly. They recalculate whenever any variable referenced in their expression changes.

## Contenteditable Support

Elements with `contenteditable="true"` can be bound with `s-bind` for inline rich text editing:

```html
<div contenteditable="true" s-bind="notes"></div>
```

The bound variable syncs with the element's `innerText` on every input event.

## Template Expressions

Use `{expression}` syntax inside element content to embed dynamic values:

```html
<p s-bind="name">Hello, {name}!</p>
<span s-bind="count">{count} item(s)</span>
<div s-bind="price">Total: ${price * 1.07}</div>
```

Expressions support standard JavaScript: ternaries, arithmetic, string concatenation, property access, and function calls like `parseInt()`, `Math.max()`, etc.

## Security

Expressions are evaluated in a sandboxed scope. Dangerous globals (`document`, `window`, `fetch`, `XMLHttpRequest`, `Function`, `setTimeout`, `setInterval`) are blocked inside all directive expressions. Safe globals like `Math`, `parseInt`, `JSON`, and `console` remain accessible.

This means even if untrusted content is rendered into the DOM, expressions cannot:
- Access or modify the document
- Make network requests
- Create new functions or use eval
- Set timers

## Persistence

When `persist: true` (the default), variable values are saved to `localStorage` and restored on page load. This means user input, preferences, and state survive page refreshes with zero additional code.

Control persistence per-variable:

```js
data: {
    userPrefs: { type: Object, default: {}, persist: true },   // Saved
    tempInput: { type: String, default: '', persist: false }    // Not saved
}
```

Stored keys are prefixed with `localPrefix` (default `'__'`) to avoid collisions.

## Supported Input Types

| Input Type | Binding Behavior |
| --- | --- |
| `text`, `email`, `textarea` | Updates on `keyup` (or `blur` with `s-blur`) |
| `checkbox` | Two-way boolean binding |
| `radio` | Binds to the selected value |
| `select` | Binds to the selected option value |
| `number`, `range` | Updates on `input` event |
| `color` | Updates on `input` event |
| `date`, `datetime-local` | Updates on `input` event |
| `img` | Sets the `src` attribute |

## Browser Support

SensibleJS uses `Object.defineProperty`, `Promise`, `Map`, `Set`, and arrow functions. It works in all modern browsers (Chrome, Firefox, Safari, Edge). No IE11 support.

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](https://gist.github.com/ricardoaponte/12a8f11d720d1f904b17e48cbd2dd03e) for details.

## License

MIT License - Copyright (c) 2026 Ricardo Aponte Yunqué

## Acknowledgments

- Blaize Stewart for the Observables logic
- @stimulus for the domReady function
