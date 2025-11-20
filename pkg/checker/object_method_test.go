package checker

import (
	"testing"

	"tstypechecker/pkg/parser"
	"tstypechecker/pkg/types"
)

func TestObjectMethodScope(t *testing.T) {
	code := `
export default defineComponent({
    methods: {
        async myMethod() {
            const a = 42;
            console.log(a);
        }
    }
});
`

	file, err := parser.ParseCode(code, "test.ts")
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	tc := NewWithModuleResolver(".")
	tc.globalEnv.Objects["console"] = types.Any
	tc.globalEnv.Objects["defineComponent"] = types.Any

	errors := tc.CheckFile("test.ts", file)

	for _, err := range errors {
		t.Logf("Error: %s (line %d, col %d)", err.Message, err.Line, err.Column)
		if err.Code == "TS2304" && err.Message == "Cannot find name 'a'." {
			t.Errorf("FAILED: Variable 'a' should be found in method scope")
		}
	}

	if len(errors) == 0 {
		t.Log("SUCCESS: No errors found")
	}
}
