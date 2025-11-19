// Test tagged template literals
const html = (strings: any) => strings;

const result = html`<div>Hello</div>`;

const obj = {
    render: (data: any) => html`<span>test</span>`
};
