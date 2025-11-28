package modules

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/parser"
	"tstypechecker/pkg/symbols"
	"tstypechecker/pkg/types"
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

	// BaseUrl from tsconfig for path resolution
	baseUrl string

	// Path aliases from tsconfig (e.g., "@/*": ["src/*"])
	paths map[string][]string

	// Type roots for .d.ts files (e.g., ["./node_modules/@types", "./types"])
	typeRoots []string

	// Cache for file existence checks to reduce os.Stat calls
	fileCache map[string]bool

	// Cache for modules that could not be resolved
	notFoundCache map[string]bool

	// Mutex for thread safety
	mu sync.RWMutex
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

	// Cached inferred type
	ResolvedType *types.Type
}

// NewModuleResolver crea un nuevo resolver de módulos
func NewModuleResolver(rootDir string, symbolTable *symbols.SymbolTable) *ModuleResolver {
	return &ModuleResolver{
		moduleCache:   make(map[string]*ResolvedModule),
		symbolTable:   symbolTable,
		rootDir:       rootDir,
		extensions:    []string{".ts", ".tsx", ".js", ".jsx", ".mjs", ".d.ts"},
		baseUrl:       "",
		paths:         make(map[string][]string),
		typeRoots:     []string{"./node_modules/@types", "./types"},
		fileCache:     make(map[string]bool),
		notFoundCache: make(map[string]bool),
	}
}

// SetPathAliases configura los path aliases desde tsconfig
func (r *ModuleResolver) SetPathAliases(baseUrl string, paths map[string][]string) {
	r.baseUrl = baseUrl
	r.paths = paths
}

// SetTypeRoots configura los typeRoots desde tsconfig
func (r *ModuleResolver) SetTypeRoots(typeRoots []string) {
	if len(typeRoots) > 0 {
		r.typeRoots = typeRoots
	}
}

// GetRootDir returns the root directory of the project
func (r *ModuleResolver) GetRootDir() string {
	return r.rootDir
}

// ResolveModule resuelve un especificador de módulo desde un archivo origen
func (r *ModuleResolver) ResolveModule(specifier string, fromFile string) (*ResolvedModule, error) {
	// Verificar cache primero
	cacheKey := fmt.Sprintf("%s:%s", specifier, fromFile)

	r.mu.RLock()
	if cached, exists := r.moduleCache[cacheKey]; exists {
		r.mu.RUnlock()
		return cached, nil
	}

	// Check not found cache
	if r.notFoundCache[cacheKey] {
		r.mu.RUnlock()
		return nil, fmt.Errorf("module not found (cached): %s", specifier)
	}
	r.mu.RUnlock()

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
		r.mu.Lock()
		r.notFoundCache[cacheKey] = true
		r.mu.Unlock()
		return nil, fmt.Errorf("failed to resolve module %s: %w", specifier, err)
	}

	// Cargar y analizar el módulo
	module, err := r.LoadModule(resolvedPath, specifier)
	if err != nil {
		return nil, fmt.Errorf("failed to load module %s: %w", resolvedPath, err)
	}

	// Cachear el resultado
	r.mu.Lock()
	r.moduleCache[cacheKey] = module
	r.mu.Unlock()

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
	if r.fileExists(specifier) {
		return specifier, nil
	}

	// Intentar con extensiones
	return r.resolveFilePath(specifier)
}

// resolveModuleSpecifier resuelve especificadores de módulos (no paths)
func (r *ModuleResolver) resolveModuleSpecifier(specifier string, basePath string) (string, error) {
	// Primero intentar resolver con path aliases (e.g., @/foo -> src/foo)
	if aliasPath, err := r.resolvePathAlias(specifier); err == nil {
		return aliasPath, nil
	}

	// Intentar resolver como archivo de declaración (.d.ts) en typeRoots
	if typeRootPath, err := r.resolveFromTypeRoots(specifier); err == nil {
		return typeRootPath, nil
	}

	// Luego verificar si es un módulo del proyecto
	projectModule, err := r.resolveProjectModule(specifier, basePath)
	if err == nil {
		return projectModule, nil
	}

	// Finalmente verificar node_modules (incluyendo @types/*)
	nodeModule, err := r.resolveNodeModule(specifier, basePath)
	if err == nil {
		return nodeModule, nil
	}

	return "", fmt.Errorf("module not found: %s", specifier)
}

// resolvePathAlias intenta resolver un especificador usando path aliases de tsconfig
func (r *ModuleResolver) resolvePathAlias(specifier string) (string, error) {
	if len(r.paths) == 0 {
		return "", fmt.Errorf("no path aliases configured")
	}

	// Buscar coincidencias en los path aliases
	for alias, targets := range r.paths {
		// Quitar el * del patrón de alias para obtener el prefijo
		aliasPrefix := strings.TrimSuffix(alias, "*")

		// Si el especificador comienza con el prefijo del alias
		if strings.HasPrefix(specifier, aliasPrefix) {
			// Obtener la parte después del prefijo
			remainder := strings.TrimPrefix(specifier, aliasPrefix)

			// Intentar cada target configurado para este alias
			for _, target := range targets {
				// Reemplazar el * en el target con el remainder
				targetPath := strings.Replace(target, "*", remainder, 1)

				// Resolver la ruta completa usando baseUrl
				var fullPath string
				if r.baseUrl != "" {
					fullPath = filepath.Join(r.rootDir, r.baseUrl, targetPath)
				} else {
					fullPath = filepath.Join(r.rootDir, targetPath)
				}

				// Intentar resolver el archivo
				if resolved, err := r.resolveFilePath(fullPath); err == nil {
					return resolved, nil
				}
			}
		}
	}

	return "", fmt.Errorf("no matching path alias found for: %s", specifier)
}

// resolveFromTypeRoots intenta resolver un módulo desde los typeRoots
func (r *ModuleResolver) resolveFromTypeRoots(specifier string) (string, error) {
	if len(r.typeRoots) == 0 {
		return "", fmt.Errorf("no typeRoots configured")
	}

	// Para cada typeRoot, buscar el módulo
	for _, typeRoot := range r.typeRoots {
		// Resolver la ruta completa del typeRoot
		var typeRootPath string
		if filepath.IsAbs(typeRoot) {
			typeRootPath = typeRoot
		} else {
			typeRootPath = filepath.Join(r.rootDir, typeRoot)
		}

		// Intentar diferentes rutas posibles
		possiblePaths := []string{
			// Para "versaTypes", buscar en typeRoots/versaTypes.d.ts
			filepath.Join(typeRootPath, specifier+".d.ts"),
			// Para "versaTypes", buscar en typeRoots/versaTypes/index.d.ts
			filepath.Join(typeRootPath, specifier, "index.d.ts"),
			// Buscar recursivamente en subdirectorios
			filepath.Join(typeRootPath, "**", specifier+".d.ts"),
		}

		for _, path := range possiblePaths {
			// Si el path contiene **, buscar recursivamente
			if strings.Contains(path, "**") {
				baseDir := filepath.Dir(strings.Split(path, "**")[0])
				if found := r.findFileRecursive(baseDir, specifier+".d.ts"); found != "" {
					if os.Getenv("TSCHECK_DEBUG") == "1" {
						fmt.Fprintf(os.Stderr, "DEBUG: Resolved '%s' from typeRoots: %s\n", specifier, found)
					}
					return found, nil
				}
			} else if r.fileExists(path) {
				if os.Getenv("TSCHECK_DEBUG") == "1" {
					fmt.Fprintf(os.Stderr, "DEBUG: Resolved '%s' from typeRoots: %s\n", specifier, path)
				}
				return path, nil
			}
		}
	}

	return "", fmt.Errorf("module not found in typeRoots: %s", specifier)
}

// findFileRecursive busca un archivo recursivamente en un directorio
func (r *ModuleResolver) findFileRecursive(dir string, filename string) string {
	var result string
	_ = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continuar incluso si hay error
		}
		if info.IsDir() {
			return nil
		}
		if info.Name() == filename {
			result = path
			return filepath.SkipDir // Detener búsqueda
		}
		return nil
	})
	return result
}

// fileExists checks if a file exists, using a cache to avoid repeated os.Stat calls
func (r *ModuleResolver) fileExists(path string) bool {
	r.mu.RLock()
	if exists, ok := r.fileCache[path]; ok {
		r.mu.RUnlock()
		return exists
	}
	r.mu.RUnlock()

	_, err := os.Stat(path)
	exists := err == nil

	r.mu.Lock()
	r.fileCache[path] = exists
	r.mu.Unlock()

	return exists
}

// resolveFilePath intenta resolver un archivo probando diferentes extensiones
func (r *ModuleResolver) resolveFilePath(basePath string) (string, error) {
	// Si el path tiene extensión .js, .jsx, o .mjs, intentar reemplazarla con .ts/.tsx
	ext := filepath.Ext(basePath)
	if ext == ".js" || ext == ".jsx" || ext == ".mjs" {
		// Quitar la extensión JS y probar con TS
		baseWithoutExt := basePath[:len(basePath)-len(ext)]

		// Probar con .ts primero
		tsPath := baseWithoutExt + ".ts"
		if r.fileExists(tsPath) {
			return tsPath, nil
		}

		// Probar con .tsx
		tsxPath := baseWithoutExt + ".tsx"
		if r.fileExists(tsxPath) {
			return tsxPath, nil
		}
	}

	// Primero verificar si el archivo existe tal cual
	if r.fileExists(basePath) {
		return basePath, nil
	}

	// Intentar con diferentes extensiones
	for _, extension := range r.extensions {
		pathWithExt := basePath + extension
		if r.fileExists(pathWithExt) {
			return pathWithExt, nil
		}
	}

	// Intentar como directorio con index
	for _, extension := range r.extensions {
		indexPath := filepath.Join(basePath, "index"+extension)
		if r.fileExists(indexPath) {
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
		// Intentar node_modules/specifier
		nodeModulesPath := filepath.Join(currentDir, "node_modules", specifier)
		if resolved, err := r.resolveFilePath(nodeModulesPath); err == nil {
			return resolved, nil
		}

		// Intentar node_modules/@types/specifier para tipos globales
		typesPath := filepath.Join(currentDir, "node_modules", "@types", specifier)
		if resolved, err := r.resolveFilePath(typesPath); err == nil {
			return resolved, nil
		}

		// Si el specifier tiene un scope (ej: @angular/core), intentar @types/@angular__core
		if strings.HasPrefix(specifier, "@") {
			// Reemplazar / con __ para @types
			typesScoped := strings.Replace(specifier, "/", "__", 1)
			typesScopedPath := filepath.Join(currentDir, "node_modules", "@types", typesScoped)
			if resolved, err := r.resolveFilePath(typesScopedPath); err == nil {
				return resolved, nil
			}
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

// LoadModule carga y analiza un módulo
func (r *ModuleResolver) LoadModule(filePath string, specifier string) (module *ResolvedModule, err error) {
	// Check cache first using absolute path as key
	// This prevents re-parsing the same file when called directly
	r.mu.RLock()
	if cached, exists := r.moduleCache[filePath]; exists {
		r.mu.RUnlock()
		return cached, nil
	}
	r.mu.RUnlock()

	// Recover from parser panics to prevent crashes
	defer func() {
		if panicErr := recover(); panicErr != nil {
			// On panic, create an empty module instead of failing
			module = &ResolvedModule{
				AbsolutePath:  filePath,
				RelativePath:  r.getRelativePath(filePath),
				Specifier:     specifier,
				ModuleAST:     nil,
				ModuleSymbols: r.symbolTable,
				Exports:       make(map[string]*ExportInfo),
				IsExternal:    strings.Contains(filePath, "node_modules"),
				IsTypeScript:  strings.HasSuffix(filePath, ".ts") || strings.HasSuffix(filePath, ".tsx"),
			}
			err = nil // Don't return error, allow module to be treated as valid but empty
		}
	}()

	// Determinar si es TypeScript
	isTypeScript := strings.HasSuffix(filePath, ".ts") || strings.HasSuffix(filePath, ".tsx")

	// Parsear el archivo
	program, parseErr := parser.ParseFile(filePath)
	if parseErr != nil {
		// On parse error, create an empty module instead of failing
		module = &ResolvedModule{
			AbsolutePath:  filePath,
			RelativePath:  r.getRelativePath(filePath),
			Specifier:     specifier,
			ModuleAST:     nil,
			ModuleSymbols: r.symbolTable,
			Exports:       make(map[string]*ExportInfo),
			IsExternal:    strings.Contains(filePath, "node_modules"),
			IsTypeScript:  isTypeScript,
		}
		// Cache even failed modules to avoid re-parsing
		r.mu.Lock()
		r.moduleCache[filePath] = module
		r.mu.Unlock()
		return module, nil // Return empty module, not error
	}

	// Crear el módulo
	module = &ResolvedModule{
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
	if analyzeErr := analyzer.AnalyzeModule(module, program); analyzeErr != nil {
		// On analyze error, return module with empty exports instead of failing
		// Cache it anyway to avoid re-parsing
		r.mu.Lock()
		r.moduleCache[filePath] = module
		r.mu.Unlock()
		return module, nil
	}

	// Cache the successfully loaded module
	r.mu.Lock()
	r.moduleCache[filePath] = module
	r.mu.Unlock()

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
