package main

import (
	"fmt"
	"os/exec"
	"strings"
)

// TypeCheckResult represents the result of type checking
type TypeCheckResult struct {
	Success bool
	Output  string
	Errors  []string
}

// CheckTypeScriptCode checks TypeScript code using the tscheck command
func CheckTypeScriptCode(code, filename string) (*TypeCheckResult, error) {
	cmd := exec.Command("tscheck", "check", "--code", code, "--filename", filename)
	output, err := cmd.CombinedOutput()

	result := &TypeCheckResult{
		Success: err == nil,
		Output:  string(output),
	}

	if err != nil {
		// Parse errors from output if needed
		result.Errors = strings.Split(string(output), "\n")
	}

	return result, nil
}

// CheckTypeScriptCodeJSON checks TypeScript code and returns JSON output
func CheckTypeScriptCodeJSON(code, filename string) (string, error) {
	cmd := exec.Command("tscheck", "check", "--code", code, "--filename", filename, "--format", "json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return string(output), fmt.Errorf("type check failed: %w", err)
	}
	return string(output), nil
}

// GetAST returns the AST for TypeScript code
func GetAST(code, filename string) (string, error) {
	cmd := exec.Command("tscheck", "check", "--code", code, "--filename", filename, "--ast")
	output, err := cmd.CombinedOutput()
	return string(output), err
}

func main() {
	fmt.Println("=== TypeScript Type Checker Examples ===\n")

	// Example 1: Valid TypeScript code
	fmt.Println("1. Checking valid TypeScript code:")
	validCode := `
const greeting: string = "Hello, World!";
const count: number = 42;

function add(a: number, b: number): number {
	return a + b;
}

const result = add(5, 10);
console.log(greeting, count, result);
`
	result1, _ := CheckTypeScriptCode(validCode, "valid.ts")
	fmt.Printf("   Success: %v\n", result1.Success)
	fmt.Printf("   Output: %s\n", result1.Output)

	// Example 2: Code with type errors
	fmt.Println("\n2. Checking code with type errors:")
	invalidCode := `
const x: number = 5;
const y: string = x; // Error: number is not assignable to string

function greet(name: string): void {
	console.log("Hello, " + name);
}

greet(123); // Error: number is not assignable to string
`
	result2, _ := CheckTypeScriptCode(invalidCode, "invalid.ts")
	fmt.Printf("   Success: %v\n", result2.Success)
	fmt.Printf("   Output:\n%s\n", result2.Output)

	// Example 3: Undefined variable
	fmt.Println("\n3. Checking code with undefined variable:")
	undefinedCode := `
let x = someUndefinedVariable;
console.log(x);
`
	result3, _ := CheckTypeScriptCode(undefinedCode, "undefined.ts")
	fmt.Printf("   Success: %v\n", result3.Success)
	fmt.Printf("   Output:\n%s\n", result3.Output)

	// Example 4: Advanced types (infer keyword)
	fmt.Println("\n4. Checking advanced types with infer:")
	advancedCode := `
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

type StringArray = string[];
type Element = ArrayElement<StringArray>;

type Func = () => number;
type Return = ReturnType<Func>;
`
	result4, _ := CheckTypeScriptCode(advancedCode, "advanced.ts")
	fmt.Printf("   Success: %v\n", result4.Success)
	fmt.Printf("   Output: %s\n", result4.Output)

	// Example 5: JSON output format
	fmt.Println("\n5. Getting JSON output:")
	jsonCode := `
let x = undefinedVar;
let y: number = "string";
`
	jsonOutput, _ := CheckTypeScriptCodeJSON(jsonCode, "errors.ts")
	fmt.Printf("   JSON Output:\n%s\n", jsonOutput)

	// Example 6: Get AST
	fmt.Println("\n6. Getting AST:")
	astCode := `
interface User {
	name: string;
	age: number;
}
`
	astOutput, _ := GetAST(astCode, "user.ts")
	if len(astOutput) > 500 {
		fmt.Printf("   AST Output (truncated):\n%s...\n", astOutput[:500])
	} else {
		fmt.Printf("   AST Output:\n%s\n", astOutput)
	}

	// Example 7: Compile-time validation for generated code
	fmt.Println("\n7. Validating generated TypeScript code:")
	generatedCode := generateTypeScriptInterface("User", map[string]string{
		"id":    "number",
		"name":  "string",
		"email": "string",
		"age":   "number",
	})

	fmt.Printf("   Generated code:\n%s\n", generatedCode)
	result7, _ := CheckTypeScriptCode(generatedCode, "generated.ts")
	fmt.Printf("   Validation: %v\n", result7.Success)
	fmt.Printf("   Output: %s\n", result7.Output)
}

// generateTypeScriptInterface is a helper function that generates TypeScript interfaces
// This demonstrates how you might use the type checker to validate generated code
func generateTypeScriptInterface(name string, fields map[string]string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("interface %s {\n", name))
	for fieldName, fieldType := range fields {
		sb.WriteString(fmt.Sprintf("  %s: %s;\n", fieldName, fieldType))
	}
	sb.WriteString("}\n\n")

	// Generate a sample instance
	sb.WriteString(fmt.Sprintf("const example%s: %s = {\n", name, name))
	first := true
	for fieldName := range fields {
		if !first {
			sb.WriteString(",\n")
		}
		first = false
		sb.WriteString(fmt.Sprintf("  %s: null as any", fieldName))
	}
	sb.WriteString("\n};\n")

	return sb.String()
}
