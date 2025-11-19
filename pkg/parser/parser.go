package parser

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"unicode"
	"unicode/utf8"

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
	startPos := p.currentPos()

	p.consumeKeyword("function")
	p.skipWhitespaceAndComments()

	name, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()
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
		Generator: false,
		Position:  startPos,
		EndPos:    p.currentPos(),
	}, nil
}

func (p *parser) parseVariableDeclaration() (*ast.VariableDeclaration, error) {
	startPos := p.currentPos()

	kind := p.consumeKeyword("var", "let", "const")
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
		// Skip the entire for-in/for-of header
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

		// Return placeholder
		return &ast.ForStatement{
			Init:     nil,
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
		return nil, fmt.Errorf("unexpected nil expression in call chain")
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

	// Check for type assertion: expr as Type
	if p.matchKeyword("as") {
		p.advanceWord()
		p.skipWhitespaceAndComments()
		// Skip the type annotation (can be union type: Type1 | Type2)
		p.skipTypeAnnotation()
		// Return original expression (type assertion is compile-time only)
		return expr, nil
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

	// Check for async arrow function: async (params) => {...} or async param => {...}
	if p.matchKeyword("async") {
		savedPos := p.pos
		p.advanceWord()
		p.skipWhitespaceAndComments()

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

		// Not an async arrow function, restore
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
						if depth == 0 {
							break
						}
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

		// Not a generic arrow function, restore
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
		} else if p.match("{") {
			// Destructuring param ({...}) => ...
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
						// Type annotation
						p.advance()
						p.skipWhitespaceAndComments()
						// Skip type (including generics like Record<K, V>)
						p.skipTypeAnnotation()
						p.skipWhitespaceAndComments()
					}
					// Check for default value
					if p.match("=") {
						p.advance()
						p.skipWhitespaceAndComments()
						// Skip default value expression
						// Find the end (comma or closing paren)
						depth := 0
						for !p.isAtEnd() && paramIter < maxParserIterations {
							if p.match("(") || p.match("[") || p.match("{") {
								depth++
							} else if p.match(")") || p.match("]") || p.match("}") {
								if depth == 0 && p.match(")") {
									break // End of params
								}
								depth--
							} else if p.match(",") && depth == 0 {
								break // Next param
							}
							p.advance()
						}
						p.skipWhitespaceAndComments()
					}
					if p.match(",") {
						p.advance()
						p.skipWhitespaceAndComments()
					}
				} else {
					break
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
	if p.match("/") && p.pos+1 < len(p.source) && !unicode.IsSpace(rune(p.source[p.pos+1])) {
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

	if p.matchIdentifier() {
		return p.parseIdentifier()
	}

	return nil, nil
}

func (p *parser) parseIdentifier() (*ast.Identifier, error) {
	startPos := p.currentPos()

	if !p.matchIdentifier() {
		return nil, fmt.Errorf("expected identifier at %s", startPos)
	}

	name := p.advanceWord()

	return &ast.Identifier{
		Name:     name,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseIdentifierWithGenerics parses an identifier that may have generic type arguments
// This is used for expressions like new Map<K, V>() where Map is followed by <K, V>
func (p *parser) parseIdentifierWithGenerics() (ast.Expression, error) {
	startPos := p.currentPos()

	if !p.matchIdentifier() {
		return nil, fmt.Errorf("expected identifier at %s", startPos)
	}

	name := p.advanceWord()

	// Ultra-simple approach: just check if next character is '<' and skip until '>'
	p.skipWhitespaceAndComments()
	if p.match("<") {
		p.advance() // consume '<'
		depth := 1
		for !p.isAtEnd() && depth > 0 {
			if p.match("<") {
				depth++
				p.advance()
			} else if p.match(">") {
				depth--
				p.advance()
				if depth == 0 {
					break
				}
			} else {
				p.advance()
			}
		}
		if depth != 0 {
			return nil, fmt.Errorf("unmatched '<' in generic type")
		}
	}

	return &ast.Identifier{
		Name:     name,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseParameterList() ([]*ast.Parameter, error) {
	var params []*ast.Parameter

	iterations := 0
	for !p.match(")") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		p.skipWhitespaceAndComments()

		// Check for rest parameter: ...identifier
		if p.match("...") {
			p.advanceString(3)
			p.skipWhitespaceAndComments()
		}

		// Check for destructuring patterns
		var id *ast.Identifier
		var err error

		if p.match("{") || p.match("[") {
			// Handle destructuring pattern - extract individual names
			startPos := p.currentPos()
			openChar := p.source[p.pos]
			closeChar := byte('}')
			isObjectPattern := openChar == '{'
			if openChar == '[' {
				closeChar = ']'
			}

			p.advance() // consume opening { or [
			p.skipWhitespaceAndComments()

			// Extract parameter names from the destructuring pattern
			var extractedNames []string
			depth := 1
			currentName := ""

			fmt.Fprintf(os.Stderr, "PARSER: Starting destructuring extraction, openChar=%c, closeChar=%c\n", openChar, closeChar)

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
							fmt.Fprintf(os.Stderr, "PARSER: Adding name at close: '%s'\n", currentName)
							extractedNames = append(extractedNames, strings.TrimSpace(currentName))
							currentName = ""
						}
					}
					p.advance()
				} else if ch == ',' && depth == 1 {
					// End of one binding
					if currentName != "" {
						fmt.Fprintf(os.Stderr, "PARSER: Adding name at comma: '%s'\n", currentName)
						extractedNames = append(extractedNames, strings.TrimSpace(currentName))
						currentName = ""
					}
					p.advance()
					p.skipWhitespaceAndComments()
				} else if ch == ':' && isObjectPattern && depth == 1 {
					// In object pattern, skip the rename part (e.g., {oldName: newName})
					// We want to capture 'newName', not 'oldName'
					fmt.Fprintf(os.Stderr, "PARSER: Found ':' - clearing currentName (was '%s')\n", currentName)
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
					fmt.Fprintf(os.Stderr, "PARSER: Skipping char '%c' (0x%x)\n", ch, ch)
					p.advance()
				}
			}

			fmt.Fprintf(os.Stderr, "PARSER: Finished extraction, got %d names: %v\n", len(extractedNames), extractedNames)

			p.skipWhitespaceAndComments()

			// Parse type annotation if present
			var paramType ast.TypeNode
			if p.match(":") {
				p.advance()
				p.skipWhitespaceAndComments()
				paramType, err = p.parseTypeAnnotation()
				if err != nil {
					return nil, err
				}
				p.skipWhitespaceAndComments()
			}

			// Create a parameter for each extracted name
			if len(extractedNames) > 0 {
				// Debug: log extracted names
				if len(extractedNames) > 0 {
					fmt.Fprintf(os.Stderr, "PARSER: Extracted names from destructuring: %v\n", extractedNames)
				}
				for _, name := range extractedNames {
					if name != "" {
						paramId := &ast.Identifier{
							Name:     name,
							Position: startPos,
							EndPos:   p.currentPos(),
						}
						params = append(params, &ast.Parameter{
							ID:        paramId,
							ParamType: paramType,
							Optional:  false,
							Position:  startPos,
							EndPos:    p.currentPos(),
						})
					}
				}
			} else {
				// Fallback: create placeholder if no names were extracted
				fmt.Fprintf(os.Stderr, "PARSER: No names extracted, using fallback\n")
				id = &ast.Identifier{
					Name:     "destructured_param",
					Position: startPos,
					EndPos:   p.currentPos(),
				}
				params = append(params, &ast.Parameter{
					ID:        id,
					ParamType: paramType,
					Optional:  false,
					Position:  startPos,
					EndPos:    p.currentPos(),
				})
			}

			// Skip to next parameter (comma or closing paren)
			p.skipWhitespaceAndComments()
			if !p.match(",") && !p.match(")") {
				// Skip any remaining characters until comma or closing paren
				for !p.match(",") && !p.match(")") && !p.isAtEnd() {
					p.advance()
				}
			}
			if p.match(",") {
				p.advance()
			}
			p.skipWhitespaceAndComments()
			continue
		} else {
			id, err = p.parseIdentifier()
			if err != nil {
				return nil, err
			}
		}

		// Handle optional type annotation
		var paramType ast.TypeNode
		p.skipWhitespaceAndComments()
		if p.match(":") {
			p.advance() // consume ':'
			p.skipWhitespaceAndComments()

			// Parse type annotation (simplified - just parse as TypeReference for now)
			typeName, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			paramType = &ast.TypeReference{
				Name:     typeName.Name,
				Position: typeName.Pos(),
				EndPos:   typeName.End(),
			}
		}

		param := &ast.Parameter{
			ID:        id,
			ParamType: paramType,
			Position:  id.Pos(),
			EndPos:    p.currentPos(),
		}

		params = append(params, param)

		p.skipWhitespaceAndComments()
		if p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()
		}
	}

	return params, nil
}

func (p *parser) parseImportDeclaration() (*ast.ImportDeclaration, error) {
	startPos := p.currentPos()

	p.consumeKeyword("import")
	p.skipWhitespaceAndComments()

	// Check for "import type" (TypeScript type-only imports)
	if p.matchKeyword("type") {
		p.consumeKeyword("type")
		p.skipWhitespaceAndComments()
	}

	var specifiers []ast.ImportSpecifier

	// Handle different import styles
	if p.match("*") {
		// import * as name from "module"
		p.advance() // consume '*'
		p.skipWhitespaceAndComments()

		if !p.matchKeyword("as") {
			return nil, fmt.Errorf("expected 'as' after '*' in import")
		}
		p.advance() // consume 'as'
		p.skipWhitespaceAndComments()

		local, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		specifiers = append(specifiers, ast.ImportSpecifier{
			Local:    local,
			Position: startPos,
			EndPos:   p.currentPos(),
		})

		p.skipWhitespaceAndComments()
	} else if p.match("*") {
		// import * as name from "module" (namespace import)
		p.advance() // consume '*'
		p.skipWhitespaceAndComments()

		if !p.matchKeyword("as") {
			return nil, fmt.Errorf("expected 'as' after '*' in namespace import")
		}
		p.advanceWord() // consume 'as'
		p.skipWhitespaceAndComments()

		local, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		specifiers = append(specifiers, ast.ImportSpecifier{
			Local:    local,
			Position: startPos,
			EndPos:   p.currentPos(),
		})

		p.skipWhitespaceAndComments()
	} else if p.match("{") {
		// import { name1, name2 } from "module"
		p.advance() // consume '{'
		p.skipWhitespaceAndComments()

		iterations := 0
		for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			imported, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			local := imported // by default, local name is the same as imported

			p.skipWhitespaceAndComments()
			if p.matchKeyword("as") {
				p.advance() // consume 'as'
				p.skipWhitespaceAndComments()

				local, err = p.parseIdentifier()
				if err != nil {
					return nil, err
				}

				p.skipWhitespaceAndComments()
			}

			specifiers = append(specifiers, ast.ImportSpecifier{
				Imported: imported,
				Local:    local,
				Position: imported.Pos(),
				EndPos:   p.currentPos(),
			})

			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			}
		}

		if !p.match("}") {
			return nil, fmt.Errorf("expected '}' after import specifiers")
		}
		p.advance() // consume '}'
		p.skipWhitespaceAndComments()
	} else {
		// import name from "module" (default import)
		local, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		specifiers = append(specifiers, ast.ImportSpecifier{
			Local:    local,
			Position: startPos,
			EndPos:   p.currentPos(),
		})

		p.skipWhitespaceAndComments()
	}

	// Handle 'from' clause - consume 'from' keyword
	if !p.matchKeyword("from") {
		return nil, fmt.Errorf("expected 'from' in import declaration")
	}
	p.advanceWord() // consume 'from'

	// Parse module source - ensure we skip whitespace first
	p.skipWhitespaceAndComments()

	if p.pos >= len(p.source) {
		return nil, fmt.Errorf("unexpected end of input, expected module specifier")
	}

	// Parse the string literal
	source, err := p.parseStringLiteral()
	if err != nil {
		return nil, fmt.Errorf("expected module specifier in import")
	}

	// Optional semicolon
	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.ImportDeclaration{
		Specifiers: specifiers,
		Source: &ast.Literal{
			Value:    source[1 : len(source)-1], // remove quotes
			Raw:      source,
			Position: startPos,
			EndPos:   p.currentPos(),
		},
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseExportDeclaration() (*ast.ExportDeclaration, error) {
	startPos := p.currentPos()

	p.consumeKeyword("export")
	p.skipWhitespaceAndComments()

	// Handle export default
	if p.matchKeyword("default") {
		p.advance() // consume 'default'
		p.skipWhitespaceAndComments()

		// Parse the default export value
		var declaration ast.Statement

		if p.matchKeyword("function") {
			funcDecl, err := p.parseFunctionDeclaration()
			if err != nil {
				return nil, err
			}
			declaration = funcDecl
		} else if p.matchKeyword("var", "let", "const") {
			varDecl, err := p.parseVariableDeclaration()
			if err != nil {
				return nil, err
			}
			declaration = varDecl
		} else {
			// Expression as default export
			expr, err := p.parseExpression()
			if err != nil {
				return nil, err
			}

			declaration = &ast.ExpressionStatement{
				Expression: expr,
				Position:   expr.Pos(),
				EndPos:     p.currentPos(),
			}
		}

		// Optional semicolon
		p.skipWhitespaceAndComments()
		if p.match(";") {
			p.advance()
		}

		return &ast.ExportDeclaration{
			Declaration: declaration,
			Position:    startPos,
			EndPos:      p.currentPos(),
		}, nil
	}

	// Handle export { name1, name2 }
	if p.match("{") {
		p.advance() // consume '{'
		p.skipWhitespaceAndComments()

		var specifiers []ast.ExportSpecifier

		iterations := 0
		for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			local, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			exported := local // by default, exported name is the same as local

			p.skipWhitespaceAndComments()
			if p.matchKeyword("as") {
				p.advance() // consume 'as'
				p.skipWhitespaceAndComments()

				exported, err = p.parseIdentifier()
				if err != nil {
					return nil, err
				}

				p.skipWhitespaceAndComments()
			}

			specifiers = append(specifiers, ast.ExportSpecifier{
				Local:    local,
				Exported: exported,
				Position: local.Pos(),
				EndPos:   p.currentPos(),
			})

			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			}
		}

		if !p.match("}") {
			return nil, fmt.Errorf("expected '}' after export specifiers")
		}
		p.advance() // consume '}'
		p.skipWhitespaceAndComments()

		// Handle 'from' clause for re-exports
		var source *ast.Literal
		if p.matchKeyword("from") {
			p.advance() // consume 'from'
			p.skipWhitespaceAndComments()

			sourceStr, err := p.parseStringLiteral()
			if err != nil {
				return nil, fmt.Errorf("expected module specifier in export")
			}

			source = &ast.Literal{
				Value:    sourceStr[1 : len(sourceStr)-1], // remove quotes
				Raw:      sourceStr,
				Position: startPos,
				EndPos:   p.currentPos(),
			}
		}

		// Optional semicolon
		p.skipWhitespaceAndComments()
		if p.match(";") {
			p.advance()
		}

		return &ast.ExportDeclaration{
			Specifiers: specifiers,
			Source:     source,
			Position:   startPos,
			EndPos:     p.currentPos(),
		}, nil
	}

	// Handle export of declarations (function, class, etc.)
	if p.matchKeyword("function") {
		// For exported functions, we need to handle both named and default exports
		funcDecl, err := p.parseFunctionDeclaration()
		if err != nil {
			return nil, err
		}

		return &ast.ExportDeclaration{
			Declaration: funcDecl,
			Position:    startPos,
			EndPos:      p.currentPos(),
		}, nil
	}

	if p.matchKeyword("var", "let", "const") {
		varDecl, err := p.parseVariableDeclaration()
		if err != nil {
			return nil, err
		}

		return &ast.ExportDeclaration{
			Declaration: varDecl,
			Position:    startPos,
			EndPos:      p.currentPos(),
		}, nil
	}

	return nil, fmt.Errorf("unexpected token after 'export'")
}

// Helper functions
func (p *parser) currentPos() ast.Position {
	return ast.Position{
		Line:   p.line,
		Column: p.column,
		Offset: p.pos,
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

func (p *parser) advance() string {
	if p.isAtEnd() {
		return ""
	}

	char := p.source[p.pos]
	p.pos++

	if char == '\n' {
		p.line++
		p.column = 1
	} else {
		p.column++
	}

	return string(char)
}

func (p *parser) peek(offset int) string {
	pos := p.pos + offset
	if pos >= len(p.source) {
		return ""
	}
	return string(p.source[pos])
}

func (p *parser) match(expected string) bool {
	return p.peekString(len(expected)) == expected
}

func (p *parser) matchKeyword(keywords ...string) bool {
	if p.isAtEnd() {
		return false
	}

	word := p.peekWord()
	for _, keyword := range keywords {
		if word == keyword {
			return true
		}
	}
	return false
}

func (p *parser) matchIdentifier() bool {
	if p.isAtEnd() {
		return false
	}

	char := p.source[p.pos]
	// Identificadores pueden empezar con letras (incluyendo Unicode), $ o _
	if isLetter(char) || char == '_' || char == '$' {
		return true
	}
	// Si es un byte alto (>= 0x80), podría ser inicio de carácter Unicode
	if char >= 0x80 {
		// Intentar decodificar como UTF-8
		r, _ := utf8.DecodeRuneInString(p.source[p.pos:])
		return r != utf8.RuneError && (unicode.IsLetter(r) || r == '_' || r == '$')
	}
	return false
}

func (p *parser) matchNumber() bool {
	if p.isAtEnd() {
		return false
	}

	char := p.source[p.pos]
	return isDigit(char)
}

func (p *parser) matchString() bool {
	if p.isAtEnd() {
		return false
	}

	char := p.source[p.pos]
	return char == '"' || char == '\'' || char == '`'
}

func (p *parser) peekWord() string {
	start := p.pos
	for !p.isAtEnd() {
		char := p.source[p.pos]
		// Caracteres ASCII válidos
		if isLetter(char) || isDigit(char) || char == '_' || char == '$' {
			p.pos++
			continue
		}
		// Caracteres Unicode
		if char >= 0x80 {
			r, size := utf8.DecodeRuneInString(p.source[p.pos:])
			if r != utf8.RuneError && (unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_') {
				p.pos += size
				continue
			}
		}
		break
	}

	word := p.source[start:p.pos]
	p.pos = start // Reset position

	return word
}

func (p *parser) peekString(length int) string {
	if p.pos+length > len(p.source) {
		return ""
	}
	return p.source[p.pos : p.pos+length]
}

func (p *parser) consumeKeyword(keywords ...string) string {
	if !p.matchKeyword(keywords...) {
		panic(fmt.Sprintf("expected keyword %v", keywords))
	}
	return p.advanceWord()
}

func (p *parser) expect(expected string) {
	if !p.match(expected) {
		panic(fmt.Sprintf("expected '%s' at %s", expected, p.currentPos()))
	}
	p.advanceString(len(expected))
}

func (p *parser) advanceWord() string {
	var word strings.Builder
	for !p.isAtEnd() {
		char := p.source[p.pos]
		// Caracteres ASCII válidos en identificadores
		if isLetter(char) || isDigit(char) || char == '_' || char == '$' {
			word.WriteByte(char)
			p.advance()
			continue
		}
		// Caracteres Unicode (multibyte)
		if char >= 0x80 {
			r, size := utf8.DecodeRuneInString(p.source[p.pos:])
			if r != utf8.RuneError && (unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_') {
				word.WriteRune(r)
				// Avanzar size bytes
				for i := 0; i < size; i++ {
					p.advance()
				}
				continue
			}
		}
		break
	}
	return word.String()
}

func (p *parser) advanceString(length int) {
	for i := 0; i < length; i++ {
		p.advance()
	}
}

func (p *parser) advanceNumber() string {
	var num strings.Builder
	for !p.isAtEnd() && (isDigit(p.source[p.pos]) || p.source[p.pos] == '.') {
		num.WriteByte(p.source[p.pos])
		p.advance()
	}
	return num.String()
}

func (p *parser) advanceStringLiteral() string {
	var str strings.Builder
	quote := p.source[p.pos]
	str.WriteByte(quote)
	p.advance() // Consume opening quote

	// For template strings (backticks), we need special handling
	isTemplate := quote == '`'

	for !p.isAtEnd() && p.source[p.pos] != quote {
		if p.source[p.pos] == '\\' && !p.isAtEnd() {
			str.WriteByte(p.source[p.pos]) // Write backslash
			p.advance()
			if !p.isAtEnd() {
				str.WriteByte(p.source[p.pos]) // Write escaped character
				p.advance()
			}
		} else if isTemplate && p.source[p.pos] == '$' && p.peek(1) == "{" {
			// Handle template interpolation ${...}
			// For now, just include it as-is in the string
			str.WriteByte(p.source[p.pos])
			p.advance()
			if !p.isAtEnd() && p.source[p.pos] == '{' {
				str.WriteByte(p.source[p.pos])
				p.advance()

				// Find matching closing brace
				braceCount := 1
				for !p.isAtEnd() && braceCount > 0 {
					if p.source[p.pos] == '{' {
						braceCount++
					} else if p.source[p.pos] == '}' {
						braceCount--
					}
					str.WriteByte(p.source[p.pos])
					p.advance()
				}
			}
		} else {
			str.WriteByte(p.source[p.pos])
			p.advance()
		}
	}

	if !p.isAtEnd() {
		str.WriteByte(p.source[p.pos]) // Closing quote
		p.advance()
	}

	return str.String()
}

func (p *parser) skipWhitespaceAndComments() {
	iterations := 0
	for !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		char := p.source[p.pos]

		if char == ' ' || char == '\t' || char == '\r' || char == '\n' {
			p.advance()
			continue
		}

		// Single-line comment
		if char == '/' && p.pos+1 < len(p.source) && p.source[p.pos+1] == '/' {
			p.advance()
			p.advance()
			for !p.isAtEnd() && p.source[p.pos] != '\n' {
				p.advance()
			}
			continue
		}

		// Multi-line comment (including JSDoc)
		if char == '/' && p.pos+1 < len(p.source) && p.source[p.pos+1] == '*' {
			p.advance()
			p.advance()
			commentIter := 0
			for !p.isAtEnd() && commentIter < maxParserIterations {
				commentIter++
				if p.source[p.pos] == '*' && p.pos+1 < len(p.source) && p.source[p.pos+1] == '/' {
					p.advance()
					p.advance()
					break // Exit the inner for loop
				}
				p.advance()
			}
			continue
		}

		break // No whitespace or comment found
	}
}

func isLetter(char byte) bool {
	// Soporte básico ASCII más $
	if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char == '$' || char == '_' {
		return true
	}
	// Para Unicode, necesitamos convertir a rune
	if char >= 0x80 { // Caracteres multibyte UTF-8
		return true
	}
	return false
}

func isDigit(char byte) bool {
	return char >= '0' && char <= '9'
}

// parseStringLiteral parses a string literal
func (p *parser) parseStringLiteral() (string, error) {
	p.skipWhitespaceAndComments()

	if p.pos >= len(p.source) {
		return "", fmt.Errorf("unexpected end of input, expected string literal")
	}

	start := p.pos

	// Check for single or double quotes
	if p.match("\"") || p.match("'") {
		quote := p.source[p.pos]
		p.advance() // consume opening quote

		// Find the closing quote
		for p.pos < len(p.source) && p.source[p.pos] != quote {
			if p.source[p.pos] == '\\' {
				p.advance() // skip escape character
				if p.pos < len(p.source) {
					p.advance() // skip escaped character
				}
			} else {
				p.advance()
			}
		}

		if p.pos >= len(p.source) {
			return "", fmt.Errorf("unterminated string literal")
		}

		p.advance() // consume closing quote
		return p.source[start:p.pos], nil
	}

	return "", fmt.Errorf("expected string literal")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// parseTryStatement parses try-catch-finally statements
func (p *parser) parseTryStatement() (ast.Statement, error) {
	startPos := p.currentPos()

	// Consume 'try'
	p.advanceWord()
	p.skipWhitespaceAndComments()

	// Parse try block (required)
	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' after 'try' at %s", p.currentPos())
	}

	tryBlock, err := p.parseBlockStatement()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	var handler *ast.CatchClause
	var finalizer *ast.BlockStatement

	// Parse catch clause (optional)
	if p.matchKeyword("catch") {
		catchStartPos := p.currentPos()
		p.advanceWord()
		p.skipWhitespaceAndComments()

		var param *ast.Identifier

		// Parse catch parameter (optional in modern JavaScript/TypeScript)
		if p.match("(") {
			p.advance()
			p.skipWhitespaceAndComments()

			if !p.match(")") {
				// Parse parameter name
				paramName := p.advanceWord()
				if paramName == "" {
					return nil, fmt.Errorf("expected parameter name in catch clause at %s", p.currentPos())
				}

				param = &ast.Identifier{
					Name:     paramName,
					Position: p.currentPos(),
					EndPos:   p.currentPos(),
				}

				// Skip optional type annotation for catch parameter
				p.skipWhitespaceAndComments()
				if p.match(":") {
					p.advance()
					p.skipTypeAnnotation()
				}

				p.skipWhitespaceAndComments()
			}

			if !p.match(")") {
				return nil, fmt.Errorf("expected ')' after catch parameter at %s", p.currentPos())
			}
			p.advance()
			p.skipWhitespaceAndComments()
		}

		// Parse catch block (required)
		if !p.match("{") {
			return nil, fmt.Errorf("expected '{' after catch clause at %s", p.currentPos())
		}

		catchBlock, err := p.parseBlockStatement()
		if err != nil {
			return nil, err
		}

		handler = &ast.CatchClause{
			Param:    param,
			Body:     catchBlock,
			Position: catchStartPos,
			EndPos:   catchBlock.End(),
		}

		p.skipWhitespaceAndComments()
	}

	// Parse finally block (optional)
	if p.matchKeyword("finally") {
		p.advanceWord()
		p.skipWhitespaceAndComments()

		if !p.match("{") {
			return nil, fmt.Errorf("expected '{' after 'finally' at %s", p.currentPos())
		}

		finalizerBlock, err := p.parseBlockStatement()
		if err != nil {
			return nil, err
		}

		finalizer = finalizerBlock
	}

	// At least one of catch or finally must be present
	if handler == nil && finalizer == nil {
		return nil, fmt.Errorf("missing catch or finally after try at %s", startPos)
	}

	endPos := p.currentPos()
	if finalizer != nil {
		endPos = finalizer.End()
	} else if handler != nil {
		endPos = handler.End()
	} else {
		endPos = tryBlock.End()
	}

	return &ast.TryStatement{
		Block:     tryBlock,
		Handler:   handler,
		Finalizer: finalizer,
		Position:  startPos,
		EndPos:    endPos,
	}, nil
}

// parseThrowStatement parses throw statements
func (p *parser) parseThrowStatement() (ast.Statement, error) {
	startPos := p.currentPos()

	// Consume 'throw'
	p.advanceWord()

	// Note: In JavaScript/TypeScript, there must be no line terminator between 'throw' and its expression
	// For simplicity, we'll just skip whitespace but not newlines for now
	// In a production parser, you'd need to track if you crossed a newline

	p.skipWhitespaceAndComments()

	// Parse the expression to throw
	expr, err := p.parseExpression()
	if err != nil {
		return nil, err
	}

	if expr == nil {
		return nil, fmt.Errorf("expected expression after 'throw' at %s", p.currentPos())
	}

	// Optional semicolon
	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.ThrowStatement{
		Argument: expr,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseArrayLiteral parses an array literal [1, 2, 3]
func (p *parser) parseArrayLiteral() (*ast.ArrayExpression, error) {
	startPos := p.currentPos()

	p.expect("[")
	p.skipWhitespaceAndComments()

	var elements []ast.Expression

	iterations := 0
	for !p.match("]") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		elem, err := p.parseExpression()
		if err != nil {
			return nil, err
		}

		if elem != nil {
			elements = append(elements, elem)
		}

		p.skipWhitespaceAndComments()
		if p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()
			// Allow trailing comma
			if p.match("]") {
				break
			}
		} else if !p.match("]") {
			return nil, fmt.Errorf("expected ',' or ']' in array literal")
		}
	}

	if !p.match("]") {
		return nil, fmt.Errorf("expected ']' to close array literal")
	}
	p.advance()

	return &ast.ArrayExpression{
		Elements: elements,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseObjectLiteral() (*ast.ObjectExpression, error) {
	startPos := p.currentPos()

	p.expect("{")
	p.skipWhitespaceAndComments()

	var properties []ast.ObjectPropertyNode

	iterations := 0
	for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		propStartPos := p.currentPos()

		// Check for spread property: ...identifier
		if p.match("...") {
			p.advanceString(3)
			p.skipWhitespaceAndComments()

			argument, err := p.parseAssignmentExpression()
			if err != nil {
				return nil, err
			}

			spread := &ast.SpreadElement{
				Argument: argument,
				Position: propStartPos,
				EndPos:   p.currentPos(),
			}
			properties = append(properties, spread)
		} else {
			// Check for async modifier (for method shorthand) BEFORE parsing key
			isAsync := false
			if p.matchKeyword("async") {
				isAsync = true
				p.advanceWord()
				p.skipWhitespaceAndComments()
			}

			// Check for getter/setter (ES5: get prop() {} or set prop(value) {})
			isGetter := false
			isSetter := false
			if p.matchKeyword("get") {
				isGetter = true
				p.advanceWord()
				p.skipWhitespaceAndComments()
			} else if p.matchKeyword("set") {
				isSetter = true
				p.advanceWord()
				p.skipWhitespaceAndComments()
			}

			// Regular property
			var key ast.Expression
			var err error

			// Check for computed property: [expression]
			if p.match("[") {
				p.advance() // consume '['
				p.skipWhitespaceAndComments()

				// Parse the computed key expression
				key, err = p.parseExpression()
				if err != nil {
					return nil, err
				}

				p.skipWhitespaceAndComments()
				if !p.match("]") {
					return nil, fmt.Errorf("expected ']' after computed property key at %s", p.currentPos())
				}
				p.advance() // consume ']'
			} else if p.matchString() {
				str := p.advanceStringLiteral()
				key = &ast.Literal{
					Value:    str[1 : len(str)-1],
					Raw:      str,
					Position: propStartPos,
					EndPos:   p.currentPos(),
				}
			} else if p.matchIdentifier() {
				key, err = p.parseIdentifier()
				if err != nil {
					return nil, err
				}
			} else {
				return nil, fmt.Errorf("expected property key or '...' at %s", p.currentPos())
			}

			p.skipWhitespaceAndComments()

			// Check for method shorthand (ES6: method() {} or async method() {} instead of method: function() {})
			// Also handles getters and setters
			var value ast.Expression
			if p.match("(") {
				// Method shorthand: key() { body } or async key() { body }
				// Or getter: get key() { body }
				// Or setter: set key(value) { body }
				// Parse as a function expression
				p.advance() // consume "("
				p.skipWhitespaceAndComments()

				// Parse parameters using the same logic as parseParameterList
				var params []*ast.Parameter
				paramIterations := 0
				for !p.match(")") && !p.isAtEnd() && paramIterations < maxParserIterations {
					paramIterations++
					p.skipWhitespaceAndComments()

					// Check for destructuring patterns
					if p.match("{") || p.match("[") {
						paramStartPos := p.currentPos()
						openChar := p.source[p.pos]
						closeChar := byte('}')
						isObjectPattern := openChar == '{'
						if openChar == '[' {
							closeChar = ']'
						}

						p.advance() // consume opening { or [
						p.skipWhitespaceAndComments()

						// Extract parameter names from the destructuring pattern
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

						p.skipWhitespaceAndComments()

						// Parse type annotation if present
						var paramType ast.TypeNode
						if p.match(":") {
							p.advance()
							p.skipWhitespaceAndComments()
							paramType, err = p.parseTypeAnnotation()
							if err != nil {
								return nil, err
							}
							p.skipWhitespaceAndComments()
						}

						// Create a parameter for each extracted name
						if len(extractedNames) > 0 {
							for _, name := range extractedNames {
								if name != "" {
									paramId := &ast.Identifier{
										Name:     name,
										Position: paramStartPos,
										EndPos:   p.currentPos(),
									}
									params = append(params, &ast.Parameter{
										ID:        paramId,
										ParamType: paramType,
										Optional:  false,
										Position:  paramStartPos,
										EndPos:    p.currentPos(),
									})
								}
							}
						} else {
							// Fallback: create placeholder if no names were extracted
							paramId := &ast.Identifier{
								Name:     "destructured_param",
								Position: paramStartPos,
								EndPos:   p.currentPos(),
							}
							params = append(params, &ast.Parameter{
								ID:        paramId,
								ParamType: paramType,
								Optional:  false,
								Position:  paramStartPos,
								EndPos:    p.currentPos(),
							})
						}
					} else {
						// Regular parameter
						param, err := p.parseParameter()
						if err != nil {
							return nil, err
						}
						params = append(params, param)
					}

					p.skipWhitespaceAndComments()
					if p.match(",") {
						p.advance()
						p.skipWhitespaceAndComments()
					} else if !p.match(")") {
						return nil, fmt.Errorf("expected ',' or ')' in parameter list at %s", p.currentPos())
					}
				}

				// Validate getter/setter parameter counts
				if isGetter && len(params) > 0 {
					return nil, fmt.Errorf("getter should not have parameters at %s", p.currentPos())
				}
				if isSetter && len(params) != 1 {
					return nil, fmt.Errorf("setter must have exactly one parameter at %s", p.currentPos())
				}

				if !p.match(")") {
					return nil, fmt.Errorf("expected ')' after parameters at %s", p.currentPos())
				}
				p.advance()
				p.skipWhitespaceAndComments()

				// Parse function body
				if !p.match("{") {
					return nil, fmt.Errorf("expected '{' for method body at %s", p.currentPos())
				}

				body, err := p.parseBlockStatement()
				if err != nil {
					return nil, err
				}

				// Create a function expression (getters/setters are treated as regular functions for now)
				value = &ast.ArrowFunctionExpression{
					Params:   params,
					Body:     body,
					Async:    isAsync,
					Position: propStartPos,
					EndPos:   p.currentPos(),
				}
			} else if isAsync || isGetter || isSetter {
				// If we saw 'async', 'get', or 'set' but no '(', it's an error
				return nil, fmt.Errorf("expected '(' after modifier keyword in method shorthand at %s", p.currentPos())
			} else if p.match(":") {
				// Regular property: key: value
				p.advance() // consume ":"
				p.skipWhitespaceAndComments()

				value, err = p.parseAssignmentExpression()
				if err != nil {
					return nil, err
				}
			} else {
				// Shorthand property: {key} means {key: key}
				// The key must be an identifier for this to work
				if ident, ok := key.(*ast.Identifier); ok {
					value = ident
				} else {
					return nil, fmt.Errorf("shorthand property must be an identifier at %s", p.currentPos())
				}
			}

			prop := &ast.Property{
				Key:      key,
				Value:    value,
				Position: propStartPos,
				EndPos:   p.currentPos(),
			}
			properties = append(properties, prop)
		}

		p.skipWhitespaceAndComments()
		if p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()
			// Allow trailing comma
			if p.match("}") {
				break
			}
		} else if !p.match("}") {
			return nil, fmt.Errorf("expected ',' or '}' in object literal at %s", p.currentPos())
		}
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' to close object literal at %s", p.currentPos())
	}
	p.advance()

	return &ast.ObjectExpression{
		Properties: properties,
		Position:   startPos,
		EndPos:     p.currentPos(),
	}, nil
}

// parseArrowFunction parses an arrow function expression
func (p *parser) parseArrowFunction() (*ast.ArrowFunctionExpression, error) {
	startPos := p.currentPos()

	var params []*ast.Parameter
	isAsync := false

	// Check for async keyword
	if p.matchKeyword("async") {
		isAsync = true
		p.advanceWord()
		p.skipWhitespaceAndComments()
	}

	// Check for generic type parameters <T, U>
	if p.match("<") {
		// Try to parse type parameters
		savedPos := p.pos
		p.advance()
		p.skipWhitespaceAndComments()

		// Simple heuristic: if we see identifier followed by extends, comma, or >
		// then it's likely a type parameter
		if p.matchIdentifier() {
			// Skip type parameters for now - just consume them
			depth := 1
			for depth > 0 && !p.isAtEnd() {
				if p.match("<") {
					depth++
					p.advance()
				} else if p.match(">") {
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
		} else {
			// Not type parameters, restore position
			p.pos = savedPos
		}
	}

	// Parse parameters
	if p.match("(") {
		p.advance()
		p.skipWhitespaceAndComments()

		// Parse parameter list
		iterations := 0
		for !p.match(")") && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			p.skipWhitespaceAndComments()
			// Handle object destructuring - extract individual names
			if p.match("{") || p.match("[") {
				startPos := p.currentPos()
				openChar := p.source[p.pos]
				closeChar := byte('}')
				isObjectPattern := openChar == '{'
				if openChar == '[' {
					closeChar = ']'
				}

				p.advance() // consume opening { or [
				p.skipWhitespaceAndComments()

				// Extract parameter names from the destructuring pattern
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

				p.skipWhitespaceAndComments()

				// Parse type annotation if present
				var paramType ast.TypeNode
				if p.match(":") {
					p.advance()
					p.skipWhitespaceAndComments()
					var err error
					paramType, err = p.parseTypeAnnotation()
					if err != nil {
						return nil, err
					}
					p.skipWhitespaceAndComments()
				}

				// Create a parameter for each extracted name
				if len(extractedNames) > 0 {
					for _, name := range extractedNames {
						if name != "" {
							paramId := &ast.Identifier{
								Name:     name,
								Position: startPos,
								EndPos:   p.currentPos(),
							}
							params = append(params, &ast.Parameter{
								ID:        paramId,
								ParamType: paramType,
								Optional:  false,
								Position:  startPos,
								EndPos:    p.currentPos(),
							})
						}
					}
				} else {
					// Fallback: create placeholder if no names were extracted
					param := &ast.Parameter{
						ID:       &ast.Identifier{Name: "destructured_param", Position: startPos, EndPos: p.currentPos()},
						Position: startPos,
						EndPos:   p.currentPos(),
					}
					params = append(params, param)
				}
				p.skipWhitespaceAndComments()
				if p.match(",") {
					p.advance()
					p.skipWhitespaceAndComments()
				}
				continue
			}

			// HACK: Handle array destructuring as a placeholder (e.g., [name, value])
			if p.match("[") {
				startPos := p.currentPos()
				p.advance()
				depth := 1
				for depth > 0 && !p.isAtEnd() {
					if p.match("[") {
						depth++
					} else if p.match("]") {
						depth--
					}
					p.advance()
				}
				param := &ast.Parameter{
					ID:       &ast.Identifier{Name: "destructured_array_param", Position: startPos, EndPos: p.currentPos()},
					Position: startPos,
					EndPos:   p.currentPos(),
				}
				params = append(params, param)
				p.skipWhitespaceAndComments()
				if p.match(",") {
					p.advance()
					p.skipWhitespaceAndComments()
				}
				continue
			}

			id, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			// Handle optional type annotation
			var paramType ast.TypeNode
			p.skipWhitespaceAndComments()
			if p.match(":") {
				p.advance()
				p.skipWhitespaceAndComments()

				// Parse type annotation using the full parser
				paramType, err = p.parseTypeAnnotationFull()
				if err != nil {
					return nil, err
				}
			}

			p.skipWhitespaceAndComments()

			// Handle default value
			if p.match("=") {
				p.advance()
				p.skipWhitespaceAndComments()
				// Parse but don't store default value for now
				_, err = p.parseAssignmentExpression()
				if err != nil {
					return nil, err
				}
			}

			param := &ast.Parameter{
				ID:        id,
				ParamType: paramType,
				Position:  id.Pos(),
				EndPos:    p.currentPos(),
			}

			params = append(params, param)

			p.skipWhitespaceAndComments()
			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			}
		}

		if !p.match(")") {
			return nil, fmt.Errorf("expected ')' after arrow function parameters")
		}
		p.advance()
	} else if p.matchIdentifier() {
		// Single parameter without parentheses
		id, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		param := &ast.Parameter{
			ID:       id,
			Position: id.Pos(),
			EndPos:   id.End(),
		}

		params = append(params, param)
	}

	p.skipWhitespaceAndComments()

	// Check for return type annotation (: Type)
	if p.match(":") {
		p.advance()
		p.skipWhitespaceAndComments()
		// Parse and skip the return type annotation for now
		_, err := p.parseTypeAnnotationFull()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()
	}

	// Expect =>
	if !p.match("=") || p.peek(1) != ">" {
		return nil, fmt.Errorf("expected '=>' in arrow function")
	}
	p.advance() // =
	p.advance() // >
	p.skipWhitespaceAndComments()

	// Parse body (can be expression or block)
	var body ast.Node
	var err error

	if p.match("{") {
		// Block body
		body, err = p.parseBlockStatement()
		if err != nil {
			return nil, err
		}
	} else {
		// Expression body
		expr, err := p.parseExpression()
		if err != nil {
			return nil, err
		}
		body = expr
	}

	return &ast.ArrowFunctionExpression{
		Params:   params,
		Body:     body,
		Async:    isAsync,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseTypeAnnotation parses a TypeScript type annotation
func (p *parser) parseTypeAnnotation() (ast.TypeNode, error) {
	// Parse the primary type
	primaryType, err := p.parseTypePrimaryNode()
	if err != nil {
		return nil, err
	}

	// Check for union or intersection types (| or &)
	p.skipWhitespaceAndComments()
	if p.match("|") || p.match("&") {
		// We have a union/intersection type - just consume it and return simplified
		for p.match("|") || p.match("&") {
			p.advance()
			p.skipWhitespaceAndComments()
			// Parse the next type
			_, err := p.parseTypePrimaryNode()
			if err != nil {
				return nil, err
			}
			p.skipWhitespaceAndComments()
		}
		// Return the primary type (unions are not fully represented in AST yet)
		return primaryType, nil
	}

	return primaryType, nil
}

// parseTypePrimaryNode parses a single type (without unions/intersections)
func (p *parser) parseTypePrimaryNode() (ast.TypeNode, error) {
	startPos := p.currentPos()

	// Parse object types (e.g., { prop: Type })
	if p.match("{") {
		// For now, just skip the object type and return a placeholder
		p.advance()
		depth := 1
		iterations := 0
		for depth > 0 && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			if p.match("{") {
				depth++
			} else if p.match("}") {
				depth--
			}
			p.advance()
		}
		return &ast.TypeReference{
			Name:     "{ ... }", // Placeholder for object type
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Parse string literal types (e.g., 'id' | 'name')
	if p.matchString() {
		str := p.advanceStringLiteral()
		return &ast.TypeReference{
			Name:     str, // Store the full string literal with quotes
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Parse simple type reference (e.g., string, number, MyType)
	if p.matchIdentifier() {
		typeName := p.advanceWord()

		// Special handling for 'infer' keyword
		if typeName == "infer" {
			p.skipWhitespaceAndComments()
			if p.matchIdentifier() {
				inferredName := p.advanceWord()
				return &ast.TypeReference{
					Name:     "infer " + inferredName,
					Position: startPos,
					EndPos:   p.currentPos(),
				}, nil
			}
			// If no identifier follows, treat as regular type reference
		}

		// Check for generic type arguments (e.g., Record<string, string>)
		var typeArguments []ast.TypeNode
		p.skipWhitespaceAndComments()
		if p.match("<") {
			p.advance()
			p.skipWhitespaceAndComments()

			// Parse type arguments
			for {
				typeArg, err := p.parseTypeAnnotation()
				if err != nil {
					return nil, err
				}
				typeArguments = append(typeArguments, typeArg)

				p.skipWhitespaceAndComments()
				if p.match(",") {
					p.advance()
					p.skipWhitespaceAndComments()
				} else {
					break
				}
			}

			p.skipWhitespaceAndComments()
			if !p.match(">") {
				return nil, fmt.Errorf("expected '>' after type arguments")
			}
			p.advance()
		}

		typeRef := &ast.TypeReference{
			Name:          typeName,
			TypeArguments: typeArguments,
			Position:      startPos,
			EndPos:        p.currentPos(),
		}

		// Check for array type suffix [] or indexed access type T[K]
		p.skipWhitespaceAndComments()
		if p.match("[") {
			// Save position for potential backtracking
			bracketStartPos := p.pos
			p.advance()
			p.skipWhitespaceAndComments()

			// Check if this is an array type (empty brackets) or indexed access type (has content)
			if p.match("]") {
				// Array type like string[]
				p.advance()
				return &ast.TypeReference{
					Name:     typeName + "[]",
					Position: startPos,
					EndPos:   p.currentPos(),
				}, nil
			} else {
				// Indexed access type like Person['name'] - backtrack and let parseTypeAnnotationFull handle it
				p.pos = bracketStartPos // Reset to before the '['
			}
		}

		return typeRef, nil
	}

	return nil, fmt.Errorf("expected type annotation at %s", p.currentPos())
}

// skipTypeAnnotation skips over a type annotation without parsing it
func (p *parser) skipTypeAnnotation() {
	p.skipTypePrimary()

	// Handle union types (|) and intersection types (&)
	iterations := 0
	for (p.match("|") || p.match("&")) && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		p.advance()
		p.skipWhitespaceAndComments()
		p.skipTypePrimary()
	}

	// Handle array types: Type[] or Type[][]
	for p.match("[") && p.peek(1) == "]" && iterations < maxParserIterations {
		iterations++
		p.advance() // [
		p.advance() // ]
		p.skipWhitespaceAndComments()
	}
}

func (p *parser) skipTypePrimary() {
	iterations := 0

	// Object type: { prop: Type; prop2: Type }
	if p.match("{") {
		p.advance()
		depth := 1
		for depth > 0 && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			if p.match("{") {
				depth++
			} else if p.match("}") {
				depth--
			}
			p.advance()
		}
		p.skipWhitespaceAndComments()
		return
	}

	// Tuple or array type: [Type, Type] or Type[]
	if p.match("[") {
		p.advance()
		depth := 1
		for depth > 0 && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			if p.match("[") {
				depth++
			} else if p.match("]") {
				depth--
			}
			p.advance()
		}
		p.skipWhitespaceAndComments()
		return
	}

	// Function type: (arg: Type) => ReturnType
	if p.match("(") {
		// Look for => pattern
		tempPos := p.pos
		p.advance() // (
		depth := 1
		for depth > 0 && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			if p.match("(") {
				depth++
			} else if p.match(")") {
				depth--
			}
			p.advance()
		}
		p.skipWhitespaceAndComments()
		if p.match("=") && p.peek(1) == ">" {
			// It's a function type
			p.advance() // =
			p.advance() // >
			p.skipWhitespaceAndComments()
			p.skipTypeAnnotation() // Recurse for return type
			return
		}
		// Not a function type, restore
		p.pos = tempPos
	}

	// Identifier (possibly with generics)
	if p.matchIdentifier() {
		word := p.advanceWord()
		p.skipWhitespaceAndComments()

		// Special handling for 'infer' keyword - skip the inferred type name
		if word == "infer" {
			if p.matchIdentifier() {
				p.advanceWord()
				p.skipWhitespaceAndComments()
			}
			return
		}

		// Handle generic type arguments <T, U>
		if p.match("<") {
			p.advance()
			depth := 1
			for depth > 0 && !p.isAtEnd() && iterations < maxParserIterations {
				iterations++
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
		}
	}
}

// parseTypeAliasDeclaration parses a type alias declaration (type Name = Type)
func (p *parser) parseTypeAliasDeclaration() (*ast.TypeAliasDeclaration, error) {
	startPos := p.currentPos()

	p.consumeKeyword("type")
	p.skipWhitespaceAndComments()

	// Parse type name
	id, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Parse type parameters if present (e.g., <T, U>)
	var typeParameters []ast.TypeNode
	if p.match("<") {
		p.advance()
		p.skipWhitespaceAndComments()

		for !p.match(">") && !p.isAtEnd() {
			typeParam, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}
			typeParameters = append(typeParameters, &ast.TypeReference{
				Name:     typeParam.Name,
				Position: typeParam.Pos(),
				EndPos:   typeParam.End(),
			})

			p.skipWhitespaceAndComments()
			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			}
		}

		if !p.match(">") {
			return nil, fmt.Errorf("expected '>' after type parameters")
		}
		p.advance()
		p.skipWhitespaceAndComments()
	}

	// Expect =
	if !p.match("=") {
		return nil, fmt.Errorf("expected '=' in type alias declaration")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	// Parse type annotation
	typeAnnotation, err := p.parseTypeAnnotationFull()
	if err != nil {
		return nil, err
	}

	// Optional semicolon
	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.TypeAliasDeclaration{
		ID:             id,
		TypeAnnotation: typeAnnotation,
		TypeParameters: typeParameters,
		Position:       startPos,
		EndPos:         p.currentPos(),
	}, nil
}

// parseInterfaceDeclaration parses an interface declaration
func (p *parser) parseInterfaceDeclaration() (*ast.InterfaceDeclaration, error) {
	startPos := p.currentPos()

	p.consumeKeyword("interface")
	p.skipWhitespaceAndComments()

	// Parse interface name
	id, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Parse type parameters if present
	var typeParameters []ast.TypeNode
	if p.match("<") {
		p.advance()
		p.skipWhitespaceAndComments()

		iterations := 0
		for !p.match(">") && !p.isAtEnd() && iterations < maxParserIterations {
			iterations++
			typeParam, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}
			typeParameters = append(typeParameters, &ast.TypeReference{
				Name:     typeParam.Name,
				Position: typeParam.Pos(),
				EndPos:   typeParam.End(),
			})

			p.skipWhitespaceAndComments()
			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			}
		}

		if !p.match(">") {
			return nil, fmt.Errorf("expected '>' after type parameters")
		}
		p.advance()
		p.skipWhitespaceAndComments()
	}

	// Parse extends clause if present
	var extends []ast.TypeNode
	if p.matchKeyword("extends") {
		p.consumeKeyword("extends")
		p.skipWhitespaceAndComments()

		for {
			extendType, err := p.parseTypeAnnotation()
			if err != nil {
				return nil, err
			}
			extends = append(extends, extendType)

			p.skipWhitespaceAndComments()
			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			} else {
				break
			}
		}
	}

	// Parse body
	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' in interface declaration")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	var body []ast.InterfaceProperty
	iterations := 0
	for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		// Parse property or method signature
		key, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		p.skipWhitespaceAndComments()

		// Check if it's a method signature (has < for generics or ( for params)
		if p.match("<") || p.match("(") {
			// Parse method signature

			// Parse type parameters if present
			var methodTypeParams []ast.TypeNode
			if p.match("<") {
				p.advance()
				p.skipWhitespaceAndComments()

				paramIterations := 0
				for !p.match(">") && !p.isAtEnd() && paramIterations < maxParserIterations {
					paramIterations++

					// Parse type parameter name
					typeParam, err := p.parseIdentifier()
					if err != nil {
						return nil, err
					}

					p.skipWhitespaceAndComments()

					// Parse extends constraint if present
					if p.matchKeyword("extends") {
						p.consumeKeyword("extends")
						p.skipWhitespaceAndComments()

						// Parse the constraint type (can be complex like "keyof HTMLElementTagNameMap")
						// We need to consume tokens until we hit , or > or =
						constraintDepth := 0
						for !p.isAtEnd() {
							if p.match("<") {
								constraintDepth++
								p.advance()
							} else if p.match(">") {
								if constraintDepth == 0 {
									break
								}
								constraintDepth--
								p.advance()
							} else if (p.match(",") || p.match("=")) && constraintDepth == 0 {
								break
							} else {
								p.advance()
							}
							p.skipWhitespaceAndComments()
						}
					}

					p.skipWhitespaceAndComments()

					// Parse default type if present (e.g., = Element)
					if p.match("=") {
						p.advance()
						p.skipWhitespaceAndComments()

						// Consume default type until we hit , or >
						defaultDepth := 0
						for !p.isAtEnd() {
							if p.match("<") {
								defaultDepth++
								p.advance()
							} else if p.match(">") {
								if defaultDepth == 0 {
									break
								}
								defaultDepth--
								p.advance()
							} else if p.match(",") && defaultDepth == 0 {
								break
							} else {
								p.advance()
							}
							p.skipWhitespaceAndComments()
						}
					}

					methodTypeParams = append(methodTypeParams, &ast.TypeReference{
						Name:     typeParam.Name,
						Position: typeParam.Pos(),
						EndPos:   typeParam.End(),
					})

					p.skipWhitespaceAndComments()
					if p.match(",") {
						p.advance()
						p.skipWhitespaceAndComments()
					}
				}

				if !p.match(">") {
					return nil, fmt.Errorf("expected '>' after method type parameters")
				}
				p.advance()
				p.skipWhitespaceAndComments()
			}

			// Parse method parameters
			if !p.match("(") {
				return nil, fmt.Errorf("expected '(' for method parameters")
			}
			p.advance()
			p.skipWhitespaceAndComments()

			// Skip method parameters (we're just parsing structure, not full semantics)
			paramDepth := 1
			for paramDepth > 0 && !p.isAtEnd() {
				if p.match("(") {
					paramDepth++
					p.advance()
				} else if p.match(")") {
					paramDepth--
					p.advance()
				} else {
					p.advance()
				}
				p.skipWhitespaceAndComments()
			}

			p.skipWhitespaceAndComments()

			// Parse return type after :
			if p.match(":") {
				p.advance()
				p.skipWhitespaceAndComments()

				// Skip the entire return type (can be very complex with indexed access, unions, etc.)
				// We'll consume tokens until we hit ; or , or } at depth 0
				depth := 0
				for !p.isAtEnd() {
					if p.match("<") || p.match("[") || p.match("{") || p.match("(") {
						depth++
						p.advance()
					} else if p.match(">") || p.match("]") || p.match("}") || p.match(")") {
						if depth > 0 {
							depth--
						}
						p.advance()
					} else if (p.match(";") || p.match(",")) && depth == 0 {
						break
					} else if p.match("}") && depth == 0 {
						// End of interface body
						break
					} else {
						p.advance()
					}
					p.skipWhitespaceAndComments()
				}
			}

			// Add as a property with function type (simplified representation)
			body = append(body, ast.InterfaceProperty{
				Key:      key,
				Value:    &ast.TypeReference{Name: "Function", Position: key.Pos(), EndPos: p.currentPos()},
				Optional: false,
				Position: key.Pos(),
				EndPos:   p.currentPos(),
			})

		} else {
			// Parse property signature

			// Check for optional marker
			optional := false
			if p.match("?") {
				optional = true
				p.advance()
				p.skipWhitespaceAndComments()
			}

			// Expect :
			if !p.match(":") {
				return nil, fmt.Errorf("expected ':' after property name in interface")
			}
			p.advance()
			p.skipWhitespaceAndComments()

			// Parse property type
			propType, err := p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}

			body = append(body, ast.InterfaceProperty{
				Key:      key,
				Value:    propType,
				Optional: optional,
				Position: key.Pos(),
				EndPos:   p.currentPos(),
			})
		}

		p.skipWhitespaceAndComments()

		// Optional semicolon or comma
		if p.match(";") || p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()
		}
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' at end of interface")
	}
	p.advance()

	return &ast.InterfaceDeclaration{
		ID:             id,
		Body:           body,
		Extends:        extends,
		TypeParameters: typeParameters,
		Position:       startPos,
		EndPos:         p.currentPos(),
	}, nil
}

// parseDeclareStatement parses a declare statement (for .d.ts files)
func (p *parser) parseDeclareStatement() (ast.Statement, error) {
	startPos := p.currentPos()
	p.consumeKeyword("declare")
	p.skipWhitespaceAndComments()

	// Check what's being declared
	if p.matchKeyword("module") {
		return p.parseDeclareModule(startPos)
	}

	if p.matchKeyword("namespace") {
		return p.parseDeclareNamespace(startPos)
	}

	if p.matchKeyword("global") {
		return p.parseDeclareGlobal(startPos)
	}

	// declare var/let/const
	if p.matchKeyword("var", "let", "const") {
		return p.parseVariableDeclaration()
	}

	// declare function
	if p.matchKeyword("function") {
		return p.parseFunctionDeclaration()
	}

	// declare class
	if p.matchKeyword("class") {
		return p.parseClassDeclaration()
	}

	// declare interface
	if p.matchKeyword("interface") {
		return p.parseInterfaceDeclaration()
	}

	// declare type
	if p.matchKeyword("type") {
		return p.parseTypeAliasDeclaration()
	}

	return nil, fmt.Errorf("unexpected token after 'declare' keyword")
}

// parseDeclareModule parses: declare module 'name' { ... }
func (p *parser) parseDeclareModule(startPos ast.Position) (ast.Statement, error) {
	p.consumeKeyword("module")
	p.skipWhitespaceAndComments()

	// Parse module name (string literal)
	var moduleName string
	if p.match("'") || p.match("\"") {
		quote := p.current()
		p.advance()
		nameStart := p.pos
		for !p.match(quote) && !p.isAtEnd() {
			p.advance()
		}
		moduleName = p.source[nameStart:p.pos]
		p.expect(quote)
	} else {
		// Could be an identifier for namespace-style module
		id, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}
		moduleName = id.Name
	}

	// Use moduleName to avoid unused variable warning (could be used for metadata later)
	_ = moduleName

	p.skipWhitespaceAndComments()

	// Parse module body
	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' after module name")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	var body []ast.Statement
	iterations := 0
	for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		stmt, err := p.parseStatement()
		if err != nil {
			// Skip to next statement on error
			for !p.match(";") && !p.match("}") && !p.isAtEnd() {
				p.advance()
			}
			if p.match(";") {
				p.advance()
			}
			continue
		}
		if stmt != nil {
			body = append(body, stmt)
		}
		p.skipWhitespaceAndComments()
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' at end of declare module")
	}
	p.advance()

	// Return as a block statement (simplified representation)
	return &ast.BlockStatement{
		Body:     body,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseDeclareNamespace parses: declare namespace Name { ... }
func (p *parser) parseDeclareNamespace(startPos ast.Position) (ast.Statement, error) {
	p.consumeKeyword("namespace")
	p.skipWhitespaceAndComments()

	// Parse namespace name
	_, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Parse namespace body
	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' after namespace name")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	var body []ast.Statement
	iterations := 0
	for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		stmt, err := p.parseStatement()
		if err != nil {
			// Skip to next statement on error
			for !p.match(";") && !p.match("}") && !p.isAtEnd() {
				p.advance()
			}
			if p.match(";") {
				p.advance()
			}
			continue
		}
		if stmt != nil {
			body = append(body, stmt)
		}
		p.skipWhitespaceAndComments()
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' at end of namespace")
	}
	p.advance()

	return &ast.BlockStatement{
		Body:     body,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseDeclareGlobal parses: declare global { ... }
func (p *parser) parseDeclareGlobal(startPos ast.Position) (ast.Statement, error) {
	p.consumeKeyword("global")
	p.skipWhitespaceAndComments()

	// Parse global body
	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' after 'global'")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	var body []ast.Statement
	iterations := 0
	for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		stmt, err := p.parseStatement()
		if err != nil {
			// Skip to next statement on error
			for !p.match(";") && !p.match("}") && !p.isAtEnd() {
				p.advance()
			}
			if p.match(";") {
				p.advance()
			}
			continue
		}
		if stmt != nil {
			body = append(body, stmt)
		}
		p.skipWhitespaceAndComments()
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' at end of declare global")
	}
	p.advance()

	return &ast.BlockStatement{
		Body:     body,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseBreakStatement parses: break [label];
func (p *parser) parseBreakStatement() (*ast.BreakStatement, error) {
	startPos := p.currentPos()
	p.consumeKeyword("break")
	p.skipWhitespaceAndComments()

	var label *ast.Identifier
	// Check for optional label
	if p.matchIdentifier() && !p.match(";") && !p.match("\n") {
		var err error
		label, err = p.parseIdentifier()
		if err != nil {
			return nil, err
		}
	}

	p.skipWhitespaceAndComments()
	// Optional semicolon
	if p.match(";") {
		p.advance()
	}

	return &ast.BreakStatement{
		Label:    label,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseContinueStatement parses: continue [label];
func (p *parser) parseContinueStatement() (*ast.ContinueStatement, error) {
	startPos := p.currentPos()
	p.consumeKeyword("continue")
	p.skipWhitespaceAndComments()

	var label *ast.Identifier
	// Check for optional label
	if p.matchIdentifier() && !p.match(";") && !p.match("\n") {
		var err error
		label, err = p.parseIdentifier()
		if err != nil {
			return nil, err
		}
	}

	p.skipWhitespaceAndComments()
	// Optional semicolon
	if p.match(";") {
		p.advance()
	}

	return &ast.ContinueStatement{
		Label:    label,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseTypeAnnotationFull parses a complete type annotation including unions and intersections
func (p *parser) parseTypeAnnotationFull() (ast.TypeNode, error) {
	startPos := p.currentPos()

	// Parse first type
	firstType, err := p.parseTypeAnnotationPrimary()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Check for conditional type: T extends U ? X : Y or T extends infer U ? X : Y
	// Only parse as conditional if we see "extends" followed by "?" or "infer"
	if p.match("extends") {
		savedPos := p.pos
		p.advanceString(7)
		p.skipWhitespaceAndComments()

		var extendsType ast.TypeNode
		var inferredType *ast.Identifier
		var err error

		// Check for infer keyword
		if p.matchKeyword("infer") {
			p.advanceWord()
			p.skipWhitespaceAndComments()

			inferredType, err = p.parseIdentifier()
			if err != nil {
				p.pos = savedPos
				return firstType, nil
			}
			// When infer is present, there is no extends type
		} else {
			extendsType, err = p.parseTypeAnnotationPrimary()
			if err != nil {
				p.pos = savedPos
				return firstType, nil
			}
		}

		p.skipWhitespaceAndComments()

		// Check if this is actually a conditional type (has ?)
		if p.match("?") {
			p.advance()
			p.skipWhitespaceAndComments()

			trueType, err := p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}

			p.skipWhitespaceAndComments()
			if !p.match(":") {
				return nil, fmt.Errorf("expected ':' in conditional type")
			}
			p.advance()
			p.skipWhitespaceAndComments()

			falseType, err := p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}

			return &ast.ConditionalType{
				CheckType:    firstType,
				ExtendsType:  extendsType,
				InferredType: inferredType,
				TrueType:     trueType,
				FalseType:    falseType,
				Position:     startPos,
				EndPos:       p.currentPos(),
			}, nil
		} else {
			// Not a conditional type, restore position
			p.pos = savedPos
		}
	}

	// Check for array type suffix [] or indexed access type: T[K]
	if p.match("[") {
		p.advance()
		p.skipWhitespaceAndComments()

		// Check if this is an array type (empty brackets) or indexed access type
		if p.match("]") {
			// Array type like (infer U)[] or string[]
			p.advance()

			// Convert firstType to array type by wrapping it
			return &ast.TypeReference{
				Name:          "(array)",
				TypeArguments: []ast.TypeNode{firstType},
				Position:      startPos,
				EndPos:        p.currentPos(),
			}, nil
		} else {
			// Indexed access type T[K]
			indexType, err := p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}

			p.skipWhitespaceAndComments()
			if !p.match("]") {
				return nil, fmt.Errorf("expected ']' in indexed access type")
			}
			p.advance()

			return &ast.IndexedAccessType{
				ObjectType: firstType,
				IndexType:  indexType,
				Position:   startPos,
				EndPos:     p.currentPos(),
			}, nil
		}
	}

	// Check for union (|) or intersection (&)
	if p.match("|") {
		// Union type
		types := []ast.TypeNode{firstType}

		for p.match("|") {
			p.advance()
			p.skipWhitespaceAndComments()

			nextType, err := p.parseTypeAnnotationPrimary()
			if err != nil {
				return nil, err
			}
			types = append(types, nextType)
			p.skipWhitespaceAndComments()
		}

		return &ast.UnionType{
			Types:    types,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	if p.match("&") {
		// Intersection type
		types := []ast.TypeNode{firstType}

		for p.match("&") {
			p.advance()
			p.skipWhitespaceAndComments()

			nextType, err := p.parseTypeAnnotationPrimary()
			if err != nil {
				return nil, err
			}
			types = append(types, nextType)
			p.skipWhitespaceAndComments()
		}

		return &ast.IntersectionType{
			Types:    types,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	return firstType, nil
}

// parseTypeAnnotationPrimary parses a primary type (identifier, literal, etc.)
func (p *parser) parseTypeAnnotationPrimary() (ast.TypeNode, error) {
	startPos := p.currentPos()

	// Template literal type `prefix${T}suffix`
	if p.match("`") {
		return p.parseTemplateLiteralType()
	}

	// Mapped type or object type { [K in T]: U } or { key: Type }
	if p.match("{") {
		savedPos := p.pos
		p.advance()
		p.skipWhitespaceAndComments()

		// Check for mapped type: { [K in T]: U }
		if p.match("[") {
			p.advance()
			p.skipWhitespaceAndComments()

			if p.matchIdentifier() {
				typeParam, err := p.parseIdentifier()
				if err != nil {
					return nil, err
				}

				p.skipWhitespaceAndComments()
				if p.match("in") {
					p.advanceString(2)
					p.skipWhitespaceAndComments()

					// This is a mapped type
					constraint, err := p.parseTypeAnnotationFull()
					if err != nil {
						return nil, err
					}

					p.skipWhitespaceAndComments()
					if !p.match("]") {
						return nil, fmt.Errorf("expected ']' in mapped type")
					}
					p.advance()

					p.skipWhitespaceAndComments()

					// Check for optional modifier ?
					optional := false
					if p.match("?") {
						optional = true
						p.advance()
						p.skipWhitespaceAndComments()
					}

					if !p.match(":") {
						return nil, fmt.Errorf("expected ':' in mapped type")
					}
					p.advance()
					p.skipWhitespaceAndComments()

					mappedType, err := p.parseTypeAnnotationFull()
					if err != nil {
						return nil, err
					}

					p.skipWhitespaceAndComments()
					if !p.match("}") {
						return nil, fmt.Errorf("expected '}' in mapped type")
					}
					p.advance()

					return &ast.MappedType{
						TypeParameter: typeParam,
						Constraint:    constraint,
						MappedType:    mappedType,
						Optional:      optional,
						Position:      startPos,
						EndPos:        p.currentPos(),
					}, nil
				}
			}
		}

		// Not a mapped type, restore and parse as object type
		p.pos = savedPos
		// For now, just skip object types
		depth := 1
		p.advance()
		for depth > 0 && !p.isAtEnd() {
			if p.match("{") {
				depth++
				p.advance()
			} else if p.match("}") {
				depth--
				p.advance()
			} else {
				p.advance()
			}
		}
		return &ast.TypeReference{
			Name:     "object",
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// String literal type ('foo')
	if p.matchString() {
		str, err := p.parseStringLiteral()
		if err != nil {
			return nil, err
		}
		return &ast.LiteralType{
			Value:    str,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Number literal type (42)
	if p.matchNumber() {
		num := p.advanceNumber()
		return &ast.LiteralType{
			Value:    num,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// keyof operator
	if p.match("keyof") {
		p.advanceString(5)
		p.skipWhitespaceAndComments()

		operand, err := p.parseTypeAnnotationPrimary()
		if err != nil {
			return nil, err
		}

		// Return a type reference with "keyof" prefix
		return &ast.TypeReference{
			Name:     "keyof " + operand.(*ast.TypeReference).Name,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Identifier or generic type
	if p.matchIdentifier() {
		return p.parseTypePrimaryNode()
	}

	// Function type or parenthesized type
	if p.match("(") {
		savedPos := p.pos
		p.advance()
		p.skipWhitespaceAndComments()

		// Check if it's a function type () => Type or (param: Type) => Type
		// vs parenthesized type (Type)
		isFunctionType := false

		// Empty params () => ...
		if p.match(")") {
			p.advance()
			p.skipWhitespaceAndComments()
			if p.match("=") && p.peek(1) == ">" {
				isFunctionType = true
				p.pos = savedPos // Reset to start
			}
		} else {
			// Check for rest parameters (...args)
			if p.match(".") && p.peek(1) == "." && p.peek(2) == "." {
				isFunctionType = true
				p.pos = savedPos // Reset to start
			} else if p.matchIdentifier() {
				// Check for parameter with type annotation
				p.advanceWord()
				p.skipWhitespaceAndComments()
				if p.match(":") || p.match("?") || p.match(",") {
					// Looks like function parameters
					isFunctionType = true
				}
				p.pos = savedPos // Reset to start
			} else {
				p.pos = savedPos // Reset to start
			}
		}

		if isFunctionType {
			// Parse as function type - for now just skip to =>
			p.advance() // consume (
			depth := 1
			for depth > 0 && !p.isAtEnd() {
				if p.match("(") {
					depth++
				} else if p.match(")") {
					depth--
				}
				p.advance()
			}
			p.skipWhitespaceAndComments()
			// Skip => and return type
			if p.match("=") && p.peek(1) == ">" {
				p.advanceString(2)
				p.skipWhitespaceAndComments()
				p.skipTypeAnnotation()
			}
			// Return placeholder type
			return &ast.TypeReference{
				Name:     "Function",
				Position: startPos,
				EndPos:   p.currentPos(),
			}, nil
		}

		// Parenthesized type (Type) - parse as primary to avoid recursion
		// Advance past the '(' before parsing the inner type
		p.advance()
		p.skipWhitespaceAndComments()

		innerType, err := p.parseTypeAnnotationPrimary()
		if err != nil {
			return nil, err
		}

		p.skipWhitespaceAndComments()
		if !p.match(")") {
			return nil, fmt.Errorf("expected ')' after type")
		}
		p.advance()

		return innerType, nil
	}

	return nil, fmt.Errorf("expected type annotation at %s", p.currentPos())
}

// parseTemplateLiteralType parses a template literal type `prefix${T}suffix`
func (p *parser) parseTemplateLiteralType() (ast.TypeNode, error) {
	startPos := p.currentPos()

	if !p.match("`") {
		return nil, fmt.Errorf("expected '`' at start of template literal type")
	}
	p.advance()

	var parts []string
	var types []ast.TypeNode
	currentPart := ""

	iterations := 0
	for !p.match("`") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		if p.match("$") && p.peek(1) == "{" {
			// Save current part
			parts = append(parts, currentPart)
			currentPart = ""

			// Skip ${
			p.advance()
			p.advance()
			p.skipWhitespaceAndComments()

			// Parse type
			typ, err := p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}
			types = append(types, typ)

			p.skipWhitespaceAndComments()
			if !p.match("}") {
				return nil, fmt.Errorf("expected '}' in template literal type")
			}
			p.advance()
		} else {
			currentPart += string(p.current())
			p.advance()
		}
	}

	// Add final part
	parts = append(parts, currentPart)

	if !p.match("`") {
		return nil, fmt.Errorf("expected '`' at end of template literal type")
	}
	p.advance()

	return &ast.TemplateLiteralType{
		Parts:    parts,
		Types:    types,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseClassDeclaration parses a class declaration
func (p *parser) parseClassDeclaration() (*ast.ClassDeclaration, error) {
	startPos := p.currentPos()

	// Consume 'class'
	p.advanceWord()
	p.skipWhitespaceAndComments()

	// Parse class name
	if !p.matchIdentifier() {
		return nil, fmt.Errorf("expected class name")
	}
	className, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Parse type parameters if present
	var typeParameters []ast.TypeNode
	if p.match("<") {
		// Skip type parameters for now - just consume them
		depth := 1
		p.advance()
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
	}

	// Parse extends clause if present
	var superClass *ast.Identifier
	if p.matchKeyword("extends") {
		p.advanceWord()
		p.skipWhitespaceAndComments()

		if !p.matchIdentifier() {
			return nil, fmt.Errorf("expected superclass name after 'extends'")
		}
		superClass, err = p.parseIdentifier()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()
	}

	// Parse class body
	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' after class name")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	var members []ast.ClassMember

	iterations := 0
	for !p.match("}") && !p.isAtEnd() && iterations < maxParserIterations {
		iterations++
		member, err := p.parseClassMember()
		if err != nil {
			return nil, err
		}
		if member != nil {
			members = append(members, member)
		}
		p.skipWhitespaceAndComments()
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' at end of class body")
	}
	p.advance()

	return &ast.ClassDeclaration{
		ID:             className,
		SuperClass:     superClass,
		Body:           members,
		TypeParameters: typeParameters,
		Position:       startPos,
		EndPos:         p.currentPos(),
	}, nil
}

// parseClassMember parses a class member (method or property)
func (p *parser) parseClassMember() (ast.ClassMember, error) {
	startPos := p.currentPos()
	p.skipWhitespaceAndComments()

	// Parse access modifier
	accessModifier := ""
	if p.matchKeyword("public", "private", "protected") {
		accessModifier = p.advanceWord()
		p.skipWhitespaceAndComments()
	}

	// Parse static keyword
	isStatic := false
	if p.matchKeyword("static") {
		isStatic = true
		p.advanceWord()
		p.skipWhitespaceAndComments()
	}

	// Parse readonly keyword
	isReadonly := false
	if p.matchKeyword("readonly") {
		isReadonly = true
		p.advanceWord()
		p.skipWhitespaceAndComments()
	}

	// Parse async keyword
	isAsync := false
	if p.matchKeyword("async") {
		isAsync = true
		p.advanceWord()
		p.skipWhitespaceAndComments()
	}

	// Parse member name
	if !p.matchIdentifier() {
		// Could be a semicolon or other token, skip it
		if p.match(";") {
			p.advance()
		}
		return nil, nil
	}

	memberName, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Check if it's a method (has parentheses) or property
	if p.match("(") {
		// It's a method
		return p.parseMethodDefinition(memberName, accessModifier, isStatic, isAsync, startPos)
	} else {
		// It's a property
		return p.parsePropertyDefinition(memberName, accessModifier, isStatic, isReadonly, startPos)
	}
}

// parseMethodDefinition parses a method definition
func (p *parser) parseMethodDefinition(name *ast.Identifier, accessModifier string, isStatic bool, isAsync bool, startPos ast.Position) (*ast.MethodDefinition, error) {
	// Parse parameters
	p.advance() // consume '('
	p.skipWhitespaceAndComments()

	var params []*ast.Parameter
	for !p.match(")") && !p.isAtEnd() {
		param, err := p.parseParameter()
		if err != nil {
			return nil, err
		}
		params = append(params, param)

		p.skipWhitespaceAndComments()
		if p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()
		}
	}

	if !p.match(")") {
		return nil, fmt.Errorf("expected ')' after parameters")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	// Parse return type annotation if present
	if p.match(":") {
		p.advance()
		p.skipWhitespaceAndComments()
		// Skip return type for now
		p.skipTypeAnnotation()
		p.skipWhitespaceAndComments()
	}

	// Parse method body
	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' for method body")
	}

	body, err := p.parseBlockStatement()
	if err != nil {
		return nil, err
	}

	// Determine method kind
	kind := "method"
	if name.Name == "constructor" {
		kind = "constructor"
	}

	funcExpr := &ast.FunctionExpression{
		ID:       name,
		Params:   params,
		Body:     body,
		Async:    isAsync,
		Position: startPos,
		EndPos:   p.currentPos(),
	}

	return &ast.MethodDefinition{
		Key:            name,
		Value:          funcExpr,
		Kind:           kind,
		Static:         isStatic,
		Async:          isAsync,
		AccessModifier: accessModifier,
		Position:       startPos,
		EndPos:         p.currentPos(),
	}, nil
}

// parsePropertyDefinition parses a property definition
func (p *parser) parsePropertyDefinition(name *ast.Identifier, accessModifier string, isStatic bool, isReadonly bool, startPos ast.Position) (*ast.PropertyDefinition, error) {
	// Parse optional marker
	isOptional := false
	if p.match("?") {
		isOptional = true
		p.advance()
		p.skipWhitespaceAndComments()
	}

	// Parse type annotation if present
	var typeAnnotation ast.TypeNode
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

	// Parse initializer if present
	var initializer ast.Expression
	if p.match("=") {
		p.advance()
		p.skipWhitespaceAndComments()
		var err error
		initializer, err = p.parseExpression()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()
	}

	// Optional semicolon
	if p.match(";") {
		p.advance()
	}

	return &ast.PropertyDefinition{
		Key:            name,
		Value:          initializer,
		TypeAnnotation: typeAnnotation,
		Static:         isStatic,
		Readonly:       isReadonly,
		Optional:       isOptional,
		AccessModifier: accessModifier,
		Position:       startPos,
		EndPos:         p.currentPos(),
	}, nil
}

// parseParameter parses a function parameter
func (p *parser) parseParameter() (*ast.Parameter, error) {
	startPos := p.currentPos()

	// Check for rest parameter: ...identifier
	if p.match("...") {
		p.advanceString(3)
		p.skipWhitespaceAndComments()
	}

	var paramName *ast.Identifier
	var err error

	// Check for destructuring patterns
	if p.match("{") || p.match("[") {
		// Handle destructuring pattern - for now return placeholder
		// The actual extraction will happen in parseParameterList or parseArrowFunction
		// This function returns a single Parameter, so we return a placeholder
		// The proper handling requires returning multiple parameters which this function doesn't support
		openChar := p.source[p.pos]
		closeChar := byte('}')
		if openChar == '[' {
			closeChar = ']'
		}

		p.advance() // consume opening { or [
		depth := 1
		maxIter := 10000
		iter := 0

		for depth > 0 && !p.isAtEnd() && iter < maxIter {
			iter++

			// Skip strings to avoid confusion
			if p.source[p.pos] == '"' || p.source[p.pos] == '\'' || p.source[p.pos] == '`' {
				quote := p.source[p.pos]
				p.advance()
				for !p.isAtEnd() && p.source[p.pos] != quote {
					if p.source[p.pos] == '\\' {
						p.advance() // skip escape
						if !p.isAtEnd() {
							p.advance() // skip escaped char
						}
					} else {
						p.advance()
					}
				}
				if !p.isAtEnd() {
					p.advance() // consume closing quote
				}
				continue
			}

			if p.source[p.pos] == openChar {
				depth++
			} else if p.source[p.pos] == closeChar {
				depth--
			}
			p.advance()
		}

		// Create placeholder identifier
		paramName = &ast.Identifier{
			Name:     "destructured_param",
			Position: startPos,
			EndPos:   p.currentPos(),
		}
	} else {
		// Parse parameter name
		if !p.matchIdentifier() {
			return nil, fmt.Errorf("expected parameter name")
		}

		paramName, err = p.parseIdentifier()
		if err != nil {
			return nil, err
		}
	}

	p.skipWhitespaceAndComments()

	// Parse optional marker
	isOptional := false
	if p.match("?") {
		isOptional = true
		p.advance()
		p.skipWhitespaceAndComments()
	}

	// Parse type annotation if present
	var paramType ast.TypeNode
	if p.match(":") {
		p.advance()
		p.skipWhitespaceAndComments()
		paramType, err = p.parseTypeAnnotation()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()
	}

	// Parse default value if present
	if p.match("=") {
		p.advance()
		p.skipWhitespaceAndComments()
		// Skip the default value expression for now
		// TODO: Parse and store default value in AST
		_, err = p.parseAssignmentExpression()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()
	}

	return &ast.Parameter{
		ID:        paramName,
		ParamType: paramType,
		Optional:  isOptional,
		Position:  startPos,
		EndPos:    p.currentPos(),
	}, nil
}

// parseNewExpression parses a new expression (new Class())
func (p *parser) parseNewExpression() (*ast.NewExpression, error) {
	startPos := p.currentPos()

	// Consume 'new'
	p.advanceWord()
	p.skipWhitespaceAndComments()

	// Parse the constructor (callee)
	// For new expressions, handle identifiers that may have generics like Map<number, string>
	var callee ast.Expression
	var err error
	if p.matchIdentifier() {
		callee, err = p.parseIdentifierWithGenerics()
	} else {
		callee, err = p.parsePrimaryExpression()
	}
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Parse arguments if present
	var arguments []ast.Expression
	if p.match("(") {
		p.advance()
		p.skipWhitespaceAndComments()

		for !p.match(")") && !p.isAtEnd() {
			arg, err := p.parseExpression()
			if err != nil {
				return nil, err
			}
			arguments = append(arguments, arg)

			p.skipWhitespaceAndComments()
			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			}
		}

		if !p.match(")") {
			return nil, fmt.Errorf("expected ')' after arguments")
		}
		p.advance()
	}

	return &ast.NewExpression{
		Callee:    callee,
		Arguments: arguments,
		Position:  startPos,
		EndPos:    p.currentPos(),
	}, nil
}
