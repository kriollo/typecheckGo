package parser

import (
	"fmt"
	"io/ioutil"
	"strings"
	"unicode"

	"tstypechecker/pkg/ast"
)

// ParseFile parses a TypeScript file and returns our AST representation
func ParseFile(filename string) (*ast.File, error) {
	// Read file content
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", filename, err)
	}

	// For now, we'll use a simple recursive descent parser
	// In a real implementation, you would integrate with oxc or swc parser
	return parseTypeScript(string(content), filename)
}

// ParseCode parses TypeScript code from a string and returns our AST representation
func ParseCode(code, filename string) (*ast.File, error) {
	// Parse the code directly without reading from file
	return parseTypeScript(code, filename)
}

// Simple TypeScript parser implementation
func parseTypeScript(source, filename string) (*ast.File, error) {
	p := &parser{
		source:   source,
		filename: filename,
		pos:      0,
		line:     1,
		column:   1,
	}

	return p.parseFile()
}

const (
	// Límites de seguridad para prevenir loops infinitos
	maxParserIterations = 100000
	maxNestedDepth      = 1000
)

type parser struct {
	source   string
	filename string
	pos      int
	line     int
	column   int
}

func (p *parser) parseFile() (*ast.File, error) {
	startPos := p.currentPos()

	var statements []ast.Statement

	p.skipWhitespaceAndComments()

	lastPos := p.pos
	stuckCount := 0

	for !p.isAtEnd() {
		// DEBUGGING: Detect infinite loops
		if p.pos == lastPos {
			stuckCount++
			if stuckCount > 3 {
				return nil, fmt.Errorf("parser stuck at line %d, col %d, char: '%c' (pos %d)", p.line, p.column, p.source[p.pos], p.pos)
			}
		} else {
			stuckCount = 0
		}
		lastPos = p.pos

		stmt, err := p.parseStatement()
		if err != nil {
			return nil, err
		}
		if stmt != nil {
			statements = append(statements, stmt)
		}
		p.skipWhitespaceAndComments()
	}

	endPos := p.currentPos()

	return &ast.File{
		Name:     p.filename,
		Source:   p.source,
		Body:     statements,
		Position: startPos,
		EndPos:   endPos,
	}, nil
}

func (p *parser) parseStatement() (ast.Statement, error) {
	p.skipWhitespaceAndComments()

	if p.isAtEnd() {
		return nil, nil
	}

	// Prevent infinite loops by tracking position
	currentPos := p.pos

	// Handle async function declarations
	if p.matchKeyword("async") {
		savedPos := p.pos
		p.advanceWord()
		p.skipWhitespaceAndComments()

		if p.matchKeyword("function") {
			funcDecl, err := p.parseFunctionDeclarationInternal()
			if err != nil {
				return nil, err
			}
			funcDecl.Async = true
			return funcDecl, nil
		}

		// Not an async function, restore position
		p.pos = savedPos
	}

	if p.matchKeyword("function") {
		return p.parseFunctionDeclaration()
	}

	if p.matchKeyword("var", "let", "const") {
		return p.parseVariableDeclaration()
	}

	if p.matchKeyword("return") {
		return p.parseReturnStatement()
	}

	if p.matchKeyword("if") {
		return p.parseIfStatement()
	}

	if p.matchKeyword("for") {
		return p.parseForStatement()
	}

	if p.matchKeyword("while") {
		return p.parseWhileStatement()
	}

	if p.matchKeyword("switch") {
		return p.parseSwitchStatement()
	}

	if p.matchKeyword("try") {
		return p.parseTryStatement()
	}

	if p.matchKeyword("throw") {
		return p.parseThrowStatement()
	}

	if p.matchKeyword("break") {
		return p.parseBreakStatement()
	}

	if p.matchKeyword("continue") {
		return p.parseContinueStatement()
	}

	if p.matchKeyword("import") {
		return p.parseImportDeclaration()
	}

	if p.matchKeyword("export") {
		return p.parseExportDeclaration()
	}

	// Declare keyword (for .d.ts files)
	if p.matchKeyword("declare") {
		return p.parseDeclareStatement()
	}

	// Type declarations
	if p.matchKeyword("type") {
		return p.parseTypeAliasDeclaration()
	}

	if p.matchKeyword("interface") {
		return p.parseInterfaceDeclaration()
	}

	// Class declaration
	if p.matchKeyword("class") {
		return p.parseClassDeclaration()
	}

	// Enum declaration
	if p.matchKeyword("enum") {
		return p.parseEnumDeclaration()
	}

	// Handle block statements
	if p.match("{") {
		return p.parseBlockStatement()
	}

	// Try expression statement
	expr, err := p.parseExpression()
	if err != nil {
		return nil, err
	}

	if expr != nil {
		// Optional semicolon for expression statements
		p.skipWhitespaceAndComments()
		if p.match(";") {
			p.advance()
		}
		return &ast.ExpressionStatement{
			Expression: expr,
			Position:   expr.Pos(),
			EndPos:     p.currentPos(),
		}, nil
	}

	// CRITICAL: Prevent infinite loop - if we haven't advanced, skip one character
	if p.pos == currentPos {
		p.advance()
		return nil, fmt.Errorf("unexpected token at %s, skipping character '%c'", p.currentPos(), p.source[p.pos-1])
	}

	return nil, fmt.Errorf("unexpected token at %s", p.currentPos())
}

func (p *parser) parseFunctionDeclaration() (*ast.FunctionDeclaration, error) {
	return p.parseFunctionDeclarationInternal()
}

func (p *parser) parseFunctionDeclarationInternal() (*ast.FunctionDeclaration, error) {
	startPos := p.currentPos()

	p.consumeKeyword("function")
	p.skipWhitespaceAndComments()

	isGenerator := false
	if p.match("*") {
		p.advance()
		p.skipWhitespaceAndComments()
		isGenerator = true
	}

	name, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Handle generic type parameters: function name<T, U>(...)
	if p.match("<") {
		p.advance()
		depth := 1
		for depth > 0 && !p.isAtEnd() {
			if p.match("<") {
				depth++
			} else if p.match(">") {
				depth--
			}
			p.advance()
		}
		p.skipWhitespaceAndComments()
	}

	p.expect("(")

	params, err := p.parseParameterList()
	if err != nil {
		return nil, err
	}

	p.expect(")")
	p.skipWhitespaceAndComments()

	// Handle return type annotation (: Type)
	if p.match(":") {
		p.advance() // consume ':'
		p.skipWhitespaceAndComments()

		// Parse return type (simplified - just skip until we find '{')
		// In a full implementation, we would parse the type properly
		for !p.isAtEnd() && !p.match("{") {
			p.advance()
		}
		p.skipWhitespaceAndComments()
	}

	body, err := p.parseBlockStatement()
	if err != nil {
		return nil, err
	}

	return &ast.FunctionDeclaration{
		ID:        name,
		Params:    params,
		Body:      body,
		Async:     false,
		Generator: isGenerator,
		Position:  startPos,
		EndPos:    p.currentPos(),
	}, nil
}

// parseFunctionExpression parses a function expression: function() {} or function name() {}
func (p *parser) parseFunctionExpression() (*ast.FunctionExpression, error) {
	startPos := p.currentPos()

	p.consumeKeyword("function")
	p.skipWhitespaceAndComments()

	// Name is optional for function expressions
	var name *ast.Identifier
	if p.matchIdentifier() {
		var err error
		name, err = p.parseIdentifier()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()
	}

	p.expect("(")

	params, err := p.parseParameterList()
	if err != nil {
		return nil, err
	}

	p.expect(")")
	p.skipWhitespaceAndComments()

	// Handle return type annotation (: Type)
	if p.match(":") {
		p.advance() // consume ':'
		p.skipWhitespaceAndComments()

		// Parse return type (simplified - just skip until we find '{')
		// In a full implementation, we would parse the type properly
		for !p.isAtEnd() && !p.match("{") {
			p.advance()
		}
		p.skipWhitespaceAndComments()
	}

	body, err := p.parseBlockStatement()
	if err != nil {
		return nil, err
	}

	return &ast.FunctionExpression{
		ID:        name,
		Params:    params,
		Body:      body,
		Async:     false,
		Generator: false,
		Position:  startPos,
		EndPos:    p.currentPos(),
	}, nil
}

// parseAsyncFunctionExpression parses an async function expression: async function() {} or async function name() {}
func (p *parser) parseAsyncFunctionExpression() (*ast.FunctionExpression, error) {
	startPos := p.currentPos()

	p.consumeKeyword("function")
	p.skipWhitespaceAndComments()

	// Name is optional for function expressions
	var name *ast.Identifier
	if p.matchIdentifier() {
		var err error
		name, err = p.parseIdentifier()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()
	}

	p.expect("(")

	params, err := p.parseParameterList()
	if err != nil {
		return nil, err
	}

	p.expect(")")
	p.skipWhitespaceAndComments()

	// Handle return type annotation (: Type)
	if p.match(":") {
		p.advance() // consume ':'
		p.skipWhitespaceAndComments()

		// Parse return type (simplified - just skip until we find '{')
		// In a full implementation, we would parse the type properly
		for !p.isAtEnd() && !p.match("{") {
			p.advance()
		}
		p.skipWhitespaceAndComments()
	}

	body, err := p.parseBlockStatement()
	if err != nil {
		return nil, err
	}

	return &ast.FunctionExpression{
		ID:        name,
		Params:    params,
		Body:      body,
		Async:     true, // This is an async function
		Generator: false,
		Position:  startPos,
		EndPos:    p.currentPos(),
	}, nil
}

func (p *parser) parseVariableDeclaration() (*ast.VariableDeclaration, error) {
	startPos := p.currentPos()

	kind, err := p.consumeKeyword("var", "let", "const")
	if err != nil {
		return nil, err
	}
	p.skipWhitespaceAndComments()

	var declarators []*ast.VariableDeclarator

	for {
		// Check for destructuring pattern
		if p.match("{") || p.match("[") {
			// Parse destructuring patterns and extract variable names
			patternStart := p.currentPos()
			openChar := p.source[p.pos]
			closeChar := byte('}')
			isObjectPattern := openChar == '{'
			if openChar == '[' {
				closeChar = ']'
			}

			p.advance() // consume opening { or [
			p.skipWhitespaceAndComments()

			// Extract variable names from the destructuring pattern
			var extractedNames []string
			depth := 1
			currentName := ""

			for depth > 0 && !p.isAtEnd() {
				ch := p.source[p.pos]

				if ch == openChar {
					depth++
					p.advance()
				} else if ch == closeChar {
					depth--
					if depth == 0 {
						// Add current name if exists
						if currentName != "" {
							extractedNames = append(extractedNames, strings.TrimSpace(currentName))
							currentName = ""
						}
					}
					p.advance()
				} else if ch == ',' && depth == 1 {
					// End of one binding
					if currentName != "" {
						extractedNames = append(extractedNames, strings.TrimSpace(currentName))
						currentName = ""
					}
					p.advance()
					p.skipWhitespaceAndComments()
				} else if ch == ':' && isObjectPattern && depth == 1 {
					// In object pattern, skip the rename part (e.g., {oldName: newName})
					// We want to capture 'newName', not 'oldName'
					currentName = ""
					p.advance()
					p.skipWhitespaceAndComments()
				} else if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_' || ch == '$' ||
					(currentName != "" && ch >= '0' && ch <= '9') {
					currentName += string(ch)
					p.advance()
				} else if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
					p.skipWhitespaceAndComments()
				} else {
					// Other characters (like =, ..., etc.), skip
					p.advance()
				}
			}

			var typeAnnotation ast.TypeNode
			var init ast.Expression
			p.skipWhitespaceAndComments()

			// Parse type annotation if present (: Type)
			if p.match(":") {
				p.advance()
				p.skipWhitespaceAndComments()
				var err error
				typeAnnotation, err = p.parseTypeAnnotation()
				if err != nil {
					return nil, err
				}
				p.skipWhitespaceAndComments()
			}

			if p.match("=") {
				p.advance()
				p.skipWhitespaceAndComments()
				var err error
				init, err = p.parseExpression()
				if err != nil {
					return nil, err
				}
			}

			// Create a declarator for each extracted name
			if len(extractedNames) > 0 {
				for _, name := range extractedNames {
					if name != "" {
						id := &ast.Identifier{
							Name:     name,
							Position: patternStart,
							EndPos:   p.currentPos(),
						}
						declarators = append(declarators, &ast.VariableDeclarator{
							ID:             id,
							TypeAnnotation: typeAnnotation,
							Init:           init,
							Position:       id.Pos(),
							EndPos:         p.currentPos(),
						})
					}
				}
			} else {
				// Fallback: create placeholder if no names were extracted
				id := &ast.Identifier{
					Name:     "destructured_binding",
					Position: patternStart,
					EndPos:   p.currentPos(),
				}
				declarators = append(declarators, &ast.VariableDeclarator{
					ID:             id,
					TypeAnnotation: typeAnnotation,
					Init:           init,
					Position:       id.Pos(),
					EndPos:         p.currentPos(),
				})
			}

			p.skipWhitespaceAndComments()
			if !p.match(",") {
				break
			}
			p.advance()
			p.skipWhitespaceAndComments()
			continue
		}

		// Regular identifier pattern
		id, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		var typeAnnotation ast.TypeNode
		var init ast.Expression
		p.skipWhitespaceAndComments()

		// Parse type annotation if present (: Type)
		if p.match(":") {
			p.advance()
			p.skipWhitespaceAndComments()
			typeAnnotation, err = p.parseTypeAnnotation()
			if err != nil {
				return nil, err
			}
			p.skipWhitespaceAndComments()
		}

		if p.match("=") {
			p.advance()
			p.skipWhitespaceAndComments()
			init, err = p.parseExpression()
			if err != nil {
				return nil, err
			}
		}

		declarators = append(declarators, &ast.VariableDeclarator{
			ID:             id,
			TypeAnnotation: typeAnnotation,
			Init:           init,
			Position:       id.Pos(),
			EndPos:         p.currentPos(),
		})

		p.skipWhitespaceAndComments()
		if !p.match(",") {
			break
		}
		p.advance()
		p.skipWhitespaceAndComments()
	}

	// Optional semicolon
	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.VariableDeclaration{
		Kind:     kind,
		Decls:    declarators,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseReturnStatement() (*ast.ReturnStatement, error) {
	startPos := p.currentPos()

	p.consumeKeyword("return")
	p.skipWhitespaceAndComments()

	var arg ast.Expression
	if !p.isAtEnd() && !p.match(";") && !p.match("}") {
		var err error
		arg, err = p.parseExpression()
		if err != nil {
			return nil, err
		}
	}

	// Optional semicolon
	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.ReturnStatement{
		Argument: arg,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseIfStatement() (*ast.IfStatement, error) {
	startPos := p.currentPos()

	p.consumeKeyword("if")
	p.skipWhitespaceAndComments()

	p.expect("(")
	p.skipWhitespaceAndComments()

	// Parse the condition
	test, err := p.parseExpression()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()
	p.expect(")")
	p.skipWhitespaceAndComments()

	// Parse the consequent (then branch)
	consequent, err := p.parseStatement()
	if err != nil {
		return nil, err
	}

	if consequent == nil {
		return nil, fmt.Errorf("expected statement after 'if' condition")
	}

	p.skipWhitespaceAndComments()

	// Parse the alternate (else branch), if present
	var alternate ast.Statement
	if p.matchKeyword("else") {
		p.consumeKeyword("else") // consume 'else' keyword
		p.skipWhitespaceAndComments()

		alternate, err = p.parseStatement()
		if err != nil {
			return nil, err
		}

		if alternate == nil {
			return nil, fmt.Errorf("expected statement after 'else'")
		}
	}

	return &ast.IfStatement{
		Test:       test,
		Consequent: consequent,
		Alternate:  alternate,
		Position:   startPos,
		EndPos:     p.currentPos(),
	}, nil
}

func (p *parser) parseForStatement() (*ast.ForStatement, error) {
	startPos := p.currentPos()

	p.consumeKeyword("for")
	p.skipWhitespaceAndComments()

	p.expect("(")
	p.skipWhitespaceAndComments()

	// Simple approach: Skip the entire for header for for-in/for-of loops
	// Look ahead to see if we have a for-in or for-of loop
	headerStart := p.pos

	// Skip until we find ) to check if there's 'in' or 'of'
	hasInOrOf := false
	depth := 0
	iterations := 0
	for !p.isAtEnd() && (depth > 0 || !p.match(")")) && iterations < maxParserIterations {
		iterations++
		if p.match("(") {
			depth++
		} else if p.match(")") && depth > 0 {
			depth--
		}

		// Check for 'in' or 'of' keywords (not inside nested parens)
		if depth == 0 && (p.matchKeyword("in") || p.matchKeyword("of")) {
			hasInOrOf = true
		}

		p.advance()

		if depth == 0 && p.match(")") {
			break
		}
	}

	// Restore position
	p.pos = headerStart

	if hasInOrOf {
		// Parse for-in/for-of loop properly
		// Example: for (const item of items) { ... }
		// We need to parse the variable declaration

		var init ast.Node

		// Check for variable declaration (const, let, var)
		if p.matchKeyword("const", "let", "var") {
			varDecl, err := p.parseVariableDeclaration()
			if err != nil {
				return nil, err
			}
			init = varDecl
		} else {
			// Parse identifier or pattern (for cases like: for (item of items))
			expr, err := p.parseExpression()
			if err != nil {
				return nil, err
			}
			init = &ast.ExpressionStatement{Expression: expr}
		}

		p.skipWhitespaceAndComments()

		// Skip 'in' or 'of' keyword
		if p.matchKeyword("in") || p.matchKeyword("of") {
			p.advanceWord()
		}

		p.skipWhitespaceAndComments()

		// Skip the iterable expression until )
		depth = 0
		maxIterations := 1000
		iterations := 0
		for !p.isAtEnd() && (depth > 0 || !p.match(")")) && iterations < maxIterations {
			iterations++
			if p.match("(") {
				depth++
			} else if p.match(")") && depth > 0 {
				depth--
			}
			p.advance()
			if depth == 0 && p.match(")") {
				break
			}
		}

		if iterations >= maxIterations {
			return nil, fmt.Errorf("infinite loop detected in for-in/for-of header")
		}

		if !p.match(")") {
			return nil, fmt.Errorf("expected ')' in for-in/for-of loop")
		}
		p.advance()
		p.skipWhitespaceAndComments()

		// Parse body
		body, err := p.parseStatement()
		if err != nil {
			return nil, err
		}

		// Return with init so the binder can register the variable
		return &ast.ForStatement{
			Init:     init,
			Test:     nil,
			Update:   nil,
			Body:     body,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Regular for loop
	// Parse init (can be variable declaration or expression)
	var init ast.Node
	if p.matchKeyword("var", "let", "const") {
		varDecl, err := p.parseVariableDeclaration()
		if err != nil {
			return nil, err
		}
		init = varDecl
	} else if !p.match(";") {
		expr, err := p.parseExpression()
		if err != nil {
			return nil, err
		}
		init = &ast.ExpressionStatement{Expression: expr}
		p.skipWhitespaceAndComments()
		if p.match(";") {
			p.advance()
		}
	} else {
		p.advance() // consume ;
	}

	p.skipWhitespaceAndComments()

	// Parse test
	var test ast.Expression
	if !p.match(";") {
		var err error
		test, err = p.parseExpression()
		if err != nil {
			return nil, err
		}
	}

	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}
	p.skipWhitespaceAndComments()

	// Parse update
	var update ast.Expression
	if !p.match(")") {
		var err error
		update, err = p.parseExpression()
		if err != nil {
			return nil, err
		}
	}

	p.skipWhitespaceAndComments()
	p.expect(")")
	p.skipWhitespaceAndComments()

	// Parse body
	body, err := p.parseStatement()
	if err != nil {
		return nil, err
	}

	return &ast.ForStatement{
		Init:     init,
		Test:     test,
		Update:   update,
		Body:     body,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseWhileStatement() (*ast.WhileStatement, error) {
	startPos := p.currentPos()

	p.consumeKeyword("while")
	p.skipWhitespaceAndComments()

	p.expect("(")
	p.skipWhitespaceAndComments()

	// Parse test
	test, err := p.parseExpression()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()
	p.expect(")")
	p.skipWhitespaceAndComments()

	// Parse body
	body, err := p.parseStatement()
	if err != nil {
		return nil, err
	}

	return &ast.WhileStatement{
		Test:     test,
		Body:     body,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseSwitchStatement() (*ast.SwitchStatement, error) {
	startPos := p.currentPos()

	p.consumeKeyword("switch")
	p.skipWhitespaceAndComments()

	p.expect("(")
	p.skipWhitespaceAndComments()

	discriminant, err := p.parseExpression()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()
	p.expect(")")
	p.skipWhitespaceAndComments()

	p.expect("{")
	p.skipWhitespaceAndComments()

	var cases []*ast.SwitchCase

	for !p.match("}") && !p.isAtEnd() {
		caseStartPos := p.currentPos()
		var test ast.Expression

		if p.matchKeyword("case") {
			p.consumeKeyword("case")
			p.skipWhitespaceAndComments()
			test, err = p.parseExpression()
			if err != nil {
				return nil, err
			}
		} else if p.matchKeyword("default") {
			p.consumeKeyword("default")
			// test remains nil for default
		} else {
			return nil, fmt.Errorf("expected 'case' or 'default' in switch statement at %s", p.currentPos())
		}

		p.skipWhitespaceAndComments()
		p.expect(":")
		p.skipWhitespaceAndComments()

		var consequent []ast.Statement
		for !p.isAtEnd() && !p.match("case") && !p.match("default") && !p.match("}") {
			// Allow break statements
			if p.matchKeyword("break") {
				p.consumeKeyword("break")
				p.skipWhitespaceAndComments()
				if p.match(";") {
					p.advance()
				}
				p.skipWhitespaceAndComments()
				break // Exit statement loop for this case
			}

			stmt, err := p.parseStatement()
			if err != nil {
				return nil, err
			}
			if stmt != nil {
				consequent = append(consequent, stmt)
			}
			p.skipWhitespaceAndComments()
		}

		cases = append(cases, &ast.SwitchCase{
			Test:       test,
			Consequent: consequent,
			Position:   caseStartPos,
			EndPos:     p.currentPos(),
		})
	}

	p.expect("}")

	return &ast.SwitchStatement{
		Discriminant: discriminant,
		Cases:        cases,
		Position:     startPos,
		EndPos:       p.currentPos(),
	}, nil
}

func (p *parser) parseBlockStatement() (*ast.BlockStatement, error) {
	startPos := p.currentPos()

	p.expect("{")
	p.skipWhitespaceAndComments()

	var statements []ast.Statement

	iterations := 0
	for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		stmt, err := p.parseStatement()
		if err != nil {
			return nil, err
		}
		if stmt != nil {
			statements = append(statements, stmt)
		}
		p.skipWhitespaceAndComments()
	}

	if p.isAtEnd() {
		return nil, fmt.Errorf("unexpected end of file, expected '}'")
	}

	p.expect("}")

	return &ast.BlockStatement{
		Body:     statements,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseExpression() (ast.Expression, error) {
	return p.parseAssignmentExpression()
}

func (p *parser) parseAssignmentExpression() (ast.Expression, error) {
	left, err := p.parseConditionalExpression()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Check for assignment operators
	var op string
	if p.match("+=") {
		op = "+="
	} else if p.match("-=") {
		op = "-="
	} else if p.match("*=") {
		op = "*="
	} else if p.match("/=") {
		op = "/="
	} else if p.match("=") && !p.match("==") && !p.match("===") {
		op = "="
	}

	if op != "" {
		startPos := left.Pos()
		p.advanceString(len(op))
		p.skipWhitespaceAndComments()

		right, err := p.parseAssignmentExpression()
		if err != nil {
			return nil, err
		}

		return &ast.AssignmentExpression{
			Left:     left,
			Operator: op,
			Right:    right,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	return left, nil
}

func (p *parser) parseConditionalExpression() (ast.Expression, error) {
	expr, err := p.parseBinaryExpression()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Check for ternary operator (but not optional chaining ?.)
	if p.match("?") && p.peek(1) != "." {
		p.advance()
		p.skipWhitespaceAndComments()

		consequent, err := p.parseAssignmentExpression()
		if err != nil {
			return nil, err
		}

		p.skipWhitespaceAndComments()
		p.expect(":")
		p.skipWhitespaceAndComments()

		alternate, err := p.parseAssignmentExpression()
		if err != nil {
			return nil, err
		}

		return &ast.ConditionalExpression{
			Test:       expr,
			Consequent: consequent,
			Alternate:  alternate,
			Position:   expr.Pos(),
			EndPos:     alternate.End(),
		}, nil
	}

	return expr, nil
}

func (p *parser) parseBinaryExpression() (ast.Expression, error) {
	left, err := p.parseUnaryExpression()
	if err != nil {
		return nil, err
	}

	if left == nil {
		return nil, nil
	}

	p.skipWhitespaceAndComments()

	// Handle binary operators (simple left-to-right parsing for now)
	iterations := 0
	for !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		var op string
		// Check multi-character operators first
		if p.match("===") {
			op = "==="
		} else if p.match("!==") {
			op = "!=="
		} else if p.match("==") {
			op = "=="
		} else if p.match("!=") {
			op = "!="
		} else if p.match("<=") {
			op = "<="
		} else if p.match(">=") {
			op = ">="
		} else if p.match("&&") {
			op = "&&"
		} else if p.match("||") {
			op = "||"
		} else if p.match("??") {
			op = "??"
		} else if p.matchKeyword("in") {
			op = "in"
		} else if p.matchKeyword("instanceof") {
			op = "instanceof"
		} else if p.matchKeyword("as") {
			startPos := left.Pos()
			p.advanceWord() // consume 'as'
			p.skipWhitespaceAndComments()

			typeNode, err := p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}

			left = &ast.AsExpression{
				Expression:     left,
				TypeAnnotation: typeNode,
				Position:       startPos,
				EndPos:         p.currentPos(),
			}
			continue
		} else if p.match("+") && p.peek(1) != "+" && p.peek(1) != "=" {
			op = "+"
		} else if p.match("-") && p.peek(1) != "-" && p.peek(1) != "=" {
			op = "-"
		} else if p.match("*") && p.peek(1) != "=" {
			op = "*"
		} else if p.match("/") && p.peek(1) != "=" {
			op = "/"
		} else if p.match("%") {
			op = "%"
		} else if p.match("<") && p.peek(1) != "=" {
			op = "<"
		} else if p.match(">") && p.peek(1) != "=" {
			op = ">"
		} else {
			break
		}

		if op != "" {
			startPos := left.Pos()
			p.advanceString(len(op))
			p.skipWhitespaceAndComments()

			// Parse the right operand (unary expression to handle typeof, !, etc.)
			right, err := p.parseUnaryExpression()
			if err != nil {
				return nil, err
			}

			if right == nil {
				return nil, fmt.Errorf("expected right operand for operator %s at %d:%d", op, p.line, p.column)
			}

			left = &ast.BinaryExpression{
				Left:     left,
				Operator: op,
				Right:    right,
				Position: startPos,
				EndPos:   p.currentPos(),
			}

			p.skipWhitespaceAndComments()
		} else {
			break
		}
	}

	return left, nil
}

func (p *parser) parseCallExpression() (ast.Expression, error) {
	left, err := p.parseMemberExpression()
	if err != nil {
		return nil, err
	}

	// Check for nil left expression
	if left == nil {
		return nil, fmt.Errorf("unexpected nil expression in call chain at pos %d", p.pos)
	}

	// Loop para manejar chains como: obj.method().prop.method2()
	iterations := 0
	for iterations < maxParserIterations {
		iterations++
		p.skipWhitespaceAndComments()

		if p.match("(") {
			// Call expression
			startPos := left.Pos()
			p.advance()

			var args []ast.Expression

			argIterations := 0
			for !p.match(")") && !p.isAtEnd() && argIterations < maxParserIterations {
				argIterations++
				p.skipWhitespaceAndComments()
				arg, err := p.parseExpression()
				if err != nil {
					return nil, err
				}
				args = append(args, arg)

				p.skipWhitespaceAndComments()
				if p.match(",") {
					p.advance()
					p.skipWhitespaceAndComments()
				}
			}

			p.expect(")")

			left = &ast.CallExpression{
				Callee:    left,
				Arguments: args,
				Position:  startPos,
				EndPos:    p.currentPos(),
			}
			// Continuar el loop para parsear .prop o () siguiente
			continue
		}

		// Check for tagged template literal: identifier`...`
		if p.match("`") {
			// Tagged template literal
			startPos := left.Pos()
			templateStr := p.advanceStringLiteral()

			// Create a template literal as the argument
			templateArg := &ast.Literal{
				Value:    templateStr[1 : len(templateStr)-1], // Remove backticks
				Raw:      templateStr,
				Position: p.currentPos(),
				EndPos:   p.currentPos(),
			}

			left = &ast.CallExpression{
				Callee:    left,
				Arguments: []ast.Expression{templateArg},
				Position:  startPos,
				EndPos:    p.currentPos(),
			}
			// Continuar el loop
			continue
		}

		// Check for optional chaining ?. or regular .
		if p.match("?.") {
			if left == nil {
				return nil, fmt.Errorf("unexpected nil expression before optional chaining")
			}
			startPos := left.Pos()
			p.advanceString(2) // consume ?.
			p.skipWhitespaceAndComments()

			prop, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			left = &ast.MemberExpression{
				Object:   left,
				Property: prop,
				Computed: false,
				Optional: true,
				Position: startPos,
				EndPos:   p.currentPos(),
			}
			continue
		}

		if p.match(".") {
			if left == nil {
				return nil, fmt.Errorf("unexpected nil expression before member access")
			}
			startPos := left.Pos()
			p.advance()
			p.skipWhitespaceAndComments()

			prop, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			left = &ast.MemberExpression{
				Object:   left,
				Property: prop,
				Computed: false,
				Optional: false,
				Position: startPos,
				EndPos:   p.currentPos(),
			}
			continue
		}

		if p.match("[") {
			// Computed member expression
			if left == nil {
				return nil, fmt.Errorf("unexpected nil expression before computed property")
			}
			startPos := left.Pos()
			p.advance()
			p.skipWhitespaceAndComments()

			prop, err := p.parseExpression()
			if err != nil {
				return nil, err
			}

			p.skipWhitespaceAndComments()
			if !p.match("]") {
				return nil, fmt.Errorf("expected ']' in computed member expression")
			}
			p.advance()

			left = &ast.MemberExpression{
				Object:   left,
				Property: prop,
				Computed: true,
				Optional: false,
				Position: startPos,
				EndPos:   p.currentPos(),
			}
			continue
		}

		// No más member/call expressions
		break
	}

	return left, nil
}

func (p *parser) parseMemberExpression() (ast.Expression, error) {
	left, err := p.parsePrimaryExpression()
	if err != nil {
		return nil, err
	}

	if left == nil {
		return nil, nil
	}

	// Handle chained member expressions (e.g., document.head.append)
	iterations := 0
	for iterations < maxParserIterations {
		iterations++
		p.skipWhitespaceAndComments()

		// Check for optional chaining ?. or regular .
		isOptional := false
		if p.match("?.") {
			isOptional = true
			startPos := left.Pos()
			p.advanceString(2) // consume ?.
			p.skipWhitespaceAndComments()

			prop, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			left = &ast.MemberExpression{
				Object:   left,
				Property: prop,
				Computed: false,
				Optional: isOptional,
				Position: startPos,
				EndPos:   p.currentPos(),
			}
		} else if p.match(".") {
			startPos := left.Pos()
			p.advance()
			p.skipWhitespaceAndComments()

			prop, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			left = &ast.MemberExpression{
				Object:   left,
				Property: prop,
				Computed: false,
				Optional: false,
				Position: startPos,
				EndPos:   p.currentPos(),
			}
		} else if p.match("[") {
			// Handle computed member expressions (e.g., obj[prop])
			startPos := left.Pos()
			p.advance()
			p.skipWhitespaceAndComments()

			prop, err := p.parseExpression()
			if err != nil {
				return nil, err
			}

			p.skipWhitespaceAndComments()
			if !p.match("]") {
				return nil, fmt.Errorf("expected ']' in computed member expression")
			}
			p.advance()

			left = &ast.MemberExpression{
				Object:   left,
				Property: prop,
				Computed: true,
				Position: startPos,
				EndPos:   p.currentPos(),
			}
		} else {
			break
		}
	}

	return left, nil
}

func (p *parser) parseUnaryExpression() (ast.Expression, error) {
	p.skipWhitespaceAndComments()

	// Check for unary operators (check multi-char first)
	var op string
	startPos := p.currentPos()

	// Check for keyword unary operators first
	if p.matchKeyword("await") {
		op = "await"
		p.advanceString(5)
	} else if p.matchKeyword("typeof") {
		op = "typeof"
		p.advanceString(6)
	} else if p.matchKeyword("void") {
		op = "void"
		p.advanceString(4)
	} else if p.matchKeyword("delete") {
		op = "delete"
		p.advanceString(6)
	} else if p.peekString(2) == "++" {
		op = "++"
		p.advanceString(2)
	} else if p.peekString(2) == "--" {
		op = "--"
		p.advanceString(2)
	} else if p.match("!") {
		op = "!"
		p.advance()
	} else if p.match("-") {
		// Unary minus
		op = "-"
		p.advance()
	} else if p.match("+") {
		// Unary plus
		op = "+"
		p.advance()
	}

	if op != "" {
		p.skipWhitespaceAndComments()
		argument, err := p.parseUnaryExpression()
		if err != nil {
			return nil, err
		}

		return &ast.UnaryExpression{
			Operator: op,
			Argument: argument,
			Prefix:   true,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Parse postfix expression (call, member, postfix ++)
	return p.parsePostfixExpression()
}

func (p *parser) parsePostfixExpression() (ast.Expression, error) {
	expr, err := p.parseCallExpression()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Check for type assertion: expr as Type (can be chained: expr as T1 as T2)
	iterations := 0
	for p.matchKeyword("as") && iterations < maxParserIterations {
		iterations++
		p.advanceWord()
		p.skipWhitespaceAndComments()
		// Skip the type annotation (can be union type: Type1 | Type2)
		p.skipTypeAnnotation()
		p.skipWhitespaceAndComments()
		// Continue to check for more 'as' keywords
	}

	// Check for postfix ++ or --
	if p.match("++") {
		p.advanceString(2)
		return &ast.UnaryExpression{
			Operator: "++",
			Argument: expr,
			Prefix:   false,
			Position: expr.Pos(),
			EndPos:   p.currentPos(),
		}, nil
	} else if p.match("--") {
		p.advanceString(2)
		return &ast.UnaryExpression{
			Operator: "--",
			Argument: expr,
			Prefix:   false,
			Position: expr.Pos(),
			EndPos:   p.currentPos(),
		}, nil
	}

	return expr, nil
}

func (p *parser) parsePrimaryExpression() (ast.Expression, error) {
	p.skipWhitespaceAndComments()

	// Check for async arrow function or async function expression
	if p.matchKeyword("async") {
		savedPos := p.pos
		p.advanceWord()
		p.skipWhitespaceAndComments()

		// Check if followed by 'function' keyword for async function expression
		if p.matchKeyword("function") {
			// async function () {} or async function name() {}
			return p.parseAsyncFunctionExpression()
		}

		// Check if followed by ( for async (params) => or identifier for async x =>
		if p.match("(") || p.matchIdentifier() {
			// Look ahead to confirm it's an arrow function
			tempPos := p.pos
			isAsyncArrow := false

			if p.match("(") {
				// async (params) => pattern
				p.advance()
				// Skip to matching )
				depth := 1
				for depth > 0 && !p.isAtEnd() {
					if p.match("(") {
						depth++
						p.advance()
					} else if p.match(")") {
						depth--
						p.advance()
						if depth == 0 {
							break
						}
					} else {
						p.advance()
					}
				}
				p.skipWhitespaceAndComments()
				// Check for : (return type annotation)
				if p.match(":") {
					p.advance()
					p.skipWhitespaceAndComments()
					p.skipTypeAnnotation()
					p.skipWhitespaceAndComments()
				}
				// Check for =>
				if p.match("=") && p.peek(1) == ">" {
					isAsyncArrow = true
				}
			} else if p.matchIdentifier() {
				// async identifier => pattern
				p.advanceWord()
				p.skipWhitespaceAndComments()
				if p.match("=") && p.peek(1) == ">" {
					isAsyncArrow = true
				}
			}

			if isAsyncArrow {
				// Reset and parse as arrow function
				p.pos = savedPos
				return p.parseArrowFunction()
			}

			// Not an arrow function, restore position
			p.pos = tempPos
		}

		// Not an async arrow function or async function expression, restore
		p.pos = savedPos
	}

	// Check for generic arrow function: <T>(x: T) => T or <T = unknown>(x: T) => T
	if p.match("<") {
		savedPos := p.pos
		p.advance()
		p.skipWhitespaceAndComments()

		// Try to determine if this is a generic arrow function
		// Look for pattern: <identifier [extends ...] [= ...]>
		isGenericArrow := false
		if p.matchIdentifier() {
			// Skip type parameter name
			p.advanceWord()
			p.skipWhitespaceAndComments()

			// Skip extends clause if present
			if p.match("extends") {
				p.advanceString(7)
				p.skipWhitespaceAndComments()
				p.skipTypeAnnotation()
				p.skipWhitespaceAndComments()
			}

			// Skip default type if present
			if p.match("=") {
				p.advance()
				p.skipWhitespaceAndComments()
				p.skipTypeAnnotation()
				p.skipWhitespaceAndComments()
			}

			// Check for comma (multiple type params) or closing >
			if p.match(",") || p.match(">") {
				// Skip remaining type parameters
				depth := 1
				for depth > 0 && !p.isAtEnd() {
					if p.match("<") {
						depth++
						p.advance()
					} else if p.match(">") {
						depth--
						p.advance()
					} else {
						p.advance()
					}
				}

				p.skipWhitespaceAndComments()

				// Check if followed by (
				if p.match("(") {
					isGenericArrow = true
				}
			}
		}

		if isGenericArrow {
			p.pos = savedPos
			return p.parseArrowFunction()
		}

		// Try to parse as type assertion: <Type>expression
		// Look for pattern: <Type> followed by expression (not an operator)
		p.pos = savedPos
		p.advance() // consume <
		p.skipWhitespaceAndComments()

		// Try to skip the type
		canBeTypeAssertion := false
		if p.matchIdentifier() {
			p.skipTypeAnnotation()
			p.skipWhitespaceAndComments()
			// Check if followed by >
			if p.match(">") {
				p.advance()
				p.skipWhitespaceAndComments()
				// Check if followed by something that can start an expression
				// (not an operator like <, >, =, etc.)
				if p.match("{") || p.match("[") || p.match("(") || p.matchIdentifier() ||
					p.match("\"") || p.match("'") || p.match("`") || p.matchNumber() {
					canBeTypeAssertion = true
				}
			}
		}

		if canBeTypeAssertion {
			// Parse the expression after the type assertion
			expr, err := p.parseUnaryExpression()
			if err != nil {
				return nil, err
			}
			// Return the expression (type assertion is compile-time only)
			return expr, nil
		}

		// Not a type assertion, restore
		p.pos = savedPos
	}

	// Handle parentheses (could be grouped expression or arrow function params)
	if p.match("(") {
		savedPos := p.pos

		// Try to parse as arrow function parameters
		p.advance()
		p.skipWhitespaceAndComments()

		// Check if this looks like arrow function params
		isArrowFunc := false
		if p.match(")") {
			// Empty params () => ... or (): Type => ...
			p.advance()
			p.skipWhitespaceAndComments()
			// Check for return type annotation
			if p.match(":") {
				p.advance()
				p.skipWhitespaceAndComments()
				p.skipTypeAnnotation()
				p.skipWhitespaceAndComments()
			}
			if p.match("=") && p.peek(1) == ">" {
				isArrowFunc = true
			}
		} else if p.match("{") || p.match("[") {
			// Could be destructuring param ({...}) => ... or ([...]) => ...
			// Or grouped object/array literal ({...}) or ([...])
			// Need to look ahead further to determine
			tempPos := p.pos
			depth := 1
			openChar := p.current()
			closeChar := "}"
			if openChar == "[" {
				closeChar = "]"
			}
			p.advance() // consume { or [

			// Skip the entire object/array destructuring pattern
			for depth > 0 && !p.isAtEnd() {
				if string(p.current()) == string(openChar) {
					depth++
				} else if string(p.current()) == closeChar {
					depth--
				}
				p.advance()
				if depth == 0 {
					break
				}
			}

			p.skipWhitespaceAndComments()

			// Check if followed by ): Type => or ) =>
			if p.match(")") {
				p.advance()
				p.skipWhitespaceAndComments()
				// Check for return type annotation
				if p.match(":") {
					p.advance()
					p.skipWhitespaceAndComments()
					p.skipTypeAnnotation()
					p.skipWhitespaceAndComments()
				}
				if p.match("=") && p.peek(1) == ">" {
					isArrowFunc = true
				}
			}

			// Restore position
			p.pos = tempPos
		} else if p.match("...") {
			// Rest parameter (...args) => ...
			isArrowFunc = true
		} else if p.matchIdentifier() {
			// Could be (x) => ... or (x, y) => ...
			// Save position and try to parse params
			tempPos := p.pos
			paramIter := 0
			for !p.match(")") && !p.isAtEnd() && paramIter < maxParserIterations {
				paramIter++
				if p.matchIdentifier() {
					p.advanceWord()
					p.skipWhitespaceAndComments()
					if p.match(":") {
						p.advance()
						p.skipWhitespaceAndComments()
						p.skipTypeAnnotation()
						p.skipWhitespaceAndComments()
					}
					if p.match("=") {
						p.advance()
						p.skipWhitespaceAndComments()
						// Skip default value
						depth := 0
						for !p.isAtEnd() && paramIter < maxParserIterations {
							if p.match("(") || p.match("[") || p.match("{") {
								depth++
							} else if p.match(")") || p.match("]") || p.match("}") {
								if depth == 0 && (p.match(")") || p.match(",")) {
									break
								}
								depth--
							} else if p.match(",") && depth == 0 {
								break
							}
							p.advance()
						}
						p.skipWhitespaceAndComments()
					}
				} else if p.match("{") || p.match("[") {
					// Destructuring parameter
					depth := 0
					startChar := p.current()
					p.advance()
					depth++
					for depth > 0 && !p.isAtEnd() {
						if string(p.current()) == startChar {
							depth++
						} else if (startChar == "{" && p.match("}")) || (startChar == "[" && p.match("]")) {
							depth--
						}
						p.advance()
						if depth == 0 {
							break
						}
					}
					p.skipWhitespaceAndComments()

					// Type annotation
					if p.match(":") {
						p.advance()
						p.skipWhitespaceAndComments()
						p.skipTypeAnnotation()
						p.skipWhitespaceAndComments()
					}

					// Default value
					if p.match("=") {
						p.advance()
						p.skipWhitespaceAndComments()
						// Skip default value
						depth := 0
						for !p.isAtEnd() && paramIter < maxParserIterations {
							if p.match("(") || p.match("[") || p.match("{") {
								depth++
							} else if p.match(")") || p.match("]") || p.match("}") {
								if depth == 0 && (p.match(")") || p.match(",")) {
									break
								}
								depth--
							} else if p.match(",") && depth == 0 {
								break
							}
							p.advance()
						}
						p.skipWhitespaceAndComments()
					}
				} else if p.match("...") {
					// Rest parameter
					p.advanceString(3)
					p.skipWhitespaceAndComments()
					if p.matchIdentifier() {
						p.advanceWord()
						p.skipWhitespaceAndComments()
						if p.match(":") {
							p.advance()
							p.skipWhitespaceAndComments()
							p.skipTypeAnnotation()
							p.skipWhitespaceAndComments()
						}
					}
				} else {
					break
				}

				if p.match(",") {
					p.advance()
					p.skipWhitespaceAndComments()
				}
			}
			if p.match(")") {
				p.advance()
				p.skipWhitespaceAndComments()
				// Check for return type annotation
				if p.match(":") {
					p.advance()
					p.skipWhitespaceAndComments()
					p.skipTypeAnnotation()
					p.skipWhitespaceAndComments()
				}
				if p.match("=") && p.peek(1) == ">" {
					isArrowFunc = true
				}
			}
			// Restore position
			p.pos = tempPos
		}

		if isArrowFunc {
			// Reset to start and parse as arrow function
			p.pos = savedPos
			return p.parseArrowFunction()
		}

		// Reset and parse as grouped expression
		p.pos = savedPos
		p.advance()
		p.skipWhitespaceAndComments()

		expr, err := p.parseExpression()
		if err != nil {
			return nil, err
		}

		p.skipWhitespaceAndComments()
		if !p.match(")") {
			return nil, fmt.Errorf("expected ')' after expression at %s", p.currentPos())
		}
		p.advance()

		return expr, nil
	}

	// Single identifier arrow function: x => expr
	if p.matchIdentifier() {
		savedPos := p.pos
		p.advanceWord()
		p.skipWhitespaceAndComments()

		if p.match("=") && p.peek(1) == ">" {
			// This is an arrow function
			p.pos = savedPos
			return p.parseArrowFunction()
		}

		// Not an arrow function, restore and parse as identifier
		p.pos = savedPos
	}

	// new expression
	if p.matchKeyword("new") {
		return p.parseNewExpression()
	}

	// this expression
	if p.matchKeyword("this") {
		startPos := p.currentPos()
		p.advanceWord()
		return &ast.ThisExpression{
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// super expression
	if p.matchKeyword("super") {
		startPos := p.currentPos()
		p.advanceWord()
		return &ast.SuperExpression{
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	if p.matchKeyword("true", "false") {
		startPos := p.currentPos()
		value := p.advanceWord()
		return &ast.Literal{
			Value:    value == "true",
			Raw:      value,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	if p.matchNumber() {
		startPos := p.currentPos()
		num := p.advanceNumber()
		return &ast.Literal{
			Value:    num,
			Raw:      num,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Regex literal - simple heuristic: / followed by non-whitespace
	// This is a HACK and doesn't handle all edge cases, but works for common patterns
	if p.match("/") {
		startPos := p.currentPos()
		p.advance() // consume /

		// Find closing / (skip escaped characters and character classes)
		inCharClass := false
		for !p.isAtEnd() {
			if p.source[p.pos] == '\\' {
				// Skip escaped character
				p.advance()
				if !p.isAtEnd() {
					p.advance()
				}
			} else if p.source[p.pos] == '[' && !inCharClass {
				// Entering character class
				inCharClass = true
				p.advance()
			} else if p.source[p.pos] == ']' && inCharClass {
				// Exiting character class
				inCharClass = false
				p.advance()
			} else if p.source[p.pos] == '/' && !inCharClass {
				// Found closing / (only if not in character class)
				p.advance() // consume closing /
				// Parse flags (i, g, m, etc.)
				for !p.isAtEnd() && (unicode.IsLetter(rune(p.source[p.pos])) || unicode.IsDigit(rune(p.source[p.pos]))) {
					p.advance()
				}
				break
			} else {
				p.advance()
			}
		}

		raw := string(p.source[startPos.Column-1 : p.pos])
		return &ast.Literal{
			Value:    raw,
			Raw:      raw,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	if p.matchString() {
		startPos := p.currentPos()
		str := p.advanceStringLiteral()
		return &ast.Literal{
			Value:    str[1 : len(str)-1], // Remove quotes
			Raw:      str,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Array literal
	if p.match("[") {
		return p.parseArrayLiteral()
	}

	// Object literal
	if p.match("{") {
		return p.parseObjectLiteral()
	}

	// Function expression: function() {} or function name() {}
	if p.matchKeyword("function") {
		return p.parseFunctionExpression()
	}

	// Null literal
	if p.matchKeyword("null") {
		startPos := p.currentPos()
		val := p.advanceWord()
		return &ast.Literal{
			Value:    val,
			Raw:      val,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Undefined
	if p.matchKeyword("undefined") {
		startPos := p.currentPos()
		val := p.advanceWord()
		return &ast.Identifier{
			Name:     val,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	if p.matchIdentifier() {
		return p.parseIdentifier()
	}

	return nil, fmt.Errorf("unexpected token: %s at %s", p.current(), p.currentPos())
}

func (p *parser) parseImportDeclaration() (*ast.ImportDeclaration, error) {
	startPos := p.currentPos()
	p.advanceWord() // consume "import"
	p.skipWhitespaceAndComments()

	isTypeOnly := false
	if p.matchKeyword("type") {
		savedPos := p.pos
		p.advanceWord()
		p.skipWhitespaceAndComments()

		if p.matchKeyword("from") || p.match(",") {
			p.pos = savedPos
		} else {
			isTypeOnly = true
		}
	}

	var specifiers []ast.ImportSpecifier
	var source string
	var sourceLiteral *ast.Literal

	if p.matchString() {
		sourceStart := p.currentPos()
		sourceRaw := p.advanceStringLiteral()
		source = sourceRaw[1 : len(sourceRaw)-1]
		sourceLiteral = &ast.Literal{
			Value:    source,
			Raw:      sourceRaw,
			Position: sourceStart,
			EndPos:   p.currentPos(),
		}
		return &ast.ImportDeclaration{
			Source:     sourceLiteral,
			Specifiers: nil,
			IsTypeOnly: isTypeOnly,
			Position:   startPos,
			EndPos:     p.currentPos(),
		}, nil
	}

	if p.match("*") {
		p.advance()
		p.skipWhitespaceAndComments()
		if !p.matchKeyword("as") {
			return nil, fmt.Errorf("expected 'as' after '*' in import")
		}
		p.advanceWord()
		p.skipWhitespaceAndComments()

		local, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		specifiers = append(specifiers, ast.ImportSpecifier{
			Local:      local,
			Imported:   &ast.Identifier{Name: "*", Position: local.Position, EndPos: local.EndPos},
			IsTypeOnly: isTypeOnly,
		})
	} else if p.match("{") {
		p.advance()
		p.skipWhitespaceAndComments()

		for !p.match("}") && !p.isAtEnd() {
			specIsTypeOnly := false
			if p.matchKeyword("type") {
				savedPos := p.pos
				p.advanceWord()
				p.skipWhitespaceAndComments()

				if p.matchKeyword("as") || p.match(",") || p.match("}") {
					p.pos = savedPos
				} else {
					specIsTypeOnly = true
				}
			}

			imported, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			var local *ast.Identifier = imported

			p.skipWhitespaceAndComments()
			if p.matchKeyword("as") {
				p.advanceWord()
				p.skipWhitespaceAndComments()
				local, err = p.parseIdentifier()
				if err != nil {
					return nil, err
				}
			}

			specifiers = append(specifiers, ast.ImportSpecifier{
				Local:      local,
				Imported:   imported,
				IsTypeOnly: isTypeOnly || specIsTypeOnly,
			})

			p.skipWhitespaceAndComments()
			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			}
		}

		if !p.match("}") {
			return nil, fmt.Errorf("expected '}' in import declaration")
		}
		p.advance()
	} else {
		local, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		specifiers = append(specifiers, ast.ImportSpecifier{
			Local:      local,
			Imported:   &ast.Identifier{Name: "default", Position: local.Position, EndPos: local.EndPos},
			IsTypeOnly: isTypeOnly,
		})

		p.skipWhitespaceAndComments()

		if p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()

			if p.match("*") {
				p.advance()
				p.skipWhitespaceAndComments()
				if !p.matchKeyword("as") {
					return nil, fmt.Errorf("expected 'as' after '*' in import")
				}
				p.advanceWord()
				p.skipWhitespaceAndComments()

				nsLocal, err := p.parseIdentifier()
				if err != nil {
					return nil, err
				}

				specifiers = append(specifiers, ast.ImportSpecifier{
					Local:      nsLocal,
					Imported:   &ast.Identifier{Name: "*", Position: nsLocal.Position, EndPos: nsLocal.EndPos},
					IsTypeOnly: isTypeOnly,
				})
			} else if p.match("{") {
				p.advance()
				p.skipWhitespaceAndComments()

				for !p.match("}") && !p.isAtEnd() {
					specIsTypeOnly := false
					if p.matchKeyword("type") {
						savedPos := p.pos
						p.advanceWord()
						p.skipWhitespaceAndComments()
						if p.matchKeyword("as") || p.match(",") || p.match("}") {
							p.pos = savedPos
						} else {
							specIsTypeOnly = true
						}
					}

					imported, err := p.parseIdentifier()
					if err != nil {
						return nil, err
					}

					var local *ast.Identifier = imported

					p.skipWhitespaceAndComments()
					if p.matchKeyword("as") {
						p.advanceWord()
						p.skipWhitespaceAndComments()
						local, err = p.parseIdentifier()
						if err != nil {
							return nil, err
						}
					}

					specifiers = append(specifiers, ast.ImportSpecifier{
						Local:      local,
						Imported:   imported,
						IsTypeOnly: isTypeOnly || specIsTypeOnly,
					})

					p.skipWhitespaceAndComments()
					if p.match(",") {
						p.advance()
						p.skipWhitespaceAndComments()
					}
				}

				if !p.match("}") {
					return nil, fmt.Errorf("expected '}' in import declaration")
				}
				p.advance()
			}
		}
	}

	p.skipWhitespaceAndComments()
	if !p.matchKeyword("from") {
		return nil, fmt.Errorf("expected 'from' in import declaration")
	}
	p.advanceWord()
	p.skipWhitespaceAndComments()

	if !p.matchString() {
		return nil, fmt.Errorf("expected string literal for import source")
	}
	sourceStart := p.currentPos()
	sourceRaw := p.advanceStringLiteral()
	source = sourceRaw[1 : len(sourceRaw)-1]
	sourceLiteral = &ast.Literal{
		Value:    source,
		Raw:      sourceRaw,
		Position: sourceStart,
		EndPos:   p.currentPos(),
	}

	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.ImportDeclaration{
		Source:     sourceLiteral,
		Specifiers: specifiers,
		IsTypeOnly: isTypeOnly,
		Position:   startPos,
		EndPos:     p.currentPos(),
	}, nil
}

func (p *parser) parseExportDeclaration() (*ast.ExportDeclaration, error) {
	return nil, fmt.Errorf("parseExportDeclaration not implemented")
}

func (p *parser) parseClassDeclaration() (*ast.ClassDeclaration, error) {
	return nil, fmt.Errorf("parseClassDeclaration not implemented")
}

// Helper methods

func (p *parser) currentPos() ast.Position {
	return ast.Position{
		Line:   p.line,
		Column: p.column,
	}
}

func (p *parser) isAtEnd() bool {
	return p.pos >= len(p.source)
}

func (p *parser) current() string {
	if p.isAtEnd() {
		return ""
	}
	return string(p.source[p.pos])
}

func (p *parser) peek(n int) string {
	if p.pos+n >= len(p.source) {
		return ""
	}
	return string(p.source[p.pos+n])
}

func (p *parser) advance() {
	if p.isAtEnd() {
		return
	}
	if p.source[p.pos] == '\n' {
		p.line++
		p.column = 1
	} else {
		p.column++
	}
	p.pos++
}

func (p *parser) skipWhitespaceAndComments() {
	for !p.isAtEnd() {
		c := p.source[p.pos]
		if c == ' ' || c == '\t' || c == '\r' || c == '\n' {
			p.advance()
		} else if c == '/' {
			if p.peek(1) == "/" {
				// Single line comment
				for !p.isAtEnd() && p.source[p.pos] != '\n' {
					p.advance()
				}
			} else if p.peek(1) == "*" {
				// Multi line comment
				p.advance() // /
				p.advance() // *
				for !p.isAtEnd() {
					if p.source[p.pos] == '*' && p.peek(1) == "/" {
						p.advance()
						p.advance()
						break
					}
					p.advance()
				}
			} else {
				break
			}
		} else {
			break
		}
	}
}

func (p *parser) parseNewExpression() (ast.Expression, error) {
	startPos := p.currentPos()
	p.advanceWord() // consume new
	p.skipWhitespaceAndComments()

	// Parse callee (identifier or member expression)
	// For now just identifier
	callee, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	// Parse arguments
	if p.match("(") {
		p.advance()
		// skip until )
		depth := 1
		for depth > 0 && !p.isAtEnd() {
			if p.match("(") {
				depth++
			} else if p.match(")") {
				depth--
			}
			p.advance()
		}
	}

	return &ast.CallExpression{
		Callee:    callee,
		Arguments: nil,
		Position:  startPos,
		EndPos:    p.currentPos(),
	}, nil
}

func (p *parser) parseArrayLiteral() (ast.Expression, error) {
	startPos := p.currentPos()
	p.advance() // consume [
	p.skipWhitespaceAndComments()

	// Skip until ]
	depth := 1
	for depth > 0 && !p.isAtEnd() {
		if p.match("[") {
			depth++
		} else if p.match("]") {
			depth--
		}
		p.advance()
	}

	return &ast.Literal{
		Value:    "[]",
		Raw:      "[]",
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseObjectLiteral() (ast.Expression, error) {
	startPos := p.currentPos()
	p.advance() // consume {
	p.skipWhitespaceAndComments()

	// Skip until }
	depth := 1
	for depth > 0 && !p.isAtEnd() {
		if p.match("{") {
			depth++
		} else if p.match("}") {
			depth--
		}
		p.advance()
	}

	return &ast.Literal{
		Value:    "{}",
		Raw:      "{}",
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) match(s string) bool {
	if p.pos+len(s) > len(p.source) {
		return false
	}
	return p.source[p.pos:p.pos+len(s)] == s
}

func (p *parser) matchKeyword(keywords ...string) bool {
	for _, kw := range keywords {
		if p.match(kw) {
			// Check if it's a whole word
			end := p.pos + len(kw)
			if end < len(p.source) {
				c := p.source[end]
				if unicode.IsLetter(rune(c)) || unicode.IsDigit(rune(c)) || c == '_' || c == '$' {
					continue
				}
			}
			return true
		}
	}
	return false
}

func (p *parser) advanceWord() string {
	start := p.pos
	for !p.isAtEnd() {
		c := rune(p.source[p.pos])
		if unicode.IsLetter(c) || unicode.IsDigit(c) || c == '_' || c == '$' {
			p.advance()
		} else {
			break
		}
	}
	return p.source[start:p.pos]
}

func (p *parser) advanceStringLiteral() string {
	start := p.pos
	quote := p.source[p.pos]
	p.advance() // quote
	for !p.isAtEnd() {
		if p.source[p.pos] == quote {
			p.advance()
			break
		}
		if p.source[p.pos] == '\\' {
			p.advance()
			if !p.isAtEnd() {
				p.advance()
			}
		} else {
			p.advance()
		}
	}
	return p.source[start:p.pos]
}

func (p *parser) matchString() bool {
	if p.isAtEnd() {
		return false
	}
	c := p.source[p.pos]
	return c == '"' || c == '\'' || c == '`'
}

func (p *parser) matchNumber() bool {
	if p.isAtEnd() {
		return false
	}
	c := p.source[p.pos]
	return unicode.IsDigit(rune(c))
}

func (p *parser) advanceNumber() string {
	start := p.pos
	for !p.isAtEnd() {
		c := rune(p.source[p.pos])
		if unicode.IsDigit(c) || c == '.' {
			p.advance()
		} else {
			break
		}
	}
	return p.source[start:p.pos]
}

func (p *parser) matchIdentifier() bool {
	if p.isAtEnd() {
		return false
	}
	c := rune(p.source[p.pos])
	return unicode.IsLetter(c) || c == '_' || c == '$'
}

func (p *parser) parseIdentifier() (*ast.Identifier, error) {
	startPos := p.currentPos()
	name := p.advanceWord()
	return &ast.Identifier{
		Name:     name,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) advanceString(n int) {
	for i := 0; i < n; i++ {
		p.advance()
	}
}

func (p *parser) consumeKeyword(keywords ...string) (string, error) {
	for _, kw := range keywords {
		if p.matchKeyword(kw) {
			p.advanceWord()
			p.skipWhitespaceAndComments()
			return kw, nil
		}
	}
	return "", fmt.Errorf("expected one of keywords %v at %s", keywords, p.currentPos())
}

func (p *parser) peekString(n int) string {
	if p.pos+n > len(p.source) {
		return ""
	}
	return p.source[p.pos : p.pos+n]
}

func (p *parser) parseTypeAnnotation() (ast.TypeNode, error) {
	// Simple stub that consumes tokens until it looks like the type ended
	if p.match(":") {
		p.advance()
		p.skipWhitespaceAndComments()
	}

	// Consume type tokens
	for !p.isAtEnd() {
		if p.match(",") || p.match(";") || p.match("=") || p.match(")") || p.match("}") || p.match(">") {
			break
		}
		p.advance()
	}

	return &ast.TypeReference{
		Name: "any",
	}, nil
}

func (p *parser) parseTypeAnnotationPrimary() (ast.TypeNode, error) {
	// Stub
	return &ast.TypeReference{
		Name: "any",
	}, nil
}

func (p *parser) parseArrowFunction() (*ast.ArrowFunctionExpression, error) {
	return nil, fmt.Errorf("parseArrowFunction not implemented")
}

func (p *parser) expect(s string) error {
	if !p.match(s) {
		return fmt.Errorf("expected '%s' at %s", s, p.currentPos())
	}
	p.advanceString(len(s))
	p.skipWhitespaceAndComments()
	return nil
}

func (p *parser) parseParameterList() ([]*ast.Parameter, error) {
	var params []*ast.Parameter
	for !p.match(")") && !p.isAtEnd() {
		// Skip until )
		p.advance()
	}
	return params, nil
}

func (p *parser) parseTryStatement() (*ast.TryStatement, error) {
	return nil, fmt.Errorf("parseTryStatement not implemented")
}

func (p *parser) parseThrowStatement() (*ast.ThrowStatement, error) {
	return nil, fmt.Errorf("parseThrowStatement not implemented")
}

func (p *parser) parseEnumDeclaration() (*ast.EnumDeclaration, error) {
	return nil, fmt.Errorf("parseEnumDeclaration not implemented")
}
