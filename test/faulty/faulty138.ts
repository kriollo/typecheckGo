// Error: Async/await type mismatch
async function getData(): Promise<number> {
  return "42";
}
