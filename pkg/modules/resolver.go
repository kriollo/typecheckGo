package modules

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/parser"
)

// ModuleResolver maneja la resolución de módulos ES/TS
type ModuleResolver struct {
	// Cache de módulos ya resueltos para evitar recálculos
	moduleCache map[string]*ResolvedModule
	
	// Tabla de símbolos global para acceder a exports
	symbolTable *symbols.SymbolTable
	
	// Directorio raíz del proyecto
	rootDir string
	
	// Extensiones válidas para módulos
	extensions []string
}

// ResolvedModule representa un módulo resuelto
type ResolvedModule struct {
	// Ruta absoluta del archivo
	AbsolutePath string
	
	// Ruta relativa desde la raíz del proyecto
	RelativePath string
	
	// Especificador de importación original
	Specifier string
	
	// AST del módulo
	ModuleAST *ast.File
	
	// Tabla de símbolos del módulo
	ModuleSymbols *symbols.SymbolTable
	
	// Exports del módulo
	Exports map[string]*ExportInfo
	
	// Default export (si existe)
	DefaultExport *ExportInfo
	
	// Si es un módulo externo (node_modules)
	IsExternal bool
	
	// Si es un módulo TypeScript
	IsTypeScript bool
}

// ExportInfo representa información sobre un export
type ExportInfo struct {
	// Nombre del export
	Name string
	
	// Tipo de export: "named", "default", "namespace"
	Type string
	
	// Nodo AST del símbolo exportado
	Node ast.Node
	
	// Posición en el código
	Position ast.Position
	
	// Si es una re-exportación
	IsReExport bool
	
	// Módulo fuente para re-exports
	SourceModule string
}

// NewModuleResolver crea un nuevo resolver de módulos
func NewModuleResolver(rootDir string, symbolTable *symbols.SymbolTable) *ModuleResolver {
	return &ModuleResolver{
		moduleCache:  make(map[string]*ResolvedModule),
		symbolTable:  symbolTable,
		rootDir:      rootDir,
		extensions:   []string{".ts", ".tsx", ".js", ".jsx", ".mjs"},
	}
}

// ResolveModule resuelve un especificador de módulo desde un archivo origen
func (r *ModuleResolver) ResolveModule(specifier string, fromFile string) (*ResolvedModule, error) {
	// Verificar cache primero
	cacheKey := fmt.Sprintf("%s:%s", specifier, fromFile)
	if cached, exists := r.moduleCache[cacheKey]; exists {
		return cached, nil
	}
	
	// Determinar la ruta base desde la cual resolver
	var basePath string
	if fromFile == "" || fromFile == r.rootDir {
		basePath = r.rootDir
	} else {
		basePath = filepath.Dir(fromFile)
	}
	
	// Resolver según el tipo de especificador
	var resolvedPath string
	var err error
	
	if r.isRelativePath(specifier) {
		// Path relativo: ./foo, ../bar
		resolvedPath, err = r.resolveRelativePath(specifier, basePath)
	} else if r.isAbsolutePath(specifier) {
		// Path absoluto: /foo/bar
		resolvedPath, err = r.resolveAbsolutePath(specifier)
	} else {
		// Módulo externo o módulo del proyecto
		resolvedPath, err = r.resolveModuleSpecifier(specifier, basePath)
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to resolve module %s: %w", specifier, err)
	}
	
	// Cargar y analizar el módulo
	module, err := r.loadModule(resolvedPath, specifier)
	if err != nil {
		return nil, fmt.Errorf("failed to load module %s: %w", resolvedPath, err)
	}
	
	// Cachear el resultado
	r.moduleCache[cacheKey] = module
	
	return module, nil
}

// isRelativePath verifica si un especificador es una ruta relativa
func (r *ModuleResolver) isRelativePath(specifier string) bool {
	return strings.HasPrefix(specifier, "./") || strings.HasPrefix(specifier, "../")
}

// isAbsolutePath verifica si un especificador es una ruta absoluta
func (r *ModuleResolver) isAbsolutePath(specifier string) bool {
	return filepath.IsAbs(specifier)
}

// resolveRelativePath resuelve una ruta relativa
func (r *ModuleResolver) resolveRelativePath(specifier string, basePath string) (string, error) {
	// Unir la ruta base con el especificador
	fullPath := filepath.Join(basePath, specifier)
	
	// Intentar encontrar el archivo con diferentes extensiones
	return r.resolveFilePath(fullPath)
}

// resolveAbsolutePath resuelve una ruta absoluta
func (r *ModuleResolver) resolveAbsolutePath(specifier string) (string, error) {
	// Para rutas absolutas, verificar si existe directamente
	if _, err := os.Stat(specifier); err == nil {
		return specifier, nil
	}
	
	// Intentar con extensiones
	return r.resolveFilePath(specifier)
}

// resolveModuleSpecifier resuelve especificadores de módulos (no paths)
func (r *ModuleResolver) resolveModuleSpecifier(specifier string, basePath string) (string, error) {
	// Primero verificar si es un módulo del proyecto
	projectModule, err := r.resolveProjectModule(specifier, basePath)
	if err == nil {
		return projectModule, nil
	}
	
	// Luego verificar node_modules
	nodeModule, err := r.resolveNodeModule(specifier, basePath)
	if err == nil {
		return nodeModule, nil
	}
	
	return "", fmt.Errorf("module not found: %s", specifier)
}

// resolveFilePath intenta resolver un archivo probando diferentes extensiones
func (r *ModuleResolver) resolveFilePath(basePath string) (string, error) {
	// Primero verificar si el archivo existe tal cual
	if _, err := os.Stat(basePath); err == nil {
		return basePath, nil
	}
	
	// Intentar con diferentes extensiones
	for _, ext := range r.extensions {
		pathWithExt := basePath + ext
		if _, err := os.Stat(pathWithExt); err == nil {
			return pathWithExt, nil
		}
	}
	
	// Intentar como directorio con index
	for _, ext := range r.extensions {
		indexPath := filepath.Join(basePath, "index"+ext)
		if _, err := os.Stat(indexPath); err == nil {
			return indexPath, nil
		}
	}
	
	return "", fmt.Errorf("file not found: %s", basePath)
}

// resolveProjectModule intenta resolver un módulo del proyecto actual
func (r *ModuleResolver) resolveProjectModule(specifier string, basePath string) (string, error) {
	// Buscar en el proyecto actual - asumimos que los módulos del proyecto
	// están en el directorio raíz o en subdirectorios específicos
	possiblePaths := []string{
		filepath.Join(r.rootDir, specifier),
		filepath.Join(r.rootDir, "src", specifier),
		filepath.Join(r.rootDir, "lib", specifier),
	}
	
	for _, path := range possiblePaths {
		if resolved, err := r.resolveFilePath(path); err == nil {
			return resolved, nil
		}
	}
	
	return "", fmt.Errorf("project module not found: %s", specifier)
}

// resolveNodeModule intenta resolver un módulo de node_modules
func (r *ModuleResolver) resolveNodeModule(specifier string, basePath string) (string, error) {
	// Buscar en node_modules comenzando desde basePath y subiendo
	currentDir := basePath
	
	for {
		// Intentar node_modules/local
		nodeModulesPath := filepath.Join(currentDir, "node_modules", specifier)
		if resolved, err := r.resolveFilePath(nodeModulesPath); err == nil {
			return resolved, nil
		}
		
		// Subir un nivel
		parentDir := filepath.Dir(currentDir)
		if parentDir == currentDir {
			// Llegamos a la raíz
			break
		}
		currentDir = parentDir
	}
	
	return "", fmt.Errorf("node module not found: %s", specifier)
}

// loadModule carga y analiza un módulo
func (r *ModuleResolver) loadModule(filePath string, specifier string) (*ResolvedModule, error) {
	// Determinar si es TypeScript
	isTypeScript := strings.HasSuffix(filePath, ".ts") || strings.HasSuffix(filePath, ".tsx")
	
	// Parsear el archivo
	program, err := parser.ParseFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse file %s: %w", filePath, err)
	}
	
	// Crear el módulo
	module := &ResolvedModule{
		AbsolutePath:  filePath,
		RelativePath:  r.getRelativePath(filePath),
		Specifier:     specifier,
		ModuleAST:     program,
		ModuleSymbols: r.symbolTable, // Usar la tabla de símbolos global
		Exports:       make(map[string]*ExportInfo),
		IsExternal:    strings.Contains(filePath, "node_modules"),
		IsTypeScript:  isTypeScript,
	}
	
	// Analizar los exports del módulo
	analyzer := NewModuleAnalyzer(r)
	if err := analyzer.AnalyzeModule(module, program); err != nil {
		return nil, fmt.Errorf("failed to analyze module %s: %w", filePath, err)
	}
	
	return module, nil
}

// getRelativePath obtiene la ruta relativa desde la raíz del proyecto
func (r *ModuleResolver) getRelativePath(absolutePath string) string {
	relPath, err := filepath.Rel(r.rootDir, absolutePath)
	if err != nil {
		return absolutePath
	}
	return relPath
}


