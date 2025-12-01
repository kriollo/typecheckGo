package checker

import (
	"fmt"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// OverloadValidator handles function overload validation
type OverloadValidator struct {
	tc *TypeChecker
}

// NewOverloadValidator creates a new overload validator
func NewOverloadValidator(tc *TypeChecker) *OverloadValidator {
	return &OverloadValidator{tc: tc}
}

// OverloadSignature represents a function overload signature
type OverloadSignature struct {
	Params     []*ast.Parameter
	ReturnType *types.Type
	Node       *ast.FunctionDeclaration
}

// ValidateFunctionOverloads validates function overload implementation
func (ov *OverloadValidator) ValidateFunctionOverloads(
	decls []*ast.FunctionDeclaration,
	filename string,
) {
	if ov == nil || ov.tc == nil || len(decls) < 2 {
		return // No overloads
	}

	// Group by function name
	overloadGroups := make(map[string][]*ast.FunctionDeclaration)
	for _, decl := range decls {
		if decl.ID != nil {
			name := decl.ID.Name
			overloadGroups[name] = append(overloadGroups[name], decl)
		}
	}

	// Validate each group
	for _, group := range overloadGroups {
		if len(group) > 1 {
			ov.validateOverloadGroup(group, filename)
		}
	}
}

// validateOverloadGroup validates a group of overloaded functions
func (ov *OverloadValidator) validateOverloadGroup(
	decls []*ast.FunctionDeclaration,
	filename string,
) {
	// Find the implementation (the one with a body)
	var implementation *ast.FunctionDeclaration
	var signatures []*OverloadSignature

	for _, decl := range decls {
		if decl.Body != nil {
			if implementation != nil {
				// Multiple implementations - error
				ov.tc.addError(
					filename,
					decl.ID.Pos().Line,
					decl.ID.Pos().Column,
					fmt.Sprintf("Duplicate function implementation for '%s'.", decl.ID.Name),
					"TS2393",
					"error",
				)
				return
			}
			implementation = decl
		} else {
			// Overload signature
			sig := &OverloadSignature{
				Params:     decl.Params,
				ReturnType: ov.tc.convertTypeNode(decl.ReturnType),
				Node:       decl,
			}
			signatures = append(signatures, sig)
		}
	}

	if implementation == nil {
		// No implementation found
		if len(signatures) > 0 {
			ov.tc.addError(
				filename,
				signatures[0].Node.ID.Pos().Line,
				signatures[0].Node.ID.Pos().Column,
				fmt.Sprintf("Function '%s' has overload signatures but no implementation.", signatures[0].Node.ID.Name),
				"TS2389",
				"error",
			)
		}
		return
	}

	// Validate that implementation is compatible with all signatures
	ov.validateImplementation(implementation, signatures, filename)
}

// validateImplementation validates that implementation matches overload signatures
func (ov *OverloadValidator) validateImplementation(
	impl *ast.FunctionDeclaration,
	signatures []*OverloadSignature,
	filename string,
) {
	implReturnType := ov.tc.convertTypeNode(impl.ReturnType)
	if implReturnType == nil {
		implReturnType = types.Any
	}

	// Check each signature
	for _, sig := range signatures {
		// Validate that implementation return type is compatible
		if sig.ReturnType != nil && implReturnType.Kind != types.AnyType {
			if !ov.isReturnTypeCompatible(implReturnType, sig.ReturnType) {
				ov.tc.addError(
					filename,
					impl.ID.Pos().Line,
					impl.ID.Pos().Column,
					fmt.Sprintf(
						"This overload signature is not compatible with its implementation signature.\n"+
							"  Implementation return type '%s' is not assignable to overload return type '%s'.",
						implReturnType.String(), sig.ReturnType.String(),
					),
					"TS2394",
					"error",
				)
			}
		}

		// Validate parameter compatibility
		if !ov.areParametersCompatible(impl.Params, sig.Params) {
			ov.tc.addError(
				filename,
				impl.ID.Pos().Line,
				impl.ID.Pos().Column,
				fmt.Sprintf(
					"This overload signature is not compatible with its implementation signature."+
						"\n  Implementation has %d parameter(s) but overload has %d parameter(s).",
					len(impl.Params), len(sig.Params),
				),
				"TS2394",
				"error",
			)
		}
	}
}

// isReturnTypeCompatible checks if implementation return type can satisfy overload
func (ov *OverloadValidator) isReturnTypeCompatible(
	implType *types.Type,
	overloadType *types.Type,
) bool {
	// Implementation can return a union that includes the overload type
	if implType.Kind == types.UnionType {
		for _, member := range implType.Types {
			if ov.tc.isAssignableTo(overloadType, member) {
				return true
			}
		}
		return false
	}

	// Standard assignability check
	return ov.tc.isAssignableTo(overloadType, implType)
}

// areParametersCompatible checks if implementation parameters can handle overload
func (ov *OverloadValidator) areParametersCompatible(
	implParams []*ast.Parameter,
	overloadParams []*ast.Parameter,
) bool {
	// Implementation must accept at least as many parameters as overload
	if len(implParams) < len(overloadParams) {
		return false
	}

	// Check each parameter
	for i, overloadParam := range overloadParams {
		if i >= len(implParams) {
			break
		}

		implParam := implParams[i]

		// Implementation parameter type must be assignable from overload parameter
		if overloadParam.ParamType != nil && implParam.ParamType != nil {
			overloadType := ov.tc.convertTypeNode(overloadParam.ParamType)
			implType := ov.tc.convertTypeNode(implParam.ParamType)

			// Implementation should accept the same or wider type
			if implType.Kind != types.AnyType && !ov.tc.isAssignableTo(overloadType, implType) {
				return false
			}
		}
	}

	// Extra parameters in implementation must be optional
	for i := len(overloadParams); i < len(implParams); i++ {
		if !implParams[i].Optional {
			return false
		}
	}

	return true
}

// FindBestOverload finds the best matching overload for a call
func (ov *OverloadValidator) FindBestOverload(
	signatures []*OverloadSignature,
	args []ast.Expression,
) *OverloadSignature {
	var bestMatch *OverloadSignature
	bestScore := -1

	for _, sig := range signatures {
		score := ov.scoreOverloadMatch(sig, args)
		if score > bestScore {
			bestScore = score
			bestMatch = sig
		}
	}

	return bestMatch
}

// scoreOverloadMatch scores how well an overload matches the arguments
func (ov *OverloadValidator) scoreOverloadMatch(
	sig *OverloadSignature,
	args []ast.Expression,
) int {
	// Quick reject: wrong parameter count
	if len(args) > len(sig.Params) {
		return -1
	}

	// Count required parameters
	requiredCount := 0
	for _, param := range sig.Params {
		if !param.Optional && !param.Rest {
			requiredCount++
		}
	}

	if len(args) < requiredCount {
		return -1
	}

	// Score based on type matches
	score := 0
	for i, arg := range args {
		if i >= len(sig.Params) {
			break
		}

		argType := ov.tc.inferencer.InferType(arg)
		paramType := ov.tc.convertTypeNode(sig.Params[i].ParamType)

		if ov.tc.isAssignableTo(argType, paramType) {
			score += 10

			// Bonus for exact match
			if ov.areTypesExactMatch(argType, paramType) {
				score += 5
			}
		}
	}

	return score
}

// areTypesExactMatch checks for exact type match
func (ov *OverloadValidator) areTypesExactMatch(t1, t2 *types.Type) bool {
	return t1.Kind == t2.Kind && t1.Name == t2.Name
}
