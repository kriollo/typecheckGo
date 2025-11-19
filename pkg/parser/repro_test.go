package parser

import (
	"testing"
)

func TestReproErrors(t *testing.T) {
	tests := []struct {
		name string
		code string
	}{
		{
			name: "Object literal with template string",
			code: `const x = {
				id: "${row.id}",
				action: "delete"
			};`,
		},
		{
			name: "Arrow function with typed parameters",
			code: `const f = (ing, inp: string) => { return true; };`,
		},
		{
			name: "Import type",
			code: `import type { Ref } from 'vue';`,
		},
		{
			name: "Import default",
			code: `import formEntrada from '@/jscontrollers/bodega/masters';`,
		},
		{
			name: "Object literal with method shorthand",
			code: `const x = {
				method() { return 1; },
				async asyncMethod() { return 2; }
			};`,
		},
		{
			name: "Object literal with computed property",
			code: `const x = {
				[key]: "value"
			};`,
		},
		{
			name: "Destructuring in parameters",
			code: `const f = ({ x, y }) => x + y;`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseCode(tt.code, "test.ts")
			if err != nil {
				t.Errorf("ParseCode() error = %v", err)
			}
		})
	}
}
