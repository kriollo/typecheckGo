package types

// GlobalEnvironment contiene los tipos y símbolos globales de JavaScript/TypeScript
type GlobalEnvironment struct {
	Parent  *GlobalEnvironment // Shared read-only parent environment
	Types   map[string]*Type
	Objects map[string]*Type
}

// NewGlobalEnvironment crea un nuevo entorno global con todos los tipos y objetos estándar
func NewGlobalEnvironment() *GlobalEnvironment {
	return NewGlobalEnvironmentWithLibs([]string{"ES2020", "ES2020.Intl", "DOM"})
}

// NewGlobalEnvironmentWithLibs creates a global environment with specific library support
func NewGlobalEnvironmentWithLibs(libs []string) *GlobalEnvironment {
	env := &GlobalEnvironment{
		Types:   make(map[string]*Type),
		Objects: make(map[string]*Type),
	}

	// Only register intrinsic primitive types that are part of the TypeScript language itself
	// All other types (Object, Array, Math, Date, etc.) will be loaded from .d.ts files
	env.Types["any"] = Any
	env.Types["unknown"] = Unknown
	env.Types["void"] = Void
	env.Types["never"] = Never
	env.Types["undefined"] = Undefined
	env.Types["null"] = Null
	env.Types["boolean"] = Boolean
	env.Types["number"] = Number
	env.Types["string"] = String
	env.Types["symbol"] = Symbol
	env.Types["bigint"] = BigInt

	// Utility types are also intrinsic to TypeScript's type system
	utilityTypes := []string{
		"Partial", "Required", "Readonly", "Pick", "Omit", "Record",
		"Exclude", "Extract", "NonNullable", "ReturnType", "Parameters", "Awaited",
	}
	for _, name := range utilityTypes {
		if ut := GetUtilityType(name); ut != nil {
			env.Types[name] = ut
		}
	}

	return env
}

// addThirdPartyGlobals checks for installed @types packages and adds their globals
func (env *GlobalEnvironment) addThirdPartyGlobals() {
	// This function is intentionally left minimal
	// Type definitions from @types packages are loaded via the checker's
	// extractGlobalsFromFile method which handles .d.ts files generically
}

// GetType retorna un tipo por nombre
func (env *GlobalEnvironment) GetType(name string) (*Type, bool) {
	typ, exists := env.Types[name]
	if !exists && env.Parent != nil {
		return env.Parent.GetType(name)
	}
	return typ, exists
}

// GetObject retorna un objeto global por nombre
func (env *GlobalEnvironment) GetObject(name string) (*Type, bool) {
	obj, exists := env.Objects[name]
	if !exists && env.Parent != nil {
		return env.Parent.GetObject(name)
	}
	return obj, exists
}

// HasGlobal verifica si un nombre es un global conocido
func (env *GlobalEnvironment) HasGlobal(name string) bool {
	_, existsType := env.Types[name]
	_, existsObj := env.Objects[name]
	if existsType || existsObj {
		return true
	}
	if env.Parent != nil {
		return env.Parent.HasGlobal(name)
	}
	return false
}

// ObjectCount returns the number of global objects loaded
// Used to check if types have been copied from another checker
func (env *GlobalEnvironment) ObjectCount() int {
	count := len(env.Objects)
	if env.Parent != nil {
		count += env.Parent.ObjectCount()
	}
	return count
}
