package checker

import (
	"strings"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// TypeNarrowing handles type narrowing for discriminated unions and other patterns
type TypeNarrowing struct {
	tc *TypeChecker
	// Maps variable names to their narrowed types within a scope
	narrowedTypes map[string]*types.Type
}

// NewTypeNarrowing creates a new type narrowing analyzer
func NewTypeNarrowing(tc *TypeChecker) *TypeNarrowing {
	return &TypeNarrowing{
		tc:            tc,
		narrowedTypes: make(map[string]*types.Type),
	}
}

// AnalyzeCondition analyzes a condition and returns narrowed types for the then/else branches
func (tn *TypeNarrowing) AnalyzeCondition(condition ast.Expression) (thenNarrowing, elseNarrowing map[string]*types.Type) {
	thenNarrowing = make(map[string]*types.Type)
	elseNarrowing = make(map[string]*types.Type)

	// Handle binary expressions (===, ==, !==, !=)
	if binExpr, ok := condition.(*ast.BinaryExpression); ok {
		if binExpr.Operator == "===" || binExpr.Operator == "==" {
			tn.analyzeEquality(binExpr, thenNarrowing, elseNarrowing, false)
			tn.analyzeTypeof(binExpr, thenNarrowing, elseNarrowing)
		} else if binExpr.Operator == "!==" || binExpr.Operator == "!=" {
			tn.analyzeEquality(binExpr, elseNarrowing, thenNarrowing, true)
			tn.analyzeTypeof(binExpr, elseNarrowing, thenNarrowing)
		}
	} else if memberExpr, ok := condition.(*ast.MemberExpression); ok {
		// Handle truthiness check: if (obj.prop)
		tn.analyzeTruthiness(memberExpr, thenNarrowing, elseNarrowing)
	}

	return thenNarrowing, elseNarrowing
}

// analyzeTypeof analyzes typeof checks
func (tn *TypeNarrowing) analyzeTypeof(binExpr *ast.BinaryExpression, trueNarrowing, falseNarrowing map[string]*types.Type) {
	// Pattern: typeof x === "string"

	var unary *ast.UnaryExpression
	var literal *ast.Literal

	// Check left side
	if u, ok := binExpr.Left.(*ast.UnaryExpression); ok && u.Operator == "typeof" {
		unary = u
		if lit, ok := binExpr.Right.(*ast.Literal); ok {
			literal = lit
		}
	}

	// Check right side (reversed)
	if unary == nil {
		if u, ok := binExpr.Right.(*ast.UnaryExpression); ok && u.Operator == "typeof" {
			unary = u
			if lit, ok := binExpr.Left.(*ast.Literal); ok {
				literal = lit
			}
		}
	}

	if unary == nil || literal == nil {
		return
	}

	// Get variable name
	var varName string
	if id, ok := unary.Argument.(*ast.Identifier); ok {
		varName = id.Name
	} else {
		return
	}

	// Get type name string
	typeName, ok := literal.Value.(string)
	if !ok {
		return
	}
	typeName = strings.Trim(typeName, `"'`)

	// Map type name to Type
	var narrowedType *types.Type
	switch typeName {
	case "string":
		narrowedType = types.String
	case "number":
		narrowedType = types.Number
	case "boolean":
		narrowedType = types.Boolean
	case "undefined":
		narrowedType = types.Undefined
	case "object":
		narrowedType = types.Any // Simplified, object is complex
	case "function":
		narrowedType = types.Any // Simplified
	default:
		return
	}

	// Apply narrowing
	trueNarrowing[varName] = narrowedType

	// For false narrowing (else branch), we can't easily exclude types from unknown/any yet
	// without a proper subtraction type system.
	// However, if the original type was a union, we could filter it.
	if originalType, exists := tn.tc.varTypeCache[varName]; exists && originalType.Kind == types.UnionType {
		var remainingTypes []*types.Type
		for _, t := range originalType.Types {
			// Check if t is NOT the narrowed type
			if t.Kind != narrowedType.Kind {
				remainingTypes = append(remainingTypes, t)
			}
		}
		if len(remainingTypes) > 0 {
			if len(remainingTypes) == 1 {
				falseNarrowing[varName] = remainingTypes[0]
			} else {
				falseNarrowing[varName] = types.NewUnionType(remainingTypes)
			}
		}
	}
}

// analyzeEquality analyzes equality checks for discriminated unions
func (tn *TypeNarrowing) analyzeEquality(binExpr *ast.BinaryExpression, trueNarrowing, falseNarrowing map[string]*types.Type, negated bool) {
	// Pattern: obj.property === "literal"
	// or: "literal" === obj.property

	var memberExpr *ast.MemberExpression
	var literal *ast.Literal

	// Check left side
	if member, ok := binExpr.Left.(*ast.MemberExpression); ok {
		memberExpr = member
		if lit, ok := binExpr.Right.(*ast.Literal); ok {
			literal = lit
		}
	}

	// Check right side (reversed)
	if memberExpr == nil {
		if member, ok := binExpr.Right.(*ast.MemberExpression); ok {
			memberExpr = member
			if lit, ok := binExpr.Left.(*ast.Literal); ok {
				literal = lit
			}
		}
	}

	if memberExpr == nil || literal == nil {
		return
	}

	// Get the object identifier (e.g., "shape" in "shape.kind")
	objId, ok := memberExpr.Object.(*ast.Identifier)
	if !ok {
		return
	}

	// Get the property name (e.g., "kind" in "shape.kind")
	var propName string
	if !memberExpr.Computed {
		if propId, ok := memberExpr.Property.(*ast.Identifier); ok {
			propName = propId.Name
		}
	}

	if propName == "" {
		return
	}

	// Get the literal value (e.g., "circle")
	literalValue, ok := literal.Value.(string)
	if !ok {
		return
	}

	// Strip quotes if present (parser includes them)
	literalValue = strings.Trim(literalValue, `"'`)

	// Get the current type of the object
	var objType *types.Type
	if t, exists := tn.tc.varTypeCache[objId.Name]; exists {
		objType = t
	} else {
		objType = tn.tc.inferencer.InferType(memberExpr.Object)
	}

	// If it's not a union, check if it's an alias that points to a union
	if objType.Kind != types.UnionType {
		// Try to resolve from alias cache if it has a name
		if objType.Name != "" {
			if resolved, exists := tn.tc.typeAliasCache[objType.Name]; exists {
				objType = resolved
			}
		}
	}

	// Check if it's a union type
	if objType.Kind != types.UnionType {
		return
	}

	// Find the matching union member
	for _, member := range objType.Types {
		if member.Kind == types.ObjectType && member.Properties != nil {
			// Check if this member has the discriminant property
			if propType, exists := member.Properties[propName]; exists {
				// Check if the property is a literal type matching our value
				if propType.Kind == types.LiteralType {
					if propValue, ok := propType.Value.(string); ok {
						// Strip quotes from the type's literal value too
						propValue = strings.Trim(propValue, `"'`)
						if propValue == literalValue {
							// This is the matching member!
							trueNarrowing[objId.Name] = member

							// For else branch, narrow to the other union members
							var otherMembers []*types.Type
							for _, otherMember := range objType.Types {
								if otherMember != member {
									otherMembers = append(otherMembers, otherMember)
								}
							}
							if len(otherMembers) == 1 {
								falseNarrowing[objId.Name] = otherMembers[0]
							} else if len(otherMembers) > 1 {
								falseNarrowing[objId.Name] = types.NewUnionType(otherMembers)
							}
							return
						}
					}
				}
			}
		}
	}
}

// ApplyNarrowing applies narrowed types to the type cache
func (tn *TypeNarrowing) ApplyNarrowing(narrowing map[string]*types.Type) (restore func()) {
	// Save original types
	originalTypes := make(map[string]*types.Type)
	for varName, narrowedType := range narrowing {
		// Save original
		if originalType, exists := tn.tc.varTypeCache[varName]; exists {
			originalTypes[varName] = originalType
		}
		// Apply narrowed type
		tn.tc.varTypeCache[varName] = narrowedType
	}

	// Return a function to restore original types
	return func() {
		for varName := range narrowing {
			if originalType, exists := originalTypes[varName]; exists {
				tn.tc.varTypeCache[varName] = originalType
			} else {
				delete(tn.tc.varTypeCache, varName)
			}
		}
	}
}

// GetNarrowedType returns the narrowed type for a variable, if any
func (tn *TypeNarrowing) GetNarrowedType(varName string) (*types.Type, bool) {
	narrowedType, exists := tn.narrowedTypes[varName]
	return narrowedType, exists
}
