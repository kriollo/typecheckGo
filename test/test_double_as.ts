const test = (async () => {
    const result = (await fetchData()) as unknown as string[] | boolean;
    return result;
});
