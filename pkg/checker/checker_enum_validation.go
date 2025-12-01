package checker

import "tstypechecker/pkg/types"

// isEnumAssignable checks if a source type can be assigned to an enum type
// This implements TypeScript's enum assignment rules:
// - String literals are NOT assignable to enums
// - Numeric literals must be valid enum member values
// - Plain number type IS assignable to enums
// - Enum to enum requires exact same enum
func isEnumAssignable(sourceType, targetType *types.Type) (bool, bool) {
	// Return (result, handled)
	// handled=true means this function handled the check
	// handled=false means caller should continue with other checks

	if targetType.Kind != types.EnumType {
		return false, false // Not an enum target, not handled
	}

	// Reject string literals (e.g., "Red" cannot be assigned to Color enum)
	if sourceType.Kind == types.LiteralType {
		if _, ok := sourceType.Value.(string); ok {
			// String literals are never assignable to enums
			// TypeScript requires: Color.Red, not "Red"
			return false, true
		}

		// Validate numeric literals are within enum range
		if numVal, ok := sourceType.Value.(float64); ok {
			// Check if the number is a valid enum member value
			if targetType.EnumMembers != nil {
				// Check if numVal matches any member value
				validValue := false
				for _, member := range targetType.EnumMembers {
					if member.Value == numVal {
						validValue = true
						break
					}
				}
				if !validValue {
					return false, true
				}
				return true, true
			}
		}
	}

	// Plain number type is assignable to enum (TypeScript allows this)
	if sourceType.Kind == types.NumberType {
		return true, true
	}

	// Enum to enum: must be exact same enum
	if sourceType.Kind == types.EnumType {
		return sourceType.Name == targetType.Name, true
	}

	// Source is not compatible with enum
	return false, true
}
