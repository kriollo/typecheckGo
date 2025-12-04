package checker

import (
	"tstypechecker/pkg/types"
)

// expandTemplateLiteralType expands a template literal type to all possible string literal values
// For example: `on${'Click' | 'Hover'}` expands to ['onClick', 'onHover']
func (tc *TypeChecker) expandTemplateLiteralType(templateType *types.Type) []string {
	if templateType.Kind != types.TemplateLiteralType {
		return nil
	}

	// Start with an array containing an empty string
	results := []string{""}

	// Process each part and type in the template
	for i := 0; i < len(templateType.TemplateParts); i++ {
		// Add the literal part
		part := templateType.TemplateParts[i]
		for j := range results {
			results[j] += part
		}

		// If there's a corresponding type, expand it
		if i < len(templateType.TemplateTypes) {
			typeNode := templateType.TemplateTypes[i]
			possibleStrings := tc.expandTypeToStrings(typeNode)

			// Create new combinations
			var newResults []string
			for _, existing := range results {
				for _, str := range possibleStrings {
					newResults = append(newResults, existing+str)
				}
			}
			results = newResults
		}
	}

	return results
}

// expandTypeToStrings expands a type to all possible string values
// For example: 'Click' | 'Hover' expands to ['Click', 'Hover']
func (tc *TypeChecker) expandTypeToStrings(t *types.Type) []string {
	switch t.Kind {
	case types.LiteralType:
		if str, ok := t.Value.(string); ok {
			// Normalize the value - remove surrounding quotes if present
			normalized := str
			if len(str) >= 2 && ((str[0] == '\'' && str[len(str)-1] == '\'') || (str[0] == '"' && str[len(str)-1] == '"')) {
				normalized = str[1 : len(str)-1]
			}
			return []string{normalized}
		}
		return nil

	case types.UnionType:
		var results []string
		for _, member := range t.Types {
			results = append(results, tc.expandTypeToStrings(member)...)
		}
		return results

	case types.StringType:
		// Generic string type - can't expand to specific values
		// Return empty to indicate "any string"
		return nil

	default:
		return nil
	}
}
