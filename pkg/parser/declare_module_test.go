package parser

import (
	"testing"
)

func TestDeclareModuleStatement(t *testing.T) {
	tests := []struct {
		name string
		code string
	}{
		{
			name: "declare module with single quotes",
			code: `declare module 'versaTypes' {
				type VersaParamsFetch = {
					url: string;
				};
			}`,
		},
		{
			name: "declare module with double quotes",
			code: `declare module "myModule" {
				export interface MyInterface {
					id: number;
				}
			}`,
		},
		{
			name: "declare module with exports",
			code: `declare module 'test' {
				type Foo = string;
				export { Foo };
			}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseCode(tt.code, "test.d.ts")
			if err != nil {
				t.Errorf("ParseCode() error = %v", err)
			}
		})
	}
}
