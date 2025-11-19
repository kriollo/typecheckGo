package parser

import (
	"testing"
)

func TestVueComponentSetup(t *testing.T) {
	code := `const customTable = {
		props: {
			id: { type: String }
		},
		setup(props, { emit: $emit }) {
			return {};
		}
	};`

	_, err := ParseCode(code, "test.ts")
	if err != nil {
		t.Errorf("ParseCode() error = %v", err)
	}
}
