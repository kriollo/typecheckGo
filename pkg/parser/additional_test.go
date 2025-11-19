package parser

import (
	"testing"
)

func TestArrowFunctionInObjectLiteral(t *testing.T) {
	code := `const obj = {
		render: (data, type, row) => {
			return data;
		}
	};`

	_, err := ParseCode(code, "test.ts")
	if err != nil {
		t.Errorf("ParseCode() error = %v", err)
	}
}

func TestImportWithTypeKeyword(t *testing.T) {
	tests := []struct {
		name string
		code string
	}{
		{
			name: "import default and type named",
			code: `import breadcrumb, { type Breadcrumb } from '@/components/breadcrumb';`,
		},
		{
			name: "import type only",
			code: `import type { AccionData } from 'versaTypes';`,
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
