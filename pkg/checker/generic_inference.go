package checker

import (
	"fmt"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// GenericInferencer handles type inference for generic types
type GenericInferencer struct {
	tc *TypeChecker
}

// NewGenericInferencer creates a new generic inferencer
func NewGenericInferencer(tc *TypeChecker) *GenericInferencer {
	return &GenericInferencer{tc: tc}
}

// InferTypeArguments infers type arguments from call expression
func (gi *GenericInferencer) InferTypeArguments(
	typeParams []*ast.TypeParameter,
	params []*ast.Parameter,
	args []ast.Expression,
) map[string]*types.Type {
	typeMap := make(map[string]*types.Type)

	// Infer from arguments
	for i, arg := range args {
		if i >= len(params) {
			break
		}

		param := params[i]
		if param.ParamType == nil {
			continue
		}

		argType := gi.tc.inferencer.InferType(arg)
		gi.inferFromTypes(param.ParamType, argType, typeMap)
	}

	return typeMap
}

// inferFromTypes infers type parameters by matching parameter type with argument type
func (gi *GenericInferencer) inferFromTypes(
	paramType ast.TypeNode,
	argType *types.Type,
	typeMap map[string]*types.Type,
) {
	switch pt := paramType.(type) {
	case *ast.TypeReference:
		// Check if this is a type parameter (T, K, V, etc.)
		if len(pt.Name) <= 3 && isTypeParameter(pt.Name) {
			if _, exists := typeMap[pt.Name]; !exists {
				typeMap[pt.Name] = argType
			}
		}

		// Handle Array<T> -> T inference
		if pt.Name == "Array" && len(pt.TypeArguments) > 0 {
			if argType.Kind == types.ArrayType && argType.ElementType != nil {
				gi.inferFromTypes(pt.TypeArguments[0], argType.ElementType, typeMap)
			}
		}

	case *ast.UnionType:
		// Try to match against one of the union members
		for _, member := range pt.Types {
			if gi.tc.isAssignableTo(argType, gi.tc.convertTypeNode(member)) {
				gi.inferFromTypes(member, argType, typeMap)
				break
			}
		}
	}
}

// ValidateGenericConstraints validates that inferred types satisfy constraints
func (gi *GenericInferencer) ValidateGenericConstraints(
	typeParams []*ast.TypeParameter,
	typeMap map[string]*types.Type,
) []string {
	var errors []string

	for _, tp := range typeParams {
		if tp.Constraint == nil {
			continue
		}

		inferredType, exists := typeMap[tp.Name.Name]
		if !exists {
			continue
		}

		constraintType := gi.tc.convertTypeNode(tp.Constraint)
		if !gi.tc.isAssignableTo(inferredType, constraintType) {
			errors = append(errors, fmt.Sprintf(
				"Type '%s' does not satisfy the constraint '%s'",
				inferredType.String(), constraintType.String()))
		}
	}

	return errors
}

// SubstituteTypeParameters replaces type parameters with actual types
func (gi *GenericInferencer) SubstituteTypeParameters(
	typeNode ast.TypeNode,
	typeMap map[string]*types.Type,
) *types.Type {
	if typeNode == nil {
		return types.Unknown
	}

	switch t := typeNode.(type) {
	case *ast.TypeReference:
		// Check if this is a type parameter
		if actualType, exists := typeMap[t.Name]; exists {
			return actualType
		}

		// Handle generic types like Array<T>
		if len(t.TypeArguments) > 0 {
			substituted := make([]*types.Type, len(t.TypeArguments))
			for i, arg := range t.TypeArguments {
				substituted[i] = gi.SubstituteTypeParameters(arg, typeMap)
			}

			// Create specialized type
			if t.Name == "Array" && len(substituted) > 0 {
				return types.NewArrayType(substituted[0])
			}
		}

		return gi.tc.convertTypeNode(typeNode)

	default:
		return gi.tc.convertTypeNode(typeNode)
	}
}

// isTypeParameter checks if a name is a common type parameter
func isTypeParameter(name string) bool {
	// Common single-letter type parameters
	if len(name) == 1 && name >= "A" && name <= "Z" {
		return true
	}

	// Common multi-letter type parameters
	commonParams := map[string]bool{
		"T": true, "K": true, "V": true, "U": true, "R": true,
		"E": true, "P": true, "Props": true, "State": true,
	}

	return commonParams[name]
}
