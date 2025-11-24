const fetchData = async () => { return 42; }

async function process() { const data = await fetchData(); return data; }
var proc = process;
