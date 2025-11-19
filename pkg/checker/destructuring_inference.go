package checker

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// DestructuringInferencer handles type inference for destructured parameters
type DestructuringInferencer struct {
	globalEnv *types.GlobalEnvironment
	debug     bool
}

// NewDestructuringInferencer creates a new destructuring inferencer
func NewDestructuringInferencer(globalEnv *types.GlobalEnvironment) *DestructuringInferencer {
	return &DestructuringInferencer{
		globalEnv: globalEnv,
		debug:     os.Getenv("TSCHECK_DEBUG") == "1",
	}
}

// InferDestructuredParamType infers the type of a destructured parameter property
// For example, in: setup(props, { emit }) => infers type of 'emit' from SetupContext
func (di *DestructuringInferencer) InferDestructuredParamType(
	functionName string,
	paramIndex int,
	propertyName string,
) *types.Type {
	// Special handling for Vue's setup function second parameter (SetupContext)
	if functionName == "setup" && paramIndex == 1 {
		// Known properties from Vue's SetupContext that are functions
		vueSetupContextFunctions := map[string]bool{
			"emit":   true,
			"expose": true,
			"attrs":  false,
			"slots":  false,
		}

		if isFunc, known := vueSetupContextFunctions[propertyName]; known && isFunc {
			// Return a function type for known Vue setup context functions
			return &types.Type{
				Kind:       types.FunctionType,
				Name:       propertyName,
				IsFunction: true,
			}
		}

		// Try to find SetupContext in loaded types
		setupContext := di.findTypeByName("SetupContext")
		if setupContext != nil {
			return di.getPropertyType(setupContext, propertyName)
		}
	}

	// First, try to find the function definition
	funcType := di.findFunctionDefinition(functionName)
	if funcType == nil {
		return nil
	}

	// Get the parameter type at the given index
	paramType := di.getParameterType(funcType, paramIndex)
	if paramType == nil {
		return nil
	}

	// Get the property type from the parameter type
	return di.getPropertyType(paramType, propertyName)
}

// findFunctionDefinition searches for a function definition in global types
func (di *DestructuringInferencer) findFunctionDefinition(functionName string) *types.Type {
	// Search in global types
	if typ, ok := di.globalEnv.Types[functionName]; ok {
		return typ
	}

	// Search in global objects
	if obj, ok := di.globalEnv.Objects[functionName]; ok {
		return obj
	}

	return nil
}

// getParameterType extracts the parameter type at the given index
func (di *DestructuringInferencer) getParameterType(funcType *types.Type, paramIndex int) *types.Type {
	// This is simplified - in reality, we'd need to parse the function signature
	// For now, we'll use pattern matching on common patterns

	// Try to extract from function signature string
	if funcType.Name != "" {
		return di.extractParamTypeFromSignature(funcType.Name, paramIndex)
	}

	return nil
}

// extractParamTypeFromSignature extracts parameter type from a function signature
// For example: "(props: Props, ctx: SetupContext<E, S>) => any"
func (di *DestructuringInferencer) extractParamTypeFromSignature(signature string, paramIndex int) *types.Type {
	// Match function parameters: (param1: Type1, param2: Type2, ...)
	re := regexp.MustCompile(`\((.*?)\)\s*(?:=>|:)`)
	matches := re.FindStringSubmatch(signature)

	if len(matches) < 2 {
		return nil
	}

	params := strings.Split(matches[1], ",")
	if paramIndex >= len(params) {
		return nil
	}

	param := strings.TrimSpace(params[paramIndex])

	// Extract type from "paramName: TypeName" or "paramName?: TypeName"
	parts := strings.Split(param, ":")
	if len(parts) < 2 {
		return nil
	}

	typeName := strings.TrimSpace(parts[1])

	// Remove generic parameters for now: SetupContext<E, S> => SetupContext
	if idx := strings.Index(typeName, "<"); idx > 0 {
		typeName = typeName[:idx]
	}

	if di.debug {
		fmt.Fprintf(os.Stderr, "Extracted param type: %s from signature: %s\n", typeName, signature)
	}

	// Search for this type in global environment
	return di.findTypeByName(typeName)
}

// findTypeByName searches for a type by name in the global environment
func (di *DestructuringInferencer) findTypeByName(typeName string) *types.Type {
	// Try exact match first
	if typ, ok := di.globalEnv.Types[typeName]; ok {
		return typ
	}

	if obj, ok := di.globalEnv.Objects[typeName]; ok {
		return obj
	}

	// Try case-insensitive search
	typeLower := strings.ToLower(typeName)
	for name, typ := range di.globalEnv.Types {
		if strings.ToLower(name) == typeLower {
			return typ
		}
	}

	for name, obj := range di.globalEnv.Objects {
		if strings.ToLower(name) == typeLower {
			return obj
		}
	}

	return nil
}

// getPropertyType gets a property type from an object/interface type
func (di *DestructuringInferencer) getPropertyType(parentType *types.Type, propertyName string) *types.Type {
	if parentType == nil {
		return nil
	}

	// If the type has properties, search for the property
	if parentType.Properties != nil {
		if propType, ok := parentType.Properties[propertyName]; ok {
			return propType
		}
	}

	// Try to extract from type definition string
	if parentType.Name != "" {
		return di.extractPropertyFromTypeDefinition(parentType.Name, propertyName)
	}

	return nil
}

// extractPropertyFromTypeDefinition extracts a property type from a type definition string
// For example: "{ emit: EmitFn<E>; expose: () => void; }" => extracts "EmitFn<E>" for "emit"
func (di *DestructuringInferencer) extractPropertyFromTypeDefinition(typeDef string, propertyName string) *types.Type {
	// Match property definitions: propertyName: Type; or propertyName?: Type;
	pattern := fmt.Sprintf(`\b%s\s*\??\s*:\s*([^;,}]+)`, regexp.QuoteMeta(propertyName))
	re := regexp.MustCompile(pattern)

	matches := re.FindStringSubmatch(typeDef)
	if len(matches) < 2 {
		return nil
	}

	propertyTypeName := strings.TrimSpace(matches[1])

	if di.debug {
		fmt.Fprintf(os.Stderr, "Extracted property type: %s for property: %s\n", propertyTypeName, propertyName)
	}

	// Check if it's a function type
	if di.isFunctionType(propertyTypeName) {
		return &types.Type{
			Kind:       types.FunctionType,
			Name:       propertyTypeName,
			IsFunction: true,
		}
	}

	// Try to find the type by name
	return di.findTypeByName(propertyTypeName)
}

// isFunctionType checks if a type string represents a function
func (di *DestructuringInferencer) isFunctionType(typeStr string) bool {
	typeStr = strings.TrimSpace(typeStr)

	// Check for function signatures
	patterns := []string{
		`^\(.*\)\s*=>`,     // Arrow function: (args) => return
		`^function\s*\(`,   // Function keyword
		`Fn$`,              // Types ending with Fn (e.g., EmitFn)
		`Function$`,        // Types ending with Function
		`Callback$`,        // Types ending with Callback
		`Handler$`,         // Types ending with Handler
		`^<.*>\(.*\)\s*=>`, // Generic arrow: <T>(args) => return
	}

	for _, pattern := range patterns {
		if matched, _ := regexp.MatchString(pattern, typeStr); matched {
			return true
		}
	}

	return false
}

// InferDestructuredPropertyTypes infers types for all destructured properties in a function
func (di *DestructuringInferencer) InferDestructuredPropertyTypes(
	fnExpr *ast.FunctionExpression,
) map[string]*types.Type {
	result := make(map[string]*types.Type)

	if fnExpr == nil || fnExpr.Params == nil {
		return result
	}

	// Iterate through parameters to find destructured ones
	for paramIdx, param := range fnExpr.Params {
		if param.ID == nil {
			continue
		}

		// Check if this looks like a destructured parameter
		// (In our parser, destructured params create multiple Parameter entries)
		// We need to identify which parameters came from destructuring

		// For now, use a heuristic: if param name is common in Vue/React contexts
		if di.isKnownDestructuredProperty(param.ID.Name) {
			// Try to infer based on position
			// Second parameter of 'setup' is typically SetupContext
			if paramIdx > 0 {
				propertyType := di.inferFromCommonPatterns(param.ID.Name, paramIdx)
				if propertyType != nil {
					result[param.ID.Name] = propertyType
				}
			}
		}
	}

	return result
}

// isKnownDestructuredProperty checks if a property name is commonly destructured
func (di *DestructuringInferencer) isKnownDestructuredProperty(name string) bool {
	knownProps := []string{
		"emit", "expose", "attrs", "slots", // Vue
		"children", "key", "ref", // React
	}

	for _, prop := range knownProps {
		if name == prop {
			return true
		}
	}

	return false
}

// inferFromCommonPatterns infers types based on common framework patterns
func (di *DestructuringInferencer) inferFromCommonPatterns(propertyName string, paramIndex int) *types.Type {
	// Vue pattern: setup(props, { emit, expose, ... })
	if paramIndex == 1 {
		// Search for SetupContext in loaded types
		setupCtx := di.findTypeByName("SetupContext")
		if setupCtx != nil {
			propType := di.getPropertyType(setupCtx, propertyName)
			if propType != nil {
				return propType
			}
		}
	}

	// Fallback: mark known function properties
	if propertyName == "emit" || propertyName == "expose" {
		return &types.Type{
			Kind:       types.FunctionType,
			Name:       propertyName,
			IsFunction: true,
		}
	}

	return nil
}
