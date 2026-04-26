const assert = require('assert');
const sensible = require('../sensibljs.js');

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

function bench(name, fn, iterations) {
    var start = Date.now();
    for (var i = 0; i < iterations; i++) fn();
    var elapsed = Date.now() - start;
    var opsPerSec = Math.round(iterations / (elapsed / 1000));
    console.log(`  ${name}: ${elapsed}ms for ${iterations} ops (${opsPerSec.toLocaleString()} ops/sec)`);
    return elapsed;
}

// === Expression Evaluation Performance ===

console.log('\nExpression Evaluation:');

bench('simple arithmetic (1 + 1)', function() {
    sensible.exec('1 + 1');
}, 10000);

bench('variable-like expression (true ? "yes" : "no")', function() {
    sensible.exec('true ? "yes" : "no"');
}, 10000);

bench('Math.max(1, 5, 3, 8, 2)', function() {
    sensible.exec('Math.max(1, 5, 3, 8, 2)');
}, 10000);

bench('string concatenation', function() {
    sensible.exec('"hello" + " " + "world"');
}, 10000);

bench('JSON.stringify({a:1,b:2,c:3})', function() {
    sensible.exec('JSON.stringify({a:1,b:2,c:3})');
}, 10000);

bench('complex expression (nested ternary)', function() {
    sensible.exec('5 > 3 ? (10 > 7 ? "yes" : "no") : "maybe"');
}, 10000);

// === Security Check Performance ===

console.log('\nSecurity Validation:');

bench('_dangerous regex check (safe input)', function() {
    sensible.exec('1 + 1');
}, 10000);

bench('_dangerous regex check (long safe input)', function() {
    sensible.exec('"abcdefghijklmnopqrstuvwxyz".toUpperCase()');
}, 10000);

bench('bracket validation (array access)', function() {
    sensible.exec('[1,2,3,4,5][2]');
}, 10000);

// === Template Processing Performance ===

console.log('\nTemplate Processing:');

bench('hasCode detection (positive)', function() {
    sensible.hasCode('Hello {name}, you have {count} items');
}, 100000);

bench('hasCode detection (negative)', function() {
    sensible.hasCode('Hello world, no templates here');
}, 100000);

bench('getCode transformation (simple)', function() {
    sensible.getCode("'{name}'");
}, 100000);

bench('getCode transformation (complex)', function() {
    sensible.getCode("'Hello {firstName} {lastName}, you have {count} items worth ${total}'");
}, 100000);

// === Observer Performance ===

console.log('\nObserver:');

test('Observer handles rapid updates', function() {
    global.store = { persist: false, data: {} };
    var obj = {};
    var changeCount = 0;
    var observer = new sensible.Observer(obj, 'value', false);
    observer.Observe(function() { changeCount++; });

    var start = Date.now();
    for (var i = 0; i < 10000; i++) {
        obj.value = i;
    }
    var elapsed = Date.now() - start;
    assert.strictEqual(changeCount, 10000);
    console.log(`    10,000 updates in ${elapsed}ms (${Math.round(10000 / (elapsed / 1000)).toLocaleString()} ops/sec)`);
    delete global.store;
});

test('Observer handles many properties', function() {
    global.store = { persist: false, data: {} };
    var obj = {};
    var totalChanges = 0;

    var start = Date.now();
    for (var i = 0; i < 500; i++) {
        var observer = new sensible.Observer(obj, 'prop' + i, false);
        observer.Observe(function() { totalChanges++; });
    }
    var setupElapsed = Date.now() - start;

    start = Date.now();
    for (var i = 0; i < 500; i++) {
        obj['prop' + i] = 'value' + i;
    }
    var updateElapsed = Date.now() - start;

    assert.strictEqual(totalChanges, 500);
    console.log(`    500 properties: setup ${setupElapsed}ms, updates ${updateElapsed}ms`);
    delete global.store;
});

// === ArrayObserver Performance ===

console.log('\nArrayObserver:');

test('ArrayObserver handles many pushes', function() {
    var arr = [];
    var notifyCount = 0;
    var observer = new sensible.ArrayObserver(arr);
    observer.Observe(function() { notifyCount++; });

    var start = Date.now();
    for (var i = 0; i < 5000; i++) {
        arr.push({ id: i, text: 'Item ' + i });
    }
    var elapsed = Date.now() - start;

    assert.strictEqual(arr.length, 5000);
    assert.strictEqual(notifyCount, 5000);
    console.log(`    5,000 pushes in ${elapsed}ms (${Math.round(5000 / (elapsed / 1000)).toLocaleString()} ops/sec)`);
});

test('ArrayObserver handles splice on large array', function() {
    var arr = [];
    for (var i = 0; i < 1000; i++) arr.push(i);
    var observer = new sensible.ArrayObserver(arr);
    observer.Observe(function() {});

    var start = Date.now();
    // Remove 100 items from the middle, 100 times
    for (var i = 0; i < 100; i++) {
        arr.splice(Math.floor(arr.length / 2), 1);
    }
    var elapsed = Date.now() - start;

    assert.strictEqual(arr.length, 900);
    console.log(`    100 splices on 1000-item array in ${elapsed}ms`);
});

test('ArrayObserver handles reverse on large array', function() {
    var arr = [];
    for (var i = 0; i < 5000; i++) arr.push(i);
    var observer = new sensible.ArrayObserver(arr);
    observer.Observe(function() {});

    var start = Date.now();
    for (var i = 0; i < 100; i++) {
        arr.reverse();
    }
    var elapsed = Date.now() - start;
    console.log(`    100 reverses on 5000-item array in ${elapsed}ms`);
});

// === new Function() compilation cost ===

console.log('\nnew Function() Compilation:');

bench('compile + execute (simple)', function() {
    new Function('"use strict"; return 1 + 1;')();
}, 10000);

bench('compile + execute (with blocked vars)', function() {
    var blocked = 'var document=void 0,window=void 0,self=void 0,globalThis=void 0,' +
        'fetch=void 0,XMLHttpRequest=void 0,Function=void 0,' +
        'importScripts=void 0,setTimeout=void 0,setInterval=void 0,' +
        'Proxy=void 0,Reflect=void 0;';
    new Function('"use strict";' + blocked + 'return 1 + 1;')();
}, 10000);

// === Summary ===

console.log(`\nStress Tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
