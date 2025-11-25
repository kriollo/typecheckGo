// Error: Promise type mismatch
async function fetchData(): Promise<string> {
  return 42;
}
