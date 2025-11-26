// Generator Example
function* gen() {
  yield 1;
  yield 2;
}
const g = gen();
const v = g.next().value;
