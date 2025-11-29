package symbols

// SymbolTablePool manages a pool of reusable symbol tables
// This reduces allocation overhead when checking multiple files
type SymbolTablePool struct {
	pool chan *SymbolTable
	size int
}

// NewSymbolTablePool creates a new symbol table pool
func NewSymbolTablePool(size int) *SymbolTablePool {
	if size <= 0 {
		size = 10 // Default pool size
	}

	return &SymbolTablePool{
		pool: make(chan *SymbolTable, size),
		size: size,
	}
}

// Get retrieves a symbol table from the pool or creates a new one
func (p *SymbolTablePool) Get() *SymbolTable {
	select {
	case st := <-p.pool:
		// Reset the symbol table for reuse
		st.Reset()
		return st
	default:
		// Pool is empty, create a new one
		return NewSymbolTable()
	}
}

// Put returns a symbol table to the pool for reuse
func (p *SymbolTablePool) Put(st *SymbolTable) {
	if st == nil {
		return
	}

	// Try to return to pool, but don't block if full
	select {
	case p.pool <- st:
		// Successfully returned to pool
	default:
		// Pool is full, let it be garbage collected
	}
}

// Reset clears a symbol table for reuse
func (st *SymbolTable) Reset() {
	// Clear all scopes except global
	st.Current = st.Global

	// Clear global scope symbols using Go 1.21 clear() for efficiency
	// This reuses the map memory instead of reallocating
	clear(st.Global.Symbols)

	// Reuse children slice capacity
	st.Global.Children = st.Global.Children[:0]
	st.Global.Level = 0

	// Clear errors
	st.Errors = nil
}
