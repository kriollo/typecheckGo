async function main() {
    const test = (await fetchData()) as unknown as string[] | boolean;
}

function fetchData() {
    return Promise.resolve({});
}
