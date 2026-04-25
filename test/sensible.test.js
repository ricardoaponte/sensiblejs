const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  \u2713 ${name}`);
    } catch (e) {
        failed++;
        console.log(`  \u2717 ${name}`);
        console.log(`    ${e.message}`);
    }
}

// Helper: compare array elements without checking overridden methods
function assertArrayElements(actual, expected) {
    assert.strictEqual(actual.length, expected.length, `Expected length ${expected.length}, got ${actual.length}`);
    for (let i = 0; i < expected.length; i++) {
        assert.deepStrictEqual(actual[i], expected[i], `Mismatch at index ${i}: expected ${expected[i]}, got ${actual[i]}`);
    }
}

// Load sensible — the UMD wrapper exports the factory return value.
// Since navigator is undefined in Node, it skips auto-init and returns the internals.
const sensible = require('../sensible.js');

// --- Unit Tests ---

console.log('\nUnit Tests:');

test('sensible exports internals', function() {
    assert.ok(sensible, 'sensible should be defined');
    assert.ok(typeof sensible.exec === 'function', 'exec should be a function');
    assert.ok(typeof sensible.hasCode === 'function', 'hasCode should be a function');
    assert.ok(typeof sensible.getCode === 'function', 'getCode should be a function');
    assert.ok(typeof sensible.Observer === 'function', 'Observer should be a function');
    assert.ok(typeof sensible.ArrayObserver === 'function', 'ArrayObserver should be a function');
});

test('hasCode detects template expressions', function() {
    assert.strictEqual(sensible.hasCode('{name}'), true);
    assert.strictEqual(sensible.hasCode('Hello {name}!'), true);
    assert.strictEqual(sensible.hasCode('no braces here'), false);
    assert.strictEqual(sensible.hasCode(''), false);
});

test('hasCode handles edge cases', function() {
    assert.strictEqual(sensible.hasCode('{a} and {b}'), true);
    assert.strictEqual(sensible.hasCode('only { open'), false);
    assert.strictEqual(sensible.hasCode('only } close'), false);
});

test('exec evaluates simple expressions', function() {
    assert.strictEqual(sensible.exec('1 + 1'), 2);
    assert.strictEqual(sensible.exec('"hello"'), 'hello');
    assert.strictEqual(sensible.exec('true'), true);
});

test('getCode transforms template syntax', function() {
    const result = sensible.getCode("'{name}'");
    assert.strictEqual(result, "'' + name + ''");
});

// --- ArrayObserver Tests ---

console.log('\nArrayObserver Tests:');

test('ArrayObserver notifies on push', function() {
    const arr = [];
    let notified = false;
    const observer = new sensible.ArrayObserver(arr);
    observer.Observe(function(val, method) {
        notified = true;
        assert.strictEqual(method, 'push');
    });
    arr.push('item');
    assert.strictEqual(notified, true);
    assert.strictEqual(arr.length, 1);
    assert.strictEqual(arr[0], 'item');
});

test('ArrayObserver notifies on pop', function() {
    const arr = ['a', 'b'];
    let notified = false;
    const observer = new sensible.ArrayObserver(arr);
    observer.Observe(function(val, method) {
        notified = true;
        assert.strictEqual(method, 'pop');
    });
    const popped = arr.pop();
    assert.strictEqual(notified, true);
    assert.strictEqual(popped, 'b');
    assert.strictEqual(arr.length, 1);
});

test('splice removes elements from the array', function() {
    const arr = ['a', 'b', 'c', 'd'];
    let notified = false;
    const observer = new sensible.ArrayObserver(arr);
    observer.Observe(function(val, method) {
        notified = true;
        assert.strictEqual(method, 'splice');
    });
    const removed = arr.splice(1, 2);
    assert.strictEqual(notified, true);
    assertArrayElements(arr, ['a', 'd']);
    assertArrayElements(removed, ['b', 'c']);
});

test('splice with insertion modifies the array', function() {
    const arr = ['a', 'b', 'c'];
    const observer = new sensible.ArrayObserver(arr);
    observer.Observe(function() {});
    arr.splice(1, 1, 'x', 'y');
    assertArrayElements(arr, ['a', 'x', 'y', 'c']);
});

test('ArrayObserver notifies on reverse', function() {
    const arr = [1, 2, 3];
    let method = null;
    const observer = new sensible.ArrayObserver(arr);
    observer.Observe(function(val, m) { method = m; });
    arr.reverse();
    assert.strictEqual(method, 'reverse');
    assertArrayElements(arr, [3, 2, 1]);
});

test('ArrayObserver notifies on shift', function() {
    const arr = ['a', 'b', 'c'];
    let method = null;
    const observer = new sensible.ArrayObserver(arr);
    observer.Observe(function(val, m) { method = m; });
    const shifted = arr.shift();
    assert.strictEqual(method, 'shift');
    assert.strictEqual(shifted, 'a');
    assertArrayElements(arr, ['b', 'c']);
});

test('ArrayObserver notifies on unshift', function() {
    const arr = ['b', 'c'];
    let method = null;
    const observer = new sensible.ArrayObserver(arr);
    observer.Observe(function(val, m) { method = m; });
    arr.unshift('a');
    assert.strictEqual(method, 'unshift');
    assertArrayElements(arr, ['a', 'b', 'c']);
});

// --- Observer Tests ---
// Note: Observer references the global `store` variable for persistence,
// so we set up a minimal global store for testing.

console.log('\nObserver Tests:');

test('Observer detects property changes', function() {
    // Observer references global `store` for persistence — provide a minimal one
    global.store = { persist: false, data: {} };
    const obj = {};
    let lastValue = null;
    const observer = new sensible.Observer(obj, 'name', false);
    observer.Observe(function(value) {
        lastValue = value;
    });
    obj.name = 'test';
    assert.strictEqual(lastValue, 'test');
    assert.strictEqual(obj.name, 'test');
    delete global.store;
});

test('Observer does not reset object properties on iteration', function() {
    global.store = { persist: false, data: { myObj: {} } };
    const obj = {};

    const props = ['first', 'second', 'third'];
    props.forEach(function(prop) {
        const observer = new sensible.Observer(obj, prop, 'myObj');
        observer.Observe(function() {});
    });

    obj.first = 'a';
    obj.second = 'b';
    obj.third = 'c';

    assert.strictEqual(obj.first, 'a');
    assert.strictEqual(obj.second, 'b');
    assert.strictEqual(obj.third, 'c');
    delete global.store;
});

// --- Security Tests ---

console.log('\nSecurity Tests:');

test('exec blocks access to document', function() {
    let threw = false;
    try {
        sensible.exec('document');
    } catch(e) {
        threw = true;
    }
    // document should be void 0 (undefined), not throw, but accessing
    // properties on it should throw
    assert.strictEqual(sensible.exec('document'), undefined);
});

test('exec blocks access to window', function() {
    assert.strictEqual(sensible.exec('window'), undefined);
});

test('exec blocks access to fetch', function() {
    assert.strictEqual(sensible.exec('fetch'), undefined);
});

test('exec blocks access to XMLHttpRequest', function() {
    assert.strictEqual(sensible.exec('XMLHttpRequest'), undefined);
});

test('exec blocks access to Function constructor', function() {
    assert.strictEqual(sensible.exec('Function'), undefined);
});

test('exec allows safe globals like Math and parseInt', function() {
    assert.strictEqual(sensible.exec('Math.max(1, 5)'), 5);
    assert.strictEqual(sensible.exec('parseInt("42")'), 42);
    assert.strictEqual(sensible.exec('isNaN("hello")'), true);
});

test('exec allows JSON operations', function() {
    assert.strictEqual(sensible.exec('JSON.stringify({a:1})'), '{"a":1}');
});

// --- Namespace Tests ---

console.log('\nNamespace Tests:');

test('_data namespace is exported', function() {
    assert.ok(sensible._data, '_data should be exported');
    assert.strictEqual(typeof sensible._data, 'object');
});

// --- Summary ---

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
