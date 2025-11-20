package checker

import (
	"testing"

	"tstypechecker/pkg/parser"
)

// BenchmarkTypeCheckerBasic benchmarks basic type checking operations
func BenchmarkTypeCheckerBasic(b *testing.B) {
	code := `
		const x: number = 42;
		const y: string = "hello";
		function add(a: number, b: number): number {
			return a + b;
		}
		const result = add(x, 10);
	`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		file, _ := parser.ParseCode(code, "bench.ts")
		tc := New()
		tc.CheckFile("bench.ts", file)
	}
}

/*
// BenchmarkTypeCheckerComplex benchmarks complex type checking with imports
func BenchmarkTypeCheckerComplex(b *testing.B) {
	code := `
		type Point = { x: number; y: number };
		interface Shape {
			area(): number;
		}
		class Circle implements Shape {
			radius: number;
			constructor(r: number) {
				this.radius = r;
			}
			area(): number {
				return Math.PI * this.radius * this.radius;
			}
		}
		const points: Point[] = [
			{ x: 1, y: 2 },
			{ x: 3, y: 4 }
		];
		const circle = new Circle(5);
	`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		file, _ := parser.ParseCode(code, "bench.ts")
		symbolTable := symbols.NewSymbolTable()
		globalEnv := types.NewGlobalEnvironment()
		tc := NewTypeChecker(symbolTable, globalEnv, nil)
		tc.CheckFile("bench.ts", file)
	}
}

// BenchmarkTypeInference benchmarks type inference
func BenchmarkTypeInference(b *testing.B) {
	code := `
		const arr = [1, 2, 3, 4, 5];
		const obj = { name: "test", value: 42 };
		const nested = { a: { b: { c: 10 } } };
	`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		file, _ := parser.ParseCode(code, "bench.ts")
		symbolTable := symbols.NewSymbolTable()
		globalEnv := types.NewGlobalEnvironment()
		tc := NewTypeChecker(symbolTable, globalEnv, nil)
		tc.CheckFile("bench.ts", file)
	}
}

// BenchmarkMemoryAllocation benchmarks memory allocation patterns
func BenchmarkMemoryAllocation(b *testing.B) {
	code := `
		const x: number = 42;
		const y: string = "test";
	`

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		file, _ := parser.ParseCode(code, "bench.ts")
		symbolTable := symbols.NewSymbolTable()
		globalEnv := types.NewGlobalEnvironment()
		tc := NewTypeChecker(symbolTable, globalEnv, nil)
		tc.CheckFile("bench.ts", file)
		tc.Clear() // Test memory cleanup
	}
}
*/
