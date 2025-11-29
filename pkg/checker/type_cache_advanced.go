package checker

import (
	"crypto/sha256"
	"fmt"
	"sync"

	"tstypechecker/pkg/types"
)

// TypeExpressionCache caches computed type expressions to avoid redundant calculations
type TypeExpressionCache struct {
	mu         sync.RWMutex
	unions     map[string]*types.Type // Cache for union types
	picks      map[string]*types.Type // Cache for Pick<T, K> results
	omits      map[string]*types.Type // Cache for Omit<T, K> results
	partials   map[string]*types.Type // Cache for Partial<T> results
	assignable map[string]bool        // Cache for isAssignableTo results
	typeHashes map[*types.Type]string // Cache for type hashes
}

// NewTypeExpressionCache creates a new type expression cache
func NewTypeExpressionCache() *TypeExpressionCache {
	return &TypeExpressionCache{
		unions:     make(map[string]*types.Type),
		picks:      make(map[string]*types.Type),
		omits:      make(map[string]*types.Type),
		partials:   make(map[string]*types.Type),
		assignable: make(map[string]bool),
		typeHashes: make(map[*types.Type]string),
	}
}

// GetUnion retrieves a cached union type or returns nil
func (tec *TypeExpressionCache) GetUnion(key string) *types.Type {
	tec.mu.RLock()
	defer tec.mu.RUnlock()
	return tec.unions[key]
}

// SetUnion caches a union type result
func (tec *TypeExpressionCache) SetUnion(key string, result *types.Type) {
	tec.mu.Lock()
	defer tec.mu.Unlock()
	tec.unions[key] = result
}

// GetAssignable retrieves a cached assignability result
func (tec *TypeExpressionCache) GetAssignable(sourceHash, targetHash string) (bool, bool) {
	tec.mu.RLock()
	defer tec.mu.RUnlock()
	key := sourceHash + ":" + targetHash
	result, exists := tec.assignable[key]
	return result, exists
}

// SetAssignable caches an assignability result
func (tec *TypeExpressionCache) SetAssignable(sourceHash, targetHash string, result bool) {
	tec.mu.Lock()
	defer tec.mu.Unlock()
	key := sourceHash + ":" + targetHash
	tec.assignable[key] = result
}

// GetTypeHash computes or retrieves a hash for a type
func (tec *TypeExpressionCache) GetTypeHash(t *types.Type) string {
	if t == nil {
		return "nil"
	}

	// Check cache first
	tec.mu.RLock()
	if hash, exists := tec.typeHashes[t]; exists {
		tec.mu.RUnlock()
		return hash
	}
	tec.mu.RUnlock()

	// Compute hash
	hash := computeTypeHash(t)

	// Cache it
	tec.mu.Lock()
	tec.typeHashes[t] = hash
	tec.mu.Unlock()

	return hash
}

// computeTypeHash computes a hash for a type based on its structure
func computeTypeHash(t *types.Type) string {
	if t == nil {
		return "nil"
	}

	h := sha256.New()

	// Include kind
	h.Write([]byte(fmt.Sprintf("kind:%d", t.Kind)))

	// Include name
	if t.Name != "" {
		h.Write([]byte(fmt.Sprintf("name:%s", t.Name)))
	}

	// For union/intersection, include parts
	if t.Kind == types.UnionType || t.Kind == types.IntersectionType {
		for _, part := range t.Parts {
			h.Write([]byte(computeTypeHash(part)))
		}
	}

	// For arrays, include element type
	if t.Kind == types.ArrayType && t.ElementType != nil {
		h.Write([]byte(computeTypeHash(t.ElementType)))
	}

	// For objects, include property names (not values to avoid infinite recursion)
	if t.Kind == types.ObjectType {
		for propName := range t.Properties {
			h.Write([]byte(fmt.Sprintf("prop:%s", propName)))
		}
	}

	return fmt.Sprintf("%x", h.Sum(nil))[:16]
}

// Clear clears all caches (useful for testing or memory management)
func (tec *TypeExpressionCache) Clear() {
	tec.mu.Lock()
	defer tec.mu.Unlock()
	tec.unions = make(map[string]*types.Type)
	tec.picks = make(map[string]*types.Type)
	tec.omits = make(map[string]*types.Type)
	tec.partials = make(map[string]*types.Type)
	tec.assignable = make(map[string]bool)
	tec.typeHashes = make(map[*types.Type]string)
}

// Stats returns cache statistics
func (tec *TypeExpressionCache) Stats() map[string]int {
	tec.mu.RLock()
	defer tec.mu.RUnlock()
	return map[string]int{
		"unions":     len(tec.unions),
		"picks":      len(tec.picks),
		"omits":      len(tec.omits),
		"partials":   len(tec.partials),
		"assignable": len(tec.assignable),
		"typeHashes": len(tec.typeHashes),
	}
}
