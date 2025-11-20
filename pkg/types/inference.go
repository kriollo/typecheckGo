package types

import (
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
		// If not found in cache, return Unknown
		return Unknown
	case *ast.BinaryExpression:
		return ti.inferBinaryExpressionType(e)
	case *ast.CallExpression:
		// Por ahora retornamos unknown
		return Unknown
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
	default:
		return Unknown
	}
}

// inferLiteralType infiere el tipo de un literal
func (ti *TypeInferencer) inferLiteralType(lit *ast.Literal) *Type {
	if lit.Value == nil {
		return Null
	}

	switch v := lit.Value.(type) {
	case bool:
		return Boolean
	case string:
		// Check if it's actually a number stored as a string
		if len(lit.Raw) > 0 {
			firstChar := lit.Raw[0]
			// If it starts with a digit or minus, it's a number
			if (firstChar >= '0' && firstChar <= '9') || firstChar == '-' {
				return Number
			}
			// If it starts with a quote, it's a string
			if firstChar == '"' || firstChar == '\'' || firstChar == '`' {
				return String
			}
		}
		// Default to string
		return String
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return Number
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
		return NewArrayType(firstType)
	}
	return &Type{Kind: TupleType, Types: elementTypes}
}

// inferArrowFunctionType infiere el tipo de una arrow function
func (ti *TypeInferencer) inferArrowFunctionType(arrow *ast.ArrowFunctionExpression) *Type {
	// Por ahora, retornamos un tipo función genérico
	// En una implementación completa, analizaríamos los parámetros y el return
	params := make([]*Type, len(arrow.Params))
	for i := range params {
		params[i] = Any
	}

	return NewFunctionType(params, Any)
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
			// For spread elements, we would need to resolve the type of the argument
			// For now, we skip them
			continue
		}
	}

	// Create an anonymous object type with the inferred properties
	return NewObjectType("", properties)
}
