package parser

import (
	"testing"
)

func TestDestructuringParameters(t *testing.T) {
	tests := []struct {
		name string
		code string
	}{
		{
			name: "object destructuring with rename",
			code: `function setup(props, { emit: $emit }) { return 1; }`,
		},
		{
			name: "object destructuring simple",
			code: `function setup({ x, y }) { return x + y; }`,
		},
		{
			name: "array destructuring",
			code: `function setup([a, b]) { return a + b; }`,
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
