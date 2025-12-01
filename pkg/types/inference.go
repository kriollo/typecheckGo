package types

import (
	"strings"
	"tstypechecker/pkg/ast"
)

// TypeInferencer infiere tipos de expresiones
type TypeInferencer struct {
	globalEnv    *GlobalEnvironment
	typeCache    map[ast.Node]*Type
	varTypeCache map[string]*Type
	depth        int // Para evitar recursión infinita
}

// NewTypeInferencer crea un nuevo inferenciador de tipos
func NewTypeInferencer(globalEnv *GlobalEnvironment) *TypeInferencer {
	return &TypeInferencer{
		globalEnv:    globalEnv,
		typeCache:    make(map[ast.Node]*Type),
		varTypeCache: make(map[string]*Type),
	}
}

// SetTypeCache sets the type cache (shared with checker)
func (ti *TypeInferencer) SetTypeCache(cache map[ast.Node]*Type) {
	ti.typeCache = cache
}

// SetVarTypeCache sets the variable type cache (shared with checker)
func (ti *TypeInferencer) SetVarTypeCache(cache map[string]*Type) {
	ti.varTypeCache = cache
}

// InferType infiere el tipo de una expresión
func (ti *TypeInferencer) InferType(expr ast.Expression) *Type {
	if expr == nil {
		return Unknown
	}

	// Evitar recursión infinita
	if ti.depth > 10 {
		return Unknown
	}
	ti.depth++

	defer func() { ti.depth-- }()

	switch e := expr.(type) {
	case *ast.Literal:
		return ti.inferLiteralType(e)
	case *ast.Identifier:
		// First check if we have a cached type for this specific node
		if cachedType, ok := ti.typeCache[e]; ok {
			return cachedType
		}
		// Then check by variable name
		if cachedType, ok := ti.varTypeCache[e.Name]; ok {
			return cachedType
		}
		// Check global environment
		if globalType, exists := ti.globalEnv.Objects[e.Name]; exists {
			return globalType
		}
		// Check for undefined
		if e.Name == "undefined" {
			return Undefined
		}
		// If not found in cache, return Unknown
		return Unknown
	case *ast.BinaryExpression:
		return ti.inferBinaryExpressionType(e)
	case *ast.CallExpression:
		return ti.inferCallExpressionType(e)
	case *ast.ArrayExpression:
		return ti.inferArrayType(e)
	case *ast.ObjectExpression:
		return ti.inferObjectType(e)
	case *ast.ArrowFunctionExpression:
		return ti.inferArrowFunctionType(e)
	case *ast.YieldExpression:
		// yield expression returns the type of its argument
		// In a full implementation, this would return the element type of the Generator
		if e.Argument != nil {
			return ti.InferType(e.Argument)
		}
		return Void
	case *ast.MemberExpression:
		return ti.inferMemberExpressionType(e)
	case *ast.NewExpression:
		// new ClassName() should return the instance type
		// The constructor type in varTypeCache is a FunctionType whose ReturnType is the instance
		constructorType := ti.InferType(e.Callee)
		if constructorType.Kind == FunctionType && constructorType.ReturnType != nil {
			return constructorType.ReturnType
		}
		return Unknown
	default:
		return Unknown
	}
}

// inferMemberExpressionType infiere el tipo de un acceso a miembro (obj.prop)
func (ti *TypeInferencer) inferMemberExpressionType(expr *ast.MemberExpression) *Type {
	objType := ti.InferType(expr.Object)

	// Si el objeto es Any, el resultado es Any
	if objType.Kind == AnyType {
		return Any
	}

	// Extract property name
	var propName string
	if !expr.Computed {
		// Acceso directo: obj.prop
		if id, ok := expr.Property.(*ast.Identifier); ok {
			propName = id.Name
		}
	} else {
		// Acceso computado: obj["prop"]
		if lit, ok := expr.Property.(*ast.Literal); ok {
			if str, ok := lit.Value.(string); ok {
				propName = str
			}
		}
	}

	// Handle union types (e.g., for optional properties)
	if objType.Kind == UnionType {
		// For optional chaining on union types, we need to handle each type in the union
		var resultTypes []*Type
		for _, t := range objType.Types {
			if t.Kind == ObjectType {
				if propName != "" {
					if propType, exists := t.Properties[propName]; exists {
						resultTypes = append(resultTypes, propType)
					}
				}
			} else if t.Kind == UndefinedType || t.Kind == NullType {
				// If one of the union members is undefined/null, the result includes undefined
				resultTypes = append(resultTypes, Undefined)
			}
		}
		if len(resultTypes) > 0 {
			if len(resultTypes) == 1 {
				return resultTypes[0]
			}
			return NewUnionType(resultTypes)
		}
	}

	// Si es un objeto, buscar la propiedad
	if objType.Kind == ObjectType {
		if propName != "" {
			// Buscar en las propiedades del objeto
			if propType, exists := objType.Properties[propName]; exists {
				// Si es optional chaining (?.),  el resultado es propType | undefined
				if expr.Optional {
					return NewUnionType([]*Type{propType, Undefined})
				}
				return propType
			}

			// TODO: Buscar en la cadena de prototipos o tipos heredados
		}
	}

	// Handle primitive types properties
	if objType.Kind == StringType {
		if propName == "length" {
			return Number
		}
		if propName == "toUpperCase" || propName == "toLowerCase" || propName == "trim" {
			return NewFunctionType(nil, String)
		}
		if propName == "split" {
			// split(separator: string): string[]
			return NewFunctionType([]*Type{String}, NewArrayType(String))
		}
	}

	if objType.Kind == ArrayType {
		if propName == "length" {
			return Number
		}
		if propName == "push" {
			// push(...items: T[]): number
			return NewFunctionType([]*Type{objType.ElementType}, Number)
		}
		if propName == "pop" {
			// pop(): T | undefined
			return NewFunctionType(nil, NewUnionType([]*Type{objType.ElementType, Undefined}))
		}
		if propName == "join" {
			return NewFunctionType([]*Type{String}, String)
		}
		if propName == "map" {
			// map<U>(callback: (value: T, index: number, array: T[]) => U): U[]
			// Simplified: return Any[] for now as we don't have full generic inference here
			return NewFunctionType([]*Type{Any}, NewArrayType(Any))
		}
	}

	// Si no podemos resolverlo, retornamos Any para evitar falsos positivos
	return Any
}

// inferCallExpressionType infiere el tipo de retorno de una llamada a función
func (ti *TypeInferencer) inferCallExpressionType(call *ast.CallExpression) *Type {
	// Get the type of the callee
	calleeType := ti.InferType(call.Callee)

	// If it's a function type, check if we need to infer generic types
	if calleeType.Kind == FunctionType && calleeType.ReturnType != nil {
		// Check if return type is a type parameter (generic)
		if calleeType.ReturnType.Kind == TypeParameterType {
			// Try to infer the type parameter from arguments
			if len(call.Arguments) > 0 && len(calleeType.Parameters) > 0 {
				// Simple case: if first parameter type matches return type parameter,
				// infer from first argument
				firstParamType := calleeType.Parameters[0]
				if firstParamType.Kind == TypeParameterType &&
					firstParamType.Name == calleeType.ReturnType.Name {
					// Infer type from first argument
					argType := ti.InferType(call.Arguments[0])
					return argType
				}
			}
		}
		return calleeType.ReturnType
	}

	// If callee is Any, return Any
	if calleeType.Kind == AnyType {
		return Any
	}

	// If the callee is an identifier, try to find the function definition
	if id, ok := call.Callee.(*ast.Identifier); ok {
		// Check if we have the variable in cache
		if varType, exists := ti.varTypeCache[id.Name]; exists {
			// If it's a function type, check for generics
			if varType.Kind == FunctionType && varType.ReturnType != nil {
				// Check if return type is a type parameter (generic)
				if varType.ReturnType.Kind == TypeParameterType {
					// Try to infer the type parameter from arguments
					if len(call.Arguments) > 0 && len(varType.Parameters) > 0 {
						firstParamType := varType.Parameters[0]
						if firstParamType.Kind == TypeParameterType &&
							firstParamType.Name == varType.ReturnType.Name {
							// Infer type from first argument
							argType := ti.InferType(call.Arguments[0])
							return argType
						}
					}
				}
				return varType.ReturnType
			}
		}

		// Try to find the arrow function definition in the AST
		// This is a simplified approach - in a full implementation we'd traverse the AST
		// For now, we'll try to infer from arrow functions defined in the same scope
	}

	// If the callee is an arrow function expression (IIFE), analyze its body
	if arrow, ok := call.Callee.(*ast.ArrowFunctionExpression); ok {
		return ti.inferArrowFunctionReturnType(arrow)
	}

	// Default: return Unknown
	return Unknown
}

// inferArrowFunctionReturnType analyzes an arrow function's body to infer its return type
func (ti *TypeInferencer) inferArrowFunctionReturnType(arrow *ast.ArrowFunctionExpression) *Type {
	// If the body is an expression (not a block), infer from that expression
	if expr, ok := arrow.Body.(ast.Expression); ok {
		return ti.InferType(expr)
	}

	// If the body is a block statement, look for return statements
	if block, ok := arrow.Body.(*ast.BlockStatement); ok {
		return ti.InferReturnTypeFromBlock(block)
	}

	return Unknown
}

// InferReturnTypeFromBlock finds return statements in a block and infers the return type
func (ti *TypeInferencer) InferReturnTypeFromBlock(block *ast.BlockStatement) *Type {
	for _, stmt := range block.Body {
		if returnStmt, ok := stmt.(*ast.ReturnStatement); ok {
			if returnStmt.Argument != nil {
				return ti.InferType(returnStmt.Argument)
			}
			return Void
		}

		// Recursively check nested blocks (if statements, etc.)
		if ifStmt, ok := stmt.(*ast.IfStatement); ok {
			if consequent, ok := ifStmt.Consequent.(*ast.BlockStatement); ok {
				if returnType := ti.InferReturnTypeFromBlock(consequent); returnType.Kind != UnknownType {
					return returnType
				}
			}
		}
	}

	return Void
}

// inferLiteralType infiere el tipo de un literal
func (ti *TypeInferencer) inferLiteralType(lit *ast.Literal) *Type {
	if lit.Value == nil {
		return Null
	}

	switch v := lit.Value.(type) {
	case bool:
		return NewLiteralType(v)
	case string:
		// Check if it's actually a number stored as a string
		if len(lit.Raw) > 0 {
			firstChar := lit.Raw[0]
			// If it starts with a digit or minus, it's a number
			if (firstChar >= '0' && firstChar <= '9') || firstChar == '-' {
				// Check for BigInt suffix
				if strings.HasSuffix(lit.Raw, "n") {
					return BigInt
				}
				// It's a number literal
				// Try to parse it as float64 to store in LiteralType
				// For now, we just store the raw string or generic number if parsing fails
				// But to be safe and consistent with existing logic, let's return Number type
				// UNLESS we want specific literal types for numbers too.
				// For satisfies operator, we usually care about string literals.
				// Number literals are also useful.
				return Number // Keep as Number for now to avoid breaking changes, or change to NewLiteralType(v) if we parse it
			}
			// If it starts with a quote, it's a string literal
			if firstChar == '"' || firstChar == '\'' || firstChar == '`' {
				return NewLiteralType(v)
			}
		}
		// Default to string literal
		return NewLiteralType(v)
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return NewLiteralType(v)
	default:
		_ = v
		return Unknown
	}
}

// inferBinaryExpressionType infiere el tipo de una expresión binaria
func (ti *TypeInferencer) inferBinaryExpressionType(expr *ast.BinaryExpression) *Type {
	leftType := ti.InferType(expr.Left)
	rightType := ti.InferType(expr.Right)

	switch expr.Operator {
	case "+":
		// Si alguno es string, el resultado es string
		if leftType.Kind == StringType || rightType.Kind == StringType {
			return String
		}
		// Si ambos son números, el resultado es número
		if leftType.Kind == NumberType && rightType.Kind == NumberType {
			return Number
		}
		return Unknown

	case "-", "*", "/", "%":
		// Operadores aritméticos siempre retornan número
		return Number

	case "===", "!==", "==", "!=", "<", ">", "<=", ">=":
		// Operadores de comparación siempre retornan boolean
		return Boolean

	case "&&", "||":
		// Operadores lógicos retornan el tipo de uno de los operandos
		// Por simplicidad, retornamos boolean
		return Boolean

	default:
		return Unknown
	}
}

// inferArrayType infiere el tipo de un array
func (ti *TypeInferencer) inferArrayType(arr *ast.ArrayExpression) *Type {
	if len(arr.Elements) == 0 {
		// Array vacío, tipo any[]
		return NewArrayType(Any)
	}

	// Si el contexto espera una tupla, infiere TupleType
	// (esto requiere que el checker pase el tipo esperado, pero aquí lo forzamos si la longitud es fija y los tipos son heterogéneos)
	elementTypes := make([]*Type, len(arr.Elements))
	isHomogeneous := true
	firstType := ti.InferType(arr.Elements[0])
	elementTypes[0] = firstType
	for i := 1; i < len(arr.Elements); i++ {
		t := ti.InferType(arr.Elements[i])
		elementTypes[i] = t
		if t.Kind != firstType.Kind {
			isHomogeneous = false
		}
	}
	// Si los tipos son homogéneos, devuelve ArrayType; si son heterogéneos, TupleType
	if isHomogeneous {
		// fmt.Printf("DEBUG: inferArrayType returning ArrayType: %s[]\n", firstType.String())
		return NewArrayType(firstType)
	}
	return &Type{Kind: TupleType, Types: elementTypes}
}

// convertTypeNode converts an AST TypeNode to a types.Type (simplified version for inference)
func (ti *TypeInferencer) convertTypeNode(node ast.TypeNode) *Type {
	if node == nil {
		return Any
	}

	switch t := node.(type) {
	case *ast.TypeReference:
		switch t.Name {
		case "string":
			return String
		case "number":
			return Number
		case "boolean":
			return Boolean
		case "void":
			return Void
		case "any":
			return Any
		case "unknown":
			return Unknown
		case "(array)":
			if len(t.TypeArguments) > 0 {
				elemType := ti.convertTypeNode(t.TypeArguments[0])
				return NewArrayType(elemType)
			}
			return NewArrayType(Any)
		}
	}
	// For other types, return Any for now
	return Any
}

// inferArrowFunctionType infiere el tipo de una arrow function
func (ti *TypeInferencer) inferArrowFunctionType(arrow *ast.ArrowFunctionExpression) *Type {
	// Store original types to restore later
	originalTypes := make(map[string]*Type)

	// Infer parameter types and update scope
	params := make([]*Type, len(arrow.Params))
	for i, param := range arrow.Params {
		// Use type annotation if available
		if param.ParamType != nil {
			params[i] = ti.convertTypeNode(param.ParamType)
		} else {
			params[i] = Any
		}

		// Add to varTypeCache for body inference
		if param.ID != nil {
			if t, ok := ti.varTypeCache[param.ID.Name]; ok {
				originalTypes[param.ID.Name] = t
			}
			ti.varTypeCache[param.ID.Name] = params[i]
		}
	}

	// Infer return type by analyzing the function body
	returnType := ti.inferArrowFunctionReturnType(arrow)

	// Restore original types
	for _, param := range arrow.Params {
		if param.ID != nil {
			if t, ok := originalTypes[param.ID.Name]; ok {
				ti.varTypeCache[param.ID.Name] = t
			} else {
				delete(ti.varTypeCache, param.ID.Name)
			}
		}
	}

	// If it's an async function, the return type is a Promise
	// For now, we return Any to allow .then() and await, as we don't have full Promise<T> support yet
	if arrow.Async {
		returnType = Any
	}

	return NewFunctionType(params, returnType)
}

// inferObjectType infiere el tipo de un objeto literal
func (ti *TypeInferencer) inferObjectType(obj *ast.ObjectExpression) *Type {
	properties := make(map[string]*Type)

	for _, prop := range obj.Properties {
		switch p := prop.(type) {
		case *ast.Property:
			// Get property name
			var propName string
			if key, ok := p.Key.(*ast.Identifier); ok {
				propName = key.Name
			} else if lit, ok := p.Key.(*ast.Literal); ok {
				if str, ok := lit.Value.(string); ok {
					propName = str
				}
			}

			if propName != "" {
				// Infer the type of the property value
				propType := ti.InferType(p.Value)
				properties[propName] = propType
			}
		case *ast.SpreadElement:
			// Infer the type of the spread argument
			spreadType := ti.InferType(p.Argument)

			// If we spread 'any' or 'unknown', the result is 'any' (to avoid false positives)
			if spreadType.Kind == AnyType || spreadType.Kind == UnknownType {
				return Any
			}

			// If it's an object type, copy its properties
			if spreadType.Kind == ObjectType && spreadType.Properties != nil {
				for k, v := range spreadType.Properties {
					properties[k] = v
				}
			}
		}
	}

	// Create an anonymous object type with the inferred properties
	return NewObjectType("", properties)
}
