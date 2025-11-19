// Test de function expressions (sync y async)

const obj = {
    // Function expression regular
    regularFunc: function() {
        console.log('regular');
    },

    // Function expression con nombre
    namedFunc: function myFunc() {
        console.log('named');
        myFunc(); // recursive call
    },

    // Async function expression
    asyncFunc: async function() {
        await Promise.resolve();
        console.log('async');
    },

    // Async function expression con nombre
    asyncNamedFunc: async function myAsyncFunc() {
        await Promise.resolve();
        console.log('async named');
        await myAsyncFunc(); // recursive call
    },

    // Method shorthand (ya funcionaba)
    shorthand() {
        console.log('shorthand');
    },

    // Arrow function (ya funcionaba)
    arrow: () => {
        console.log('arrow');
    }
};

// Function expression en variable
const varFunc = function() {
    console.log('var func');
};

// Async function expression en variable
const asyncVarFunc = async function() {
    await Promise.resolve();
    console.log('async var func');
};

// Function expression como argumento
setTimeout(function() {
    console.log('timeout');
}, 1000);

// Async function expression como argumento
fetchData(async function() {
    await Promise.resolve();
    console.log('fetch callback');
});
