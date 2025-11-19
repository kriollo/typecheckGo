package parser

import (
	"testing"
)

func TestSimpleMethodWithDestructuring(t *testing.T) {
	code := `const obj = {
		method(a, { b }) {
			return a + b;
		}
	};`

	_, err := ParseCode(code, "test.ts")
	if err != nil {
		t.Errorf("ParseCode() error = %v", err)
	}
}
