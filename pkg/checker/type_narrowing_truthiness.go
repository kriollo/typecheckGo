package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// analyzeTruthiness narrows types based on truthiness checks (e.g., if (obj.prop))
func (tn *TypeNarrowing) analyzeTruthiness(memberExpr *ast.MemberExpression, trueNarrowing, falseNarrowing map[string]*types.Type) {
	// Get the object identifier
	objId, ok := memberExpr.Object.(*ast.Identifier)
	if !ok {
		return
	}

	// Get the property name
	var propName string
	if !memberExpr.Computed {
		if propId, ok := memberExpr.Property.(*ast.Identifier); ok {
			propName = propId.Name
		}
	}

	if propName == "" {
		return
	}

	// Get the current type of the object
	var objType *types.Type
	if t, exists := tn.tc.varTypeCache[objId.Name]; exists {
		objType = t
	} else {
		return
	}

	// Check if it's an object type
	if objType.Kind == types.ObjectType && objType.Properties != nil {
		if propType, exists := objType.Properties[propName]; exists {
			// Check if property is optional (union with undefined/null)
			if propType.Kind == types.UnionType {
				// Create a new property type without undefined/null
				var nonNullTypes []*types.Type
				hasNullOrUndefined := false

				for _, t := range propType.Types {
					if t.Kind == types.UndefinedType || t.Kind == types.NullType {
						hasNullOrUndefined = true
					} else {
						nonNullTypes = append(nonNullTypes, t)
					}
				}

				if hasNullOrUndefined {
					// We can narrow!
					var newPropType *types.Type
					if len(nonNullTypes) == 1 {
						newPropType = nonNullTypes[0]
					} else if len(nonNullTypes) > 1 {
						newPropType = types.NewUnionType(nonNullTypes)
					} else {
						// Should not happen if it was just undefined/null, but fallback to never or keep original
						return
					}

					// Create a new object type with the narrowed property
					newProps := make(map[string]*types.Type)
					for k, v := range objType.Properties {
						if k == propName {
							newProps[k] = newPropType
						} else {
							newProps[k] = v
						}
					}

					narrowedObj := types.NewObjectType(objType.Name, newProps)
					// Preserve other fields like index signatures if needed, but for now properties are enough
					trueNarrowing[objId.Name] = narrowedObj
				}
			}
		}
	}
}
