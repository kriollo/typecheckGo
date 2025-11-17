package types

// GetUtilityType returns a built-in utility type by name
func GetUtilityType(name string) *Type {
	switch name {
	case "Partial":
		return createPartialType()
	case "Required":
		return createRequiredType()
	case "Readonly":
		return createReadonlyType()
	case "Pick":
		return createPickType()
	case "Omit":
		return createOmitType()
	case "Record":
		return createRecordType()
	case "Exclude":
		return createExcludeType()
	case "Extract":
		return createExtractType()
	case "NonNullable":
		return createNonNullableType()
	case "ReturnType":
		return createReturnTypeType()
	case "Parameters":
		return createParametersType()
	case "Awaited":
		return createAwaitedType()
	default:
		return nil
	}
}

// Partial<T> - Makes all properties optional
func createPartialType() *Type {
	T := NewTypeParameter("T", nil, nil)

	return &Type{
		Kind: MappedType,
		Name: "Partial",
		Parameters: []*Type{T},
		TypeParameter: NewTypeParameter("K", &Type{Kind: TypeParameterType, Name: "keyof T"}, nil),
		MappedType: T,
	}
}

// Required<T> - Makes all properties required
func createRequiredType() *Type {
	T := NewTypeParameter("T", nil, nil)

	return &Type{
		Kind: MappedType,
		Name: "Required",
		Parameters: []*Type{T},
		TypeParameter: NewTypeParameter("K", &Type{Kind: TypeParameterType, Name: "keyof T"}, nil),
		MappedType: T,
	}
}

// Readonly<T> - Makes all properties readonly
func createReadonlyType() *Type {
	T := NewTypeParameter("T", nil, nil)

	return &Type{
		Kind: MappedType,
		Name: "Readonly",
		Parameters: []*Type{T},
		TypeParameter: NewTypeParameter("K", &Type{Kind: TypeParameterType, Name: "keyof T"}, nil),
		MappedType: T,
	}
}

// Pick<T, K> - Pick specific properties from T
func createPickType() *Type {
	T := NewTypeParameter("T", nil, nil)
	K := NewTypeParameter("K", &Type{Kind: TypeParameterType, Name: "keyof T"}, nil)

	return &Type{
		Kind: MappedType,
		Name: "Pick",
		Parameters: []*Type{T, K},
		TypeParameter: K,
		MappedType: T,
	}
}

// Omit<T, K> - Omit specific properties from T
func createOmitType() *Type {
	T := NewTypeParameter("T", nil, nil)
	K := NewTypeParameter("K", &Type{Kind: TypeParameterType, Name: "keyof T"}, nil)

	return &Type{
		Kind: MappedType,
		Name: "Omit",
		Parameters: []*Type{T, K},
		TypeParameter: K,
		MappedType: T,
	}
}

// Record<K, V> - Create an object type with keys K and values V
func createRecordType() *Type {
	K := NewTypeParameter("K", String, nil)
	V := NewTypeParameter("V", nil, nil)

	return &Type{
		Kind: MappedType,
		Name: "Record",
		Parameters: []*Type{K, V},
		TypeParameter: K,
		MappedType: V,
	}
}

// Exclude<T, U> - Exclude types from T that are assignable to U
func createExcludeType() *Type {
	T := NewTypeParameter("T", nil, nil)
	U := NewTypeParameter("U", nil, nil)

	return NewConditionalType(T, U, Never, T)
}

// Extract<T, U> - Extract types from T that are assignable to U
func createExtractType() *Type {
	T := NewTypeParameter("T", nil, nil)
	U := NewTypeParameter("U", nil, nil)

	return NewConditionalType(T, U, T, Never)
}

// NonNullable<T> - Exclude null and undefined from T
func createNonNullableType() *Type {
	T := NewTypeParameter("T", nil, nil)
	nullOrUndefined := NewUnionType([]*Type{Null, Undefined})

	return NewConditionalType(T, nullOrUndefined, Never, T)
}

// ReturnType<T> - Get the return type of a function
func createReturnTypeType() *Type {
	T := NewTypeParameter("T", &Type{Kind: FunctionType}, nil)

	return &Type{
		Kind: TypeParameterType,
		Name: "ReturnType",
		Parameters: []*Type{T},
	}
}

// Parameters<T> - Get the parameter types of a function as a tuple
func createParametersType() *Type {
	T := NewTypeParameter("T", &Type{Kind: FunctionType}, nil)

	return &Type{
		Kind: TupleType,
		Name: "Parameters",
		Parameters: []*Type{T},
	}
}

// Awaited<T> - Get the type that a Promise resolves to
func createAwaitedType() *Type {
	T := NewTypeParameter("T", nil, nil)

	return &Type{
		Kind: TypeParameterType,
		Name: "Awaited",
		Parameters: []*Type{T},
	}
}

// IsUtilityType checks if a type name is a built-in utility type
func IsUtilityType(name string) bool {
	utilityTypes := []string{
		"Partial", "Required", "Readonly", "Pick", "Omit", "Record",
		"Exclude", "Extract", "NonNullable", "ReturnType", "Parameters",
		"Awaited", "InstanceType", "ThisType", "ConstructorParameters",
	}

	for _, ut := range utilityTypes {
		if name == ut {
			return true
		}
	}
	return false
}
