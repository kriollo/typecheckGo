package checker

import "tstypechecker/pkg/types"

// isEnumAssignable checks if a source type can be assigned to an enum type
// This implements TypeScript's enum assignment rules:
// - String literals are NOT assignable to enums
// - Numeric literals must be valid enum member values
// - Plain number type IS assignable to enums
// - Enum to enum requires exact same enum
func isEnumAssignable(tc *TypeChecker, sourceType, targetType *types.Type) (bool, bool) {
	// Return (result, handled)
	// handled=true means this function handled the check
	// handled=false means caller should continue with other checks

	// Check if target is an enum by looking it up in typeAliasCache
	// Enums are stored as ObjectType with the enum name
	if targetType.Kind != types.ObjectType || targetType.Name == "" {
		return false, false // Not an enum target, not handled
	}

	// Verify this is actually an enum by checking if it's in typeAliasCache
	// and has no properties (enums are represented as empty ObjectTypes)
	_, isEnum := tc.typeAliasCache[targetType.Name]
	if !isEnum || len(targetType.Properties) > 0 {
		return false, false // Not an enum, let other checks handle it
	}

	// Reject string literals (e.g., "Red" cannot be assigned to Color enum)
	if sourceType.Kind == types.LiteralType {
		if _, ok := sourceType.Value.(string); ok {
			// String literals are never assignable to enums
			// TypeScript requires: Color.Red, not "Red"
			return false, true
		}

		// For numeric literals, we accept them (TypeScript allows numeric literals for enums)
		// In a full implementation, we would validate against actual enum member values
		// but that requires storing enum members which isn't done yet
		if _, ok := sourceType.Value.(float64); ok {
			return true, true
		}
		if _, ok := sourceType.Value.(int); ok {
			return true, true
		}
	}

	// Plain number type is assignable to enum (TypeScript allows this)
	if sourceType.Kind == types.NumberType {
		return true, true
	}

	// Enum to enum: must be exact same enum
	if sourceType.Kind == types.ObjectType && sourceType.Name != "" {
		if _, isSourceEnum := tc.typeAliasCache[sourceType.Name]; isSourceEnum {
			return sourceType.Name == targetType.Name, true
		}
	}

	// Source is not compatible with enum
	return false, true
}
