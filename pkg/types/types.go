package types

import (
	"fmt"
	"regexp"
	"strings"
)

// TypeKind representa el tipo de un Type
type TypeKind int

const (
	UnknownType TypeKind = iota
	AnyType
	VoidType
	NeverType
	UndefinedType
	NullType
	BooleanType
	NumberType
	StringType
	SymbolType
	BigIntType
	ObjectType
	FunctionType
	ArrayType
	TupleType
	UnionType
	IntersectionType
	LiteralType
	TypeParameterType
	MappedType
	ConditionalType
	TemplateLiteralType
	IndexedAccessType
	RestType
	KeyOfType
	IntrinsicStringType
)

func (tk TypeKind) String() string {
	switch tk {
	case UnknownType:
		return "unknown"
	case AnyType:
		return "any"
	case VoidType:
		return "void"
	case NeverType:
		return "never"
	case UndefinedType:
		return "undefined"
	case NullType:
		return "null"
	case BooleanType:
		return "boolean"
	case NumberType:
		return "number"
	case StringType:
		return "string"
	case SymbolType:
		return "symbol"
	case BigIntType:
		return "bigint"
	case ObjectType:
		return "object"
	case FunctionType:
		return "function"
	case ArrayType:
		return "array"
	case TupleType:
		return "tuple"
	case UnionType:
		return "union"
	case IntersectionType:
		return "intersection"
	case LiteralType:
		return "literal"
	case TypeParameterType:
		return "type parameter"
	case MappedType:
		return "mapped type"
	case ConditionalType:
		return "conditional type"
	case TemplateLiteralType:
		return "template literal type"
	case IndexedAccessType:
		return "indexed access type"
	case KeyOfType:
		return "keyof"
	case IntrinsicStringType:
		return "intrinsic string"
	default:
		return "unknown"
	}
}

// Type representa un tipo en el sistema de tipos
type Type struct {
	Kind           TypeKind
	Name           string
	Properties     map[string]*Type
	ElementType    *Type       // Para arrays
	Parameters     []*Type     // Para funciones (argumentos)
	TypeParameters []*Type     // Para funciones genéricas y clases
	ReturnType     *Type       // Para funciones
	Types          []*Type     // Para unions/intersections
	Value          interface{} // Para literal types
	CallSignatures []*Type     // Para interfaces con call signatures
	IsFunction     bool        // Indica si el tipo es una función callable
	IsReadonly     bool        // Indica si el tipo es readonly (para arrays y propiedades)
	ThisType       *Type       // Tipo de 'this' para funciones

	// Para mapped types: { [K in keyof T]: U }
	TypeParameter *Type // K
	Constraint    *Type // keyof T
	MappedType    *Type // U

	// Para conditional types: T extends U ? X : Y or T extends infer U ? X : Y
	CheckType    *Type // T
	ExtendsType  *Type // U
	InferredType *Type // For infer keyword: the inferred type parameter
	TrueType     *Type // X
	FalseType    *Type // Y

	// Para template literal types
	TemplateParts []string // Las partes literales
	TemplateTypes []*Type  // Los tipos interpolados

	// Para indexed access types: T[K]
	ObjectType *Type // T
	IndexType  *Type // K

	// Para type parameters con constraints
	Default *Type // Tipo por defecto

	// Index signatures
	StringIndexType *Type // [key: string]: T
	NumberIndexType *Type // [key: number]: T

	// Mapped Type Modifiers
	MappedReadonly      bool // readonly [P in K]
	MappedMinusReadonly bool // -readonly [P in K]
	MappedOptional      bool // [P in K]?
	MappedMinusOptional bool // [P in K]-?

	// KeyOf Type
	KeyOfTarget *Type // keyof T

	// Intrinsic String Type (Capitalize, Uppercase, etc.)
	IntrinsicKind string // "Capitalize", "Uppercase", "Lowercase", "Uncapitalize"
}

// NewPrimitiveType crea un tipo primitivo
func NewPrimitiveType(kind TypeKind) *Type {
	return &Type{
		Kind: kind,
		Name: kind.String(),
	}
}

// NewObjectType crea un tipo objeto
func NewObjectType(name string, properties map[string]*Type) *Type {
	return &Type{
		Kind:       ObjectType,
		Name:       name,
		Properties: properties,
	}
}

// NewFunctionType crea un tipo función
func NewFunctionType(params []*Type, returnType *Type) *Type {
	return &Type{
		Kind:       FunctionType,
		Parameters: params,
		ReturnType: returnType,
		IsFunction: true,
	}
}

// NewFunctionTypeWithThis crea un tipo función con un tipo 'this' específico
func NewFunctionTypeWithThis(params []*Type, returnType *Type, thisType *Type) *Type {
	return &Type{
		Kind:       FunctionType,
		Parameters: params,
		ReturnType: returnType,
		IsFunction: true,
		ThisType:   thisType,
	}
}

func NewGenericFunctionType(typeParams []*Type, params []*Type, returnType *Type) *Type {
	return &Type{
		Kind:           FunctionType,
		TypeParameters: typeParams,
		Parameters:     params,
		ReturnType:     returnType,
		IsFunction:     true,
	}
}

// NewArrayType crea un tipo array
func NewArrayType(elementType *Type) *Type {
	return &Type{
		Kind:        ArrayType,
		ElementType: elementType,
	}
}

// NewTupleType crea un tipo tupla
func NewTupleType(types []*Type) *Type {
	return &Type{
		Kind:  TupleType,
		Types: types,
	}
}

// NewUnionType crea un tipo union
func NewUnionType(typesList []*Type) *Type {
	var uniqueTypes []*Type
	seen := make(map[string]bool)

	for _, t := range typesList {
		if t.Kind == NeverType {
			continue
		}
		if t.Kind == UnionType {
			for _, subT := range t.Types {
				str := subT.String()
				if !seen[str] {
					uniqueTypes = append(uniqueTypes, subT)
					seen[str] = true
				}
			}
		} else {
			str := t.String()
			if !seen[str] {
				uniqueTypes = append(uniqueTypes, t)
				seen[str] = true
			}
		}
	}

	if len(uniqueTypes) == 0 {
		return Never
	}
	if len(uniqueTypes) == 1 {
		return uniqueTypes[0]
	}

	return &Type{
		Kind:  UnionType,
		Types: uniqueTypes,
	}
}

// NewIntersectionType crea un tipo intersection
func NewIntersectionType(types []*Type) *Type {
	return &Type{
		Kind:  IntersectionType,
		Types: types,
	}
}

// NewLiteralType crea un tipo literal
func NewLiteralType(value interface{}) *Type {
	return &Type{
		Kind:  LiteralType,
		Value: value,
	}
}

// NewMappedType crea un mapped type { [K in T]: U }
func NewMappedType(typeParam *Type, constraint *Type, mappedType *Type, readonly, minusReadonly, optional, minusOptional bool) *Type {
	return &Type{
		Kind:                MappedType,
		TypeParameter:       typeParam,
		Constraint:          constraint,
		MappedType:          mappedType,
		MappedReadonly:      readonly,
		MappedMinusReadonly: minusReadonly,
		MappedOptional:      optional,
		MappedMinusOptional: minusOptional,
	}
}

// NewConditionalType crea un conditional type T extends U ? X : Y
func NewConditionalType(checkType *Type, extendsType *Type, trueType *Type, falseType *Type) *Type {
	return &Type{
		Kind:        ConditionalType,
		CheckType:   checkType,
		ExtendsType: extendsType,
		TrueType:    trueType,
		FalseType:   falseType,
	}
}

// NewConditionalTypeWithInfer crea un conditional type con infer: T extends infer U ? X : Y
func NewConditionalTypeWithInfer(checkType *Type, inferredType *Type, trueType *Type, falseType *Type) *Type {
	return &Type{
		Kind:         ConditionalType,
		CheckType:    checkType,
		ExtendsType:  nil, // No hay extends type cuando hay infer
		InferredType: inferredType,
		TrueType:     trueType,
		FalseType:    falseType,
	}
}

// NewKeyOfType crea un tipo keyof T
func NewKeyOfType(target *Type) *Type {
	return &Type{
		Kind:        KeyOfType,
		KeyOfTarget: target,
	}
}

// NewIntrinsicStringType crea un tipo string intrínseco (Capitalize, Uppercase, etc.)
func NewIntrinsicStringType(kind string) *Type {
	return &Type{
		Kind:          IntrinsicStringType,
		IntrinsicKind: kind,
	}
}

// NewTemplateLiteralType crea un template literal type
func NewTemplateLiteralType(parts []string, types []*Type) *Type {
	return &Type{
		Kind:          TemplateLiteralType,
		TemplateParts: parts,
		TemplateTypes: types,
	}
}

// NewIndexedAccessType crea un indexed access type T[K]
func NewIndexedAccessType(objectType *Type, indexType *Type) *Type {
	return &Type{
		Kind:       IndexedAccessType,
		ObjectType: objectType,
		IndexType:  indexType,
	}
}

// NewTypeParameter crea un type parameter
func NewTypeParameter(name string, constraint *Type, defaultType *Type) *Type {
	return &Type{
		Kind:       TypeParameterType,
		Name:       name,
		Constraint: constraint,
		Default:    defaultType,
	}
}

// NewRestType crea un rest type (...T)
func NewRestType(elemType *Type) *Type {
	return &Type{
		Kind:        RestType,
		ElementType: elemType,
	}
}

// String retorna una representación en string del tipo
func (t *Type) String() string {
	if t == nil {
		return "unknown"
	}

	switch t.Kind {
	case FunctionType:
		params := make([]string, len(t.Parameters))
		for i, p := range t.Parameters {
			params[i] = p.String()
		}
		returnType := "void"
		if t.ReturnType != nil {
			returnType = t.ReturnType.String()
		}
		return fmt.Sprintf("(%s) => %s", strings.Join(params, ", "), returnType)

	case ArrayType:
		if t.ElementType != nil {
			return t.ElementType.String() + "[]"
		}
		return "any[]"

	case UnionType:
		types := make([]string, len(t.Types))
		for i, typ := range t.Types {
			types[i] = typ.String()
		}
		return strings.Join(types, " | ")

	case TupleType:
		prefix := ""
		if t.IsReadonly {
			prefix = "readonly "
		}
		types := make([]string, len(t.Types))
		for i, typ := range t.Types {
			types[i] = typ.String()
		}
		return fmt.Sprintf("%s[%s]", prefix, strings.Join(types, ", "))

	case IntersectionType:
		types := make([]string, len(t.Types))
		for i, typ := range t.Types {
			types[i] = typ.String()
		}
		return strings.Join(types, " & ")

	case LiteralType:
		if str, ok := t.Value.(string); ok {
			return fmt.Sprintf("'%s'", str)
		}
		return fmt.Sprintf("%v", t.Value)

	case MappedType:
		return fmt.Sprintf("{ [%s in %s]: %s }",
			t.TypeParameter.String(),
			t.Constraint.String(),
			t.MappedType.String())

	case ConditionalType:
		if t.InferredType != nil {
			return fmt.Sprintf("%s extends infer %s ? %s : %s",
				t.CheckType.String(),
				t.InferredType.String(),
				t.TrueType.String(),
				t.FalseType.String())
		}
		return fmt.Sprintf("%s extends %s ? %s : %s",
			t.CheckType.String(),
			t.ExtendsType.String(),
			t.TrueType.String(),
			t.FalseType.String())

	case TemplateLiteralType:
		result := "`"
		for i, part := range t.TemplateParts {
			result += part
			if i < len(t.TemplateTypes) {
				result += "${" + t.TemplateTypes[i].String() + "}"
			}
		}
		result += "`"
		return result

	case IndexedAccessType:
		return fmt.Sprintf("%s[%s]", t.ObjectType.String(), t.IndexType.String())

	case TypeParameterType:
		if t.Constraint != nil {
			return fmt.Sprintf("%s extends %s", t.Name, t.Constraint.String())
		}
		return t.Name

	case RestType:
		return "..." + t.ElementType.String()

	case ObjectType:
		if t.Name != "" && t.Name != "object" {
			return t.Name
		}
		// Anonymous object, print properties
		if len(t.Properties) == 0 {
			return "{}"
		}
		var props []string
		for name, typ := range t.Properties {
			props = append(props, fmt.Sprintf("%s: %s", name, typ.String()))
		}
		return fmt.Sprintf("{ %s }", strings.Join(props, "; "))

	default:
		if t.Name != "" {
			return t.Name
		}
		return t.Kind.String()
	}
}

// IsAssignableTo verifica si este tipo es asignable a otro tipo
func (t *Type) IsAssignableTo(target *Type) bool {
	if t == nil || target == nil {
		return false
	}

	// any es asignable a todo y todo es asignable a any
	if t.Kind == AnyType || target.Kind == AnyType {
		return true
	}

	// unknown solo es asignable a unknown y any
	if t.Kind == UnknownType {
		return target.Kind == UnknownType || target.Kind == AnyType
	}

	// unknown es el top type: todo es asignable a unknown
	if target.Kind == UnknownType {
		return true
	}

	// never es asignable a todo
	if t.Kind == NeverType {
		return true
	}

	// Tipos primitivos deben coincidir exactamente
	if t.Kind == target.Kind && t.Kind <= BigIntType {
		return true
	}

	// Union types
	if t.Kind == UnionType {
		// Todos los tipos en la union deben ser asignables al target
		for _, typ := range t.Types {
			if !typ.IsAssignableTo(target) {
				return false
			}
		}
		return true
	}

	if target.Kind == UnionType {
		// El tipo debe ser asignable a al menos uno de los tipos en la union
		for _, typ := range target.Types {
			if t.IsAssignableTo(typ) {
				return true
			}
		}
		return false
	}

	// Arrays
	if t.Kind == ArrayType && target.Kind == ArrayType {
		if t.ElementType != nil && target.ElementType != nil {
			return t.ElementType.IsAssignableTo(target.ElementType)
		}
		return true
	}

	// Tuples
	if t.Kind == TupleType && target.Kind == TupleType {
		if len(t.Types) != len(target.Types) {
			return false
		}
		for i := range t.Types {
			if !t.Types[i].IsAssignableTo(target.Types[i]) {
				return false
			}
		}
		return true
	}

	// Functions
	if t.Kind == FunctionType {
		if target.Kind == FunctionType {
			return true // TODO: implementar contravariance/covariance
		}
		// Function assignable to Interface with Call Signature
		if target.Kind == ObjectType && len(target.CallSignatures) > 0 {
			// Check if function matches at least one call signature
			// For now, just return true if there are call signatures
			// In a real implementation, we should check parameters and return type
			return true
		}
	}

	// Object types (Structural typing)
	if t.Kind == ObjectType && target.Kind == ObjectType {
		// If target has no properties, any object is assignable (except null/undefined which are handled by Kind check)
		if len(target.Properties) == 0 {
			return true
		}

		// Check if all required properties in target exist in t and are compatible
		for name, targetProp := range target.Properties {
			// Check if property is optional (this logic depends on how optionality is stored)
			// In this simple implementation, we assume properties in the map are required unless they are union with undefined
			// But wait, the AST has optional flag, but Type struct doesn't seem to have it explicitly on the property map.
			// Usually optional properties are represented as UnionType(T | Undefined).

			propInT, exists := t.Properties[name]
			if !exists {
				// If property is missing in t, it must be optional in target (i.e., allow undefined)
				if targetProp.Kind == UnionType {
					isOptional := false
					for _, unionPart := range targetProp.Types {
						if unionPart.Kind == UndefinedType {
							isOptional = true
							break
						}
					}
					if isOptional {
						continue
					}
				}
				// Also check if targetProp itself is Undefined (unlikely for a property type but possible)
				if targetProp.Kind == UndefinedType {
					continue
				}

				return false
			}

			// Property exists, check compatibility
			if !propInT.IsAssignableTo(targetProp) {
				return false
			}
		}
		return true
	}

	// Literal Types
	if t.Kind == LiteralType {
		// Literal assignable to same literal
		if target.Kind == LiteralType {
			return t.Value == target.Value
		}
		// Literal assignable to corresponding primitive
		switch t.Value.(type) {
		case string:
			if target.Kind == TemplateLiteralType {
				return target.matchesTemplate(t.Value.(string))
			}
			return target.Kind == StringType
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			return target.Kind == NumberType
		case bool:
			return target.Kind == BooleanType
		}
	}

	return false

}

// matchesTemplate checks if a string matches a template literal type
func (t *Type) matchesTemplate(s string) bool {
	// Build regex pattern
	pattern := "^"
	for i, part := range t.TemplateParts {
		pattern += regexp.QuoteMeta(part)
		if i < len(t.TemplateTypes) {
			subType := t.TemplateTypes[i]
			pattern += buildPatternForType(subType)
		}
	}
	pattern += "$"
	matched, _ := regexp.MatchString(pattern, s)
	return matched
}

// buildPatternForType converts a type into a regex pattern for template matching
func buildPatternForType(t *Type) string {
	switch t.Kind {
	case StringType:
		return ".*"
	case IntrinsicStringType:
		// Handle intrinsic string types with specific patterns
		switch t.IntrinsicKind {
		case "Capitalize":
			// Match string starting with uppercase letter
			return "[A-Z].*"
		case "Uncapitalize":
			// Match string starting with lowercase letter
			return "[a-z].*"
		case "Uppercase":
			// Match all uppercase string
			return "[A-Z]*"
		case "Lowercase":
			// Match all lowercase string
			return "[a-z]*"
		default:
			return ".*"
		}
	case NumberType:
		return "[0-9.]+" // Simplified
	case BooleanType:
		return "(true|false)"
	case LiteralType:
		if str, ok := t.Value.(string); ok {
			// Strip surrounding quotes if present
			normalized := str
			if len(str) >= 2 && ((str[0] == '\'' && str[len(str)-1] == '\'') || (str[0] == '"' && str[len(str)-1] == '"')) {
				normalized = str[1 : len(str)-1]
			}
			return regexp.QuoteMeta(normalized)
		}
		return ".*"
	case UnionType:
		// Convert union to regex alternation: "GET" | "POST" -> (GET|POST)
		var alternatives []string
		for _, member := range t.Types {
			alternatives = append(alternatives, buildPatternForType(member))
		}
		if len(alternatives) == 0 {
			return ".*"
		}
		return "(" + strings.Join(alternatives, "|") + ")"
	case TemplateLiteralType:
		// Recursively build pattern for nested template literal
		var nestedPattern string
		for i, part := range t.TemplateParts {
			nestedPattern += regexp.QuoteMeta(part)
			if i < len(t.TemplateTypes) {
				nestedPattern += buildPatternForType(t.TemplateTypes[i])
			}
		}
		return nestedPattern
	default:
		return ".*"
	}
}

// Tipos primitivos predefinidos
var (
	Any       = NewPrimitiveType(AnyType)
	Unknown   = NewPrimitiveType(UnknownType)
	Void      = NewPrimitiveType(VoidType)
	Never     = NewPrimitiveType(NeverType)
	Undefined = NewPrimitiveType(UndefinedType)
	Null      = NewPrimitiveType(NullType)
	Boolean   = NewPrimitiveType(BooleanType)
	Number    = NewPrimitiveType(NumberType)
	String    = NewPrimitiveType(StringType)
	Symbol    = NewPrimitiveType(SymbolType)
	BigInt    = NewPrimitiveType(BigIntType)
)

// ParameterTypeInferencer interface for inferring types of destructured parameters
type ParameterTypeInferencer interface {
	// InferDestructuredParamType infers the type of a destructured parameter property
	InferDestructuredParamType(functionName string, paramIndex int, propertyName string) *Type
}
