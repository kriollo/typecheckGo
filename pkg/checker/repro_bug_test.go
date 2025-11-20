package checker

import (
	"testing"

	"tstypechecker/pkg/parser"
	"tstypechecker/pkg/types"
)

func TestReproBug(t *testing.T) {
	code := `
export default defineComponent({
    methods: {
        async generarFileBarCode() {
            const a = document.createElement('a');
            a.remove();
        },
    },
});
`

	file, err := parser.ParseCode(code, "repro.ts")
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	tc := NewWithModuleResolver(".")
	// Mock document global
	tc.globalEnv.Objects["document"] = types.Any

	errors := tc.CheckFile("repro.ts", file)

	for _, err := range errors {
		t.Logf("Error: %s", err.Message)
		if err.Code == "TS2304" && err.Message == "Cannot find name 'a'." {
			t.Errorf("Failed to find variable 'a'")
		}
	}
}
