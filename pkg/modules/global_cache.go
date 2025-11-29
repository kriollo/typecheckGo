package modules

import (
	"crypto/sha256"
	"fmt"
	"sync"
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// CachedFile represents a cached file content and its parsed artifacts
type CachedFile struct {
	ContentHash string
	Interfaces  []*ast.InterfaceDeclaration
	Globals     []*ast.VariableDeclarator // Simplified for now, might need more complex structure
	Module      *ResolvedModule
	// We can add more fields here as needed, e.g. TypeAliases
}

// GlobalCache manages a global cache of parsed files keyed by content hash
type GlobalCache struct {
	mu    sync.RWMutex
	files map[string]*CachedFile // Key is content hash
}

// SharedGlobalCache is the singleton instance of the global cache
var SharedGlobalCache = NewGlobalCache()

// NewGlobalCache creates a new global cache
func NewGlobalCache() *GlobalCache {
	return &GlobalCache{
		files: make(map[string]*CachedFile),
	}
}

// CalculateHash calculates the SHA256 hash of the content
func (gc *GlobalCache) CalculateHash(content []byte) string {
	hash := sha256.Sum256(content)
	return fmt.Sprintf("%x", hash)
}

// Get retrieves a cached file by its content hash
func (gc *GlobalCache) Get(hash string) *CachedFile {
	gc.mu.RLock()
	defer gc.mu.RUnlock()
	return gc.files[hash]
}

// Put stores a file in the cache
func (gc *GlobalCache) Put(hash string, file *CachedFile) {
	gc.mu.Lock()
	defer gc.mu.Unlock()
	gc.files[hash] = file
}

// GetOrPut retrieves a cached file or executes the create function to create and cache it
func (gc *GlobalCache) GetOrPut(content []byte, create func() *CachedFile) *CachedFile {
	hash := gc.CalculateHash(content)

	if cached := gc.Get(hash); cached != nil {
		return cached
	}

	// Create new entry
	newItem := create()
	if newItem != nil {
		newItem.ContentHash = hash
		gc.Put(hash, newItem)
	}

	return newItem
}

// CachedInterface represents a cached interface definition
type CachedInterface struct {
	Name string
	Type *types.Type
	Node *ast.InterfaceDeclaration
}

// CachedGlobal represents a cached global variable/function
type CachedGlobal struct {
	Name        string
	IsNamespace bool
	IsFunction  bool
	Type        *types.Type // Optional, might be Any
}

// ExtendedCachedFile extends CachedFile to support specific extraction results
type ExtendedCachedFile struct {
	CachedFile
	ExtractedInterfaces []CachedInterface
	ExtractedGlobals    []CachedGlobal
}

// GlobalExtractionCache manages cache for specific extraction tasks (interfaces, globals)
type GlobalExtractionCache struct {
	mu    sync.RWMutex
	items map[string]*ExtendedCachedFile
}

var SharedExtractionCache = NewGlobalExtractionCache()

func NewGlobalExtractionCache() *GlobalExtractionCache {
	return &GlobalExtractionCache{
		items: make(map[string]*ExtendedCachedFile),
	}
}

func (gec *GlobalExtractionCache) Get(hash string) *ExtendedCachedFile {
	gec.mu.RLock()
	defer gec.mu.RUnlock()
	return gec.items[hash]
}

func (gec *GlobalExtractionCache) Put(hash string, item *ExtendedCachedFile) {
	gec.mu.Lock()
	defer gec.mu.Unlock()
	gec.items[hash] = item
}
