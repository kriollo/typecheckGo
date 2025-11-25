// Error: Recursive type alias without proper base case
type JSONValue = string | number | boolean | JSONValue[];
const data: JSONValue = { key: "value" };
