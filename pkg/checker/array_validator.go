package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// ArrayValidator handles deep validation of array types
type ArrayValidator struct {
	tc *TypeChecker
}

// NewArrayValidator creates a new array validator
func NewArrayValidator(tc *TypeChecker) *ArrayValidator {
	return &ArrayValidator{tc: tc}
}

// ValidateArrayLiteral validates array literal against expected type
func (av *ArrayValidator) ValidateArrayLiteral(
	arrayLit *ast.ArrayExpression,
	expectedType *types.Type,
	filename string,
) {
	if av == nil || av.tc == nil || expectedType == nil {
		return
	}

	// Handle array type
	if expectedType.Kind == types.ArrayType {
		av.validateArrayElements(arrayLit.Elements, expectedType.ElementType, filename, 1)
		return
	}

	// Handle tuple type
	if expectedType.Kind == types.TupleType {
		av.validateTupleElements(arrayLit.Elements, expectedType.Types, filename)
		return
	}
}

// validateArrayElements validates all elements recursively
func (av *ArrayValidator) validateArrayElements(
	elements []ast.Expression,
	expectedElementType *types.Type,
	filename string,
	depth int,
) {
	if expectedElementType == nil {
		return
	}

	for _, elem := range elements {
		// Handle nested arrays
		if nestedArray, ok := elem.(*ast.ArrayExpression); ok {
			if expectedElementType.Kind == types.ArrayType {
				// Nested array expected
				av.validateArrayElements(
					nestedArray.Elements,
					expectedElementType.ElementType,
					filename,
					depth+1,
				)
			} else {
				// Expected non-array element but got array
				av.tc.addError(
					filename,
					elem.Pos().Line,
					elem.Pos().Column,
					av.buildNestedArrayError(expectedElementType, depth),
					"TS2322",
					"error",
				)
			}
		} else {
			// Regular element - check type
			elemType := av.tc.inferencer.InferType(elem)
			if !av.tc.isAssignableTo(elemType, expectedElementType) {
				av.tc.addError(
					filename,
					elem.Pos().Line,
					elem.Pos().Column,
					av.buildElementError(elemType, expectedElementType),
					"TS2322",
					"error",
				)
			}
		}
	}
}

// validateTupleElements validates tuple elements
func (av *ArrayValidator) validateTupleElements(
	elements []ast.Expression,
	expectedTypes []*types.Type,
	filename string,
) {
	if len(elements) != len(expectedTypes) {
		// Length mismatch already reported elsewhere
		return
	}

	for i, elem := range elements {
		if i >= len(expectedTypes) {
			break
		}

		expectedType := expectedTypes[i]
		elemType := av.tc.inferencer.InferType(elem)

		if !av.tc.isAssignableTo(elemType, expectedType) {
			av.tc.addError(
				filename,
				elem.Pos().Line,
				elem.Pos().Column,
				av.buildElementError(elemType, expectedType),
				"TS2322",
				"error",
			)
		}
	}
}

// InferArrayDepth determines the depth of nested arrays
func (av *ArrayValidator) InferArrayDepth(expr ast.Expression) int {
	arrayExpr, ok := expr.(*ast.ArrayExpression)
	if !ok || len(arrayExpr.Elements) == 0 {
		return 0
	}

	maxDepth := 0
	for _, elem := range arrayExpr.Elements {
		depth := av.InferArrayDepth(elem)
		if depth > maxDepth {
			maxDepth = depth
		}
	}

	return maxDepth + 1
}

// buildNestedArrayError creates error message for nested array mismatch
func (av *ArrayValidator) buildNestedArrayError(
	expectedType *types.Type,
	depth int,
) string {
	brackets := ""
	for i := 0; i < depth; i++ {
		brackets += "[]"
	}

	return "Type '" + expectedType.String() + brackets +
		"' is not assignable to type '" + expectedType.String() + "[]'."
}

// buildElementError creates error message for element type mismatch
func (av *ArrayValidator) buildElementError(
	actualType *types.Type,
	expectedType *types.Type,
) string {
	return "Type '" + actualType.String() +
		"' is not assignable to type '" + expectedType.String() + "'."
}
