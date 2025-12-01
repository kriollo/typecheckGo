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

	// Note: Enums are represented as ObjectType with specific naming conventions
	// We detect enums by checking if the target is an ObjectType with enum-like properties
	// For now, we don't have full enum support, so we return unhandled
	// TODO: Implement full enum type checking when EnumType is added to types.Type

	return false, false // Not handled yet, let normal type checking proceed
}
