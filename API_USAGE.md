# API Usage Guide - Code Input Feature

This guide explains how to use the TypeScript type checker with code passed as text input, making it easy to integrate into your compiler or toolchain.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Command Line Interface](#command-line-interface)
- [Integration Examples](#integration-examples)
- [Output Formats](#output-formats)
- [Advanced Use Cases](#advanced-use-cases)

## Overview

The `--code` flag allows you to pass TypeScript code directly as a string instead of reading from a file. This is useful for:

- **Compiler Integration**: Validate generated TypeScript code
- **IDE/Editor Plugins**: Check code as users type
- **Build Tools**: Validate code snippets in documentation or tests
- **CI/CD Pipelines**: Automated validation of generated code
- **Template Systems**: Verify TypeScript templates before rendering

## Basic Usage

### Simple Code Check

```bash
# Check valid code
tscheck check --code "const x: number = 5;"

# Check with custom filename for error reporting
tscheck check --code "const x: number = 5;" --filename "mycode.ts"

# Short flags
tscheck check -c "const x: number = 5;" -n "mycode.ts"
```

### Multi-line Code

```bash
# Using heredoc
tscheck check --code "
interface User {
    name: string;
    age: number;
}

const user: User = {
    name: 'Alice',
    age: 30
};
"

# Or with a variable
CODE='
type Point = { x: number; y: number; };
const p: Point = { x: 10, y: 20 };
'
tscheck check --code "$CODE" --filename "point.ts"
```

## Command Line Interface

### Available Flags

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--code` | `-c` | string | - | TypeScript code as text input (required if no path given) |
| `--filename` | `-n` | string | `"stdin.ts"` | Filename to use for error reporting |
| `--format` | `-f` | string | `"text"` | Output format: `text`, `json`, `toon` |
| `--ast` | `-a` | bool | `false` | Show Abstract Syntax Tree output |

### Usage Patterns

```bash
# Using path argument (original functionality)
tscheck check myfile.ts
tscheck check ./src

# Using code input (new functionality)
tscheck check --code "const x = 5;"

# Cannot use both at the same time
tscheck check myfile.ts --code "const x = 5;"  # Error
```

## Integration Examples

### From Go

```go
package main

import (
    "fmt"
    "os/exec"
)

// CheckTypeScriptCode validates TypeScript code
func CheckTypeScriptCode(code, filename string) (bool, string, error) {
    cmd := exec.Command("tscheck", "check", 
        "--code", code, 
        "--filename", filename,
        "--format", "json")
    
    output, err := cmd.CombinedOutput()
    
    if err != nil {
        // Type errors found
        return false, string(output), nil
    }
    
    return true, string(output), nil
}

func main() {
    code := `
        const x: number = 5;
        const y: string = x; // Type error
    `
    
    success, output, err := CheckTypeScriptCode(code, "generated.ts")
    if err != nil {
        panic(err)
    }
    
    if !success {
        fmt.Println("Type errors found:")
        fmt.Println(output)
    } else {
        fmt.Println("Code is valid!")
    }
}
```

### From Python

```python
import subprocess
import json

def check_typescript(code, filename="script.ts"):
    """Check TypeScript code and return results as dict"""
    try:
        result = subprocess.run(
            ["tscheck", "check", 
             "--code", code, 
             "--filename", filename,
             "--format", "json"],
            capture_output=True,
            text=True,
            check=True
        )
        return {"success": True, "errors": []}
    except subprocess.CalledProcessError as e:
        errors = json.loads(e.stdout)
        return {"success": False, "errors": errors}

# Example usage
code = """
const x: number = 5;
const y: string = x;
"""

result = check_typescript(code)
if not result["success"]:
    for error in result["errors"]:
        print(f"Line {error['line']}: {error['message']}")
```

### From Node.js/JavaScript

```javascript
const { execSync } = require('child_process');

function checkTypeScript(code, filename = 'script.ts') {
    try {
        const command = `tscheck check --code ${JSON.stringify(code)} --filename "${filename}" --format json`;
        const output = execSync(command, { encoding: 'utf-8' });
        return { success: true, output };
    } catch (error) {
        const errors = JSON.parse(error.stdout);
        return { success: false, errors };
    }
}

// Example
const code = `
const x: number = 5;
const y: string = x;
`;

const result = checkTypeScript(code);
if (!result.success) {
    result.errors.forEach(err => {
        console.log(`${err.file}:${err.line}:${err.column} - ${err.message}`);
    });
}
```

### From Shell Script

```bash
#!/bin/bash

# Function to check TypeScript code
check_ts_code() {
    local code="$1"
    local filename="${2:-stdin.ts}"
    
    tscheck check --code "$code" --filename "$filename" --format json
    return $?
}

# Example usage
CODE='
interface Config {
    host: string;
    port: number;
}

const config: Config = {
    host: "localhost",
    port: 8080
};
'

if check_ts_code "$CODE" "config.ts"; then
    echo "✓ Code is valid"
else
    echo "✗ Type errors found"
    exit 1
fi
```

### From Rust

```rust
use std::process::Command;
use serde_json::Value;

fn check_typescript(code: &str, filename: &str) -> Result<bool, String> {
    let output = Command::new("tscheck")
        .arg("check")
        .arg("--code")
        .arg(code)
        .arg("--filename")
        .arg(filename)
        .arg("--format")
        .arg("json")
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(true)
    } else {
        let errors: Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| e.to_string())?;
        println!("Type errors: {}", errors);
        Ok(false)
    }
}

fn main() {
    let code = r#"
        const x: number = 5;
        const y: string = x;
    "#;
    
    match check_typescript(code, "test.ts") {
        Ok(true) => println!("Valid TypeScript"),
        Ok(false) => println!("Type errors found"),
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

## Output Formats

### Text Format (Default)

Human-readable output with colors and context:

```bash
tscheck check --code "let x = unknownVar;" --format text
```

Output:
```
  × Cannot find name 'unknownVar'.
  Sugerencia: Verifica que la variable esté declarada antes de usarla
   ╭─[stdin.ts:1:9]
   1 │ let x = unknownVar;
             ^ [TS2304]
   ╰────

Found 1 error(s).
```

### JSON Format

Machine-readable output for programmatic processing:

```bash
tscheck check --code "let x = unknownVar;" --format json
```

Output:
```json
[
  {
    "file": "stdin.ts",
    "line": 1,
    "column": 9,
    "message": "Cannot find name 'unknownVar'.\n  Sugerencia: Verifica que la variable esté declarada antes de usarla",
    "code": "TS2304",
    "severity": "error"
  }
]
```

### TOON Format

Custom structured format:

```bash
tscheck check --code "let x = unknownVar;" --format toon
```

Output:
```
errors[1]{file,line,column,message,code,severity}:
  stdin.ts,1,9,"Cannot find name 'unknownVar'.",TS2304,error
```

### AST Output

View the Abstract Syntax Tree:

```bash
tscheck check --code "const x: number = 42;" --ast
```

## Advanced Use Cases

### 1. Validating Generated Code

```go
// In your compiler
func validateGeneratedTS(generatedCode string) error {
    cmd := exec.Command("tscheck", "check", 
        "--code", generatedCode,
        "--filename", "generated.ts")
    
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("generated code has type errors: %w", err)
    }
    
    return nil
}
```

### 2. IDE Integration

```python
class TypeScriptLinter:
    def lint_buffer(self, buffer_content, filename):
        """Lint the current editor buffer"""
        result = subprocess.run(
            ["tscheck", "check",
             "--code", buffer_content,
             "--filename", filename,
             "--format", "json"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            errors = json.loads(result.stdout)
            return [self.format_diagnostic(e) for e in errors]
        
        return []
```

### 3. Documentation Validation

```bash
#!/bin/bash
# Extract and validate TypeScript code blocks from Markdown

extract_ts_blocks() {
    awk '/```typescript/,/```/' "$1" | grep -v '```'
}

validate_docs() {
    local file="$1"
    local blocks=$(extract_ts_blocks "$file")
    
    echo "$blocks" | tscheck check --code "$(cat)" --filename "$file"
}

# Check all markdown files
for file in docs/*.md; do
    echo "Checking $file..."
    validate_docs "$file"
done
```

### 4. Template Validation

```go
// Validate TypeScript templates
type TypeScriptTemplate struct {
    template *template.Template
}

func (t *TypeScriptTemplate) ValidateWithData(data interface{}) error {
    var buf bytes.Buffer
    if err := t.template.Execute(&buf, data); err != nil {
        return err
    }
    
    rendered := buf.String()
    
    cmd := exec.Command("tscheck", "check",
        "--code", rendered,
        "--filename", "template.ts")
    
    return cmd.Run()
}
```

### 5. CI/CD Integration

```yaml
# GitHub Actions example
name: Validate Generated TypeScript

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install tscheck
        run: |
          cd typecheker
          go build -o tscheck
          sudo mv tscheck /usr/local/bin/
      
      - name: Generate TypeScript
        run: ./your-generator > generated.ts
      
      - name: Validate TypeScript
        run: |
          CODE=$(cat generated.ts)
          tscheck check --code "$CODE" --filename "generated.ts"
```

### 6. Complex Types and Infer

```bash
# Validate advanced TypeScript features
tscheck check --code "
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

type Func = () => string;
type Return = ReturnType<Func>;
" --filename "advanced.ts"
```

## Best Practices

### 1. Always Specify Filename

```bash
# Good - Clear error reporting
tscheck check --code "$CODE" --filename "user_service.ts"

# Okay - Uses default "stdin.ts"
tscheck check --code "$CODE"
```

### 2. Use JSON Format for Programmatic Processing

```bash
# For scripts and automation
tscheck check --code "$CODE" --format json | jq '.[] | .message'
```

### 3. Handle Exit Codes

```bash
if tscheck check --code "$CODE" --filename "test.ts"; then
    echo "Success"
else
    echo "Type errors found"
    exit 1
fi
```

### 4. Escape Special Characters

```bash
# Use single quotes or proper escaping
CODE='const str = "Hello \"World\"";'
tscheck check --code "$CODE"

# Or use heredoc
tscheck check --code "$(cat <<'EOF'
const str = "Hello \"World\"";
EOF
)"
```

### 5. Respect tsconfig.json

The checker automatically uses `tsconfig.json` from the current directory:

```bash
# Will use ./tsconfig.json if it exists
cd my-project
tscheck check --code "$CODE"
```

## Troubleshooting

### Code Not Found

```bash
# Wrong: Path is required when --code is not used
tscheck check

# Right: Use --code flag
tscheck check --code "const x = 5;"
```

### Special Characters

```bash
# Wrong: Unescaped quotes
tscheck check --code "const x = "hello";"

# Right: Escaped or using single quotes
tscheck check --code 'const x = "hello";'
tscheck check --code "const x = \"hello\";"
```

### Line Endings

The checker handles both Unix (`\n`) and Windows (`\r\n`) line endings automatically.

### Large Code Blocks

For very large code blocks, consider using files:

```bash
# If code is too large for command line
echo "$LARGE_CODE" > temp.ts
tscheck check temp.ts
rm temp.ts
```

## API Reference

### Exit Codes

- `0`: Success, no type errors
- `1`: Type errors found or invalid arguments

### Error Messages

All errors include:
- File name (from `--filename`)
- Line and column numbers
- Error message with suggestions
- Error code (e.g., `TS2304`)

## Examples Repository

See the `examples/` directory for more examples:

- `code_input_example.go` - Complete Go integration
- `check_code.sh` - Shell script examples
- `README.md` - Detailed examples and use cases

## Support

For issues or questions:
- Check the main README.md
- Review examples in `examples/`
- File an issue on the project repository