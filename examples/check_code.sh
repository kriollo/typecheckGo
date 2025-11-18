#!/bin/bash

# Example script showing how to use tscheck with --code flag
# This demonstrates checking TypeScript code from text input

echo "=== TypeScript Code Checker Examples ==="
echo ""

# Example 1: Simple valid code
echo "1. Checking valid code:"
./tscheck check --code "const x: number = 5; console.log(x);" --filename "example.ts"
echo ""

# Example 2: Type error
echo "2. Checking code with type error:"
./tscheck check --code "const x: number = 'string';" --filename "error.ts"
echo ""

# Example 3: Undefined variable
echo "3. Checking undefined variable:"
./tscheck check --code "let y = undefinedVariable;" --filename "undefined.ts"
echo ""

# Example 4: Multi-line code
echo "4. Checking multi-line code:"
CODE='
interface User {
    name: string;
    age: number;
}

const user: User = {
    name: "Alice",
    age: 30
};

function greet(u: User): void {
    console.log(`Hello, ${u.name}!`);
}

greet(user);
'
./tscheck check --code "$CODE" --filename "multiline.ts"
echo ""

# Example 5: JSON output format
echo "5. Getting JSON output:"
./tscheck check --code "let x = unknownVar;" --filename "json_test.ts" --format json
echo ""

# Example 6: TOON output format
echo "6. Getting TOON output:"
./tscheck check --code "let x: number = 'wrong';" --filename "toon_test.ts" --format toon
echo ""

# Example 7: Advanced types with infer
echo "7. Checking advanced types:"
ADVANCED_CODE='
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type StringArray = string[];
type Element = ArrayElement<StringArray>;
'
./tscheck check --code "$ADVANCED_CODE" --filename "advanced.ts"
echo ""

# Example 8: Get AST
echo "8. Getting AST output:"
./tscheck check --code "const x: number = 42;" --filename "ast_test.ts" --ast
echo ""

# Example 9: Reading from stdin
echo "9. Reading from stdin:"
echo "const message: string = 'Hello from stdin';" | ./tscheck check --code "$(cat)" --filename "stdin.ts"
echo ""

# Example 10: Function with errors
echo "10. Function with type mismatch:"
FUNC_CODE='
function add(a: number, b: number): number {
    return a + b;
}

const result = add("hello", "world"); // Error: string not assignable to number
'
./tscheck check --code "$FUNC_CODE" --filename "function_error.ts"
echo ""

echo "=== Examples completed ==="
