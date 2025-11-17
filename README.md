# TypeScript Type Checker in Go

A TypeScript type checker written in Go that provides basic type checking capabilities with incremental analysis support.

## Features

### Phase 1: Basic (✅ COMPLETED)
- **Basic Type Checking**: Detects undefined variables, function arity mismatches, and basic syntax errors
- **Symbol Table**: Maintains a comprehensive symbol table with scope management
- **AST Parsing**: Parses TypeScript files and builds an Abstract Syntax Tree
  - Functions, variables, if statements, binary expressions
  - Template strings with interpolation `${}`
  - Array literals `[1, 2, 3]`
  - Import/export statements
- **Module Resolution**: ES6/TypeScript module resolution with import/export support
  - Automatic .js → .ts resolution
  - Named imports/exports
  - Module caching
- **Import/Export Analysis**: Correctly resolves and validates imports and exports between modules
- **Multiple Output Formats**: Supports text, JSON, and TOON output formats
- **Modular Architecture**: Clean separation between parsing, symbol binding, module resolution, and type checking

### Phase 2: Intermediate (🔄 IN PROGRESS)
- **Type System**: Basic type system with primitives (string, number, boolean, any, unknown, void, never)
- **Global Objects**: Built-in support for JavaScript/TypeScript globals
  - console (log, error, warn, info, debug, etc.)
  - Math (PI, E, abs, ceil, floor, round, max, min, pow, sqrt, random, sin, cos, tan)
  - Array (isArray, from, of)
  - JSON (parse, stringify)
  - Object (toString, valueOf, hasOwnProperty)
  - Global functions (parseInt, parseFloat, isNaN, isFinite, setTimeout, setInterval)
- **Array Support**: Array literal parsing and type checking

## Installation

```bash
go mod tidy
go build -o tscheck
```

## Usage

### Basic Type Checking

Check a single TypeScript file:
```bash
./tscheck check examples/simple.ts
```

Check a directory recursively:
```bash
./tscheck check ./src
```

### Output Formats

Text format (default):
```bash
./tscheck check examples/simple.ts
```

JSON format:
```bash
./tscheck check -f json examples/simple.ts
```

TOON format (custom format):
```bash
./tscheck check -f toon examples/simple.ts
```

### AST Output

Show AST in JSON format:
```bash
./tscheck ast examples/simple.ts
```

Show AST in TOON format:
```bash
./tscheck ast -f toon examples/simple.ts
```

## Architecture

### Components

1. **Parser** (`pkg/parser/`): Converts TypeScript source code to AST
2. **Symbol Table** (`pkg/symbols/`): Manages symbols and scopes
3. **Type Checker** (`pkg/checker/`): Coordinates type checking operations
4. **AST** (`pkg/ast/`): Defines AST node types

### Error Codes

The type checker uses TypeScript-compatible error codes:

- `TS2304`: Cannot find name 'X'
- `TS2554`: Expected X arguments, but got Y
- `TS2349`: 'X' is not a function
- `TS2451`: 'X' is already defined
- `TS1003`: Invalid identifier

## Examples

### Valid TypeScript

```typescript
function greet(name: string) {
    return "Hello, " + name;
}

let message = greet("World");
```

### Errors Detected

```typescript
let x = undefinedFunction(); // TS2304: Cannot find name 'undefinedFunction'
let y = greet(); // TS2554: Expected 1 arguments, but got 0
let z = message(); // TS2349: 'message' is not a function
```

## Development

### Project Structure

```
tstypechecker/
├── cmd/                    # CLI commands
│   ├── root.go            # Root command
│   ├── check.go           # Check command
│   └── ast.go             # AST command
├── pkg/                    # Core packages
│   ├── ast/               # AST definitions
│   ├── parser/            # Parser implementation
│   ├── symbols/           # Symbol table
│   └── checker/           # Type checker
├── examples/              # Example TypeScript files
├── test.ts               # Test file with errors
├── main.go               # Entry point
└── go.mod                # Go module file
```

### Running Tests

```bash
go test ./...
```

### Future Enhancements

- [ ] Integration with existing parsers (oxc, swc)
- [ ] Advanced type inference
- [ ] Generic type support
- [ ] Module resolution
- [ ] LSP server implementation
- [ ] Incremental compilation
- [ ] Performance optimizations

## Contributing

This is a learning project following the roadmap specified in `instructions.toon`. Contributions are welcome for educational purposes.

## License

MIT License - See LICENSE file for details.
