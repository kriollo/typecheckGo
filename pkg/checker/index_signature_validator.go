package checker

import (
	"fmt"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// validateIndexSignature checks that all properties in an object literal
// comply with the index signature type if one exists
func (tc *TypeChecker) validateIndexSignature(objLit *ast.ObjectExpression, declaredType *types.Type, filename string) {
	// Only validate if there's a string index signature
	if declaredType.StringIndexType == nil {
		return
	}

	// Check each property in the object literal
	for _, propNode := range objLit.Properties {
		prop, ok := propNode.(*ast.Property)
		if !ok || prop.Value == nil {
			continue
		}

		// Infer the type of the property value
		propValueType := tc.inferencer.InferType(prop.Value)

		// Check if the value type is assignable to the index signature type
		if !tc.isAssignableTo(propValueType, declaredType.StringIndexType) {
			tc.addError(filename, prop.Value.Pos().Line, prop.Value.Pos().Column,
				fmt.Sprintf("Type '%s' is not assignable to type '%s'.",
					propValueType.String(), declaredType.StringIndexType.String()),
				"TS2322", "error")
		}
	}
}
