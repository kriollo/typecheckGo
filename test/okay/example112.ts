// Correct: Recursive type alias
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
const data: JSONValue = { key: "value" };
