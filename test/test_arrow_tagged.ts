// Test: Arrow function returning tagged template literal
const html = (strings: any) => strings;

const obj = {
    render: (data, type, row, meta) => html`
        <button data-value='{"id": ${data}}'>
            Click me
        </button>
    `,
};

console.log(obj);
