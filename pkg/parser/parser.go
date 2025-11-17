package parser

import (
	"fmt"
	"io/ioutil"
	"strings"

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

	for !p.isAtEnd() {
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

	if p.matchKeyword("import") {
		return p.parseImportDeclaration()
	}

	if p.matchKeyword("export") {
		return p.parseExportDeclaration()
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
		ID:       name,
		Params:   params,
		Body:     body,
		Async:    false,
		Generator: false,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseVariableDeclaration() (*ast.VariableDeclaration, error) {
	startPos := p.currentPos()

	kind := p.consumeKeyword("var", "let", "const")
	p.skipWhitespaceAndComments()

	var declarators []*ast.VariableDeclarator

	for {
		id, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		var init ast.Expression
		p.skipWhitespaceAndComments()

		if p.match("=") {
			p.advance()
			p.skipWhitespaceAndComments()
			init, err = p.parseExpression()
			if err != nil {
				return nil, err
			}
		}

		declarators = append(declarators, &ast.VariableDeclarator{
			ID:       id,
			Init:     init,
			Position: id.Pos(),
			EndPos:   p.currentPos(),
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
		p.advance() // consume 'else'
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

func (p *parser) parseBlockStatement() (*ast.BlockStatement, error) {
	startPos := p.currentPos()

	p.expect("{")
	p.skipWhitespaceAndComments()

	var statements []ast.Statement

	for !p.match("}") && !p.isAtEnd() {
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
	return p.parseBinaryExpression()
}

func (p *parser) parseBinaryExpression() (ast.Expression, error) {
	left, err := p.parseCallExpression()
	if err != nil {
		return nil, err
	}

	if left == nil {
		return nil, nil
	}

	p.skipWhitespaceAndComments()

	// Handle binary operators (simple left-to-right parsing for now)
	for !p.isAtEnd() {
		var op string
		if p.match("+") {
			op = "+"
		} else if p.match("-") {
			op = "-"
		} else if p.match("*") {
			op = "*"
		} else if p.match("/") {
			op = "/"
		} else if p.match("===") {
			op = "==="
		} else if p.match("==") {
			op = "=="
		} else if p.match("!==") {
			op = "!=="
		} else if p.match("!=") {
			op = "!="
		} else if p.match("<") {
			op = "<"
		} else if p.match(">") {
			op = ">"
		} else if p.match("<=") {
			op = "<="
		} else if p.match(">=") {
			op = ">="
		} else {
			break
		}

		if op != "" {
			startPos := left.Pos()
			p.advanceString(len(op))
			p.skipWhitespaceAndComments()

			// For now, just parse the next call expression (no precedence)
			right, err := p.parseCallExpression()
			if err != nil {
				return nil, err
			}

			if right == nil {
				return nil, fmt.Errorf("expected right operand for operator %s", op)
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

	p.skipWhitespaceAndComments()

	if p.match("(") {
		startPos := left.Pos()
		p.advance()

		var args []ast.Expression

		for !p.match(")") && !p.isAtEnd() {
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

		return &ast.CallExpression{
			Callee:    left,
			Arguments: args,
			Position:  startPos,
			EndPos:    p.currentPos(),
		}, nil
	}

	return left, nil
}

func (p *parser) parseMemberExpression() (ast.Expression, error) {
	left, err := p.parsePrimaryExpression()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	if p.match(".") {
		startPos := left.Pos()
		p.advance()

		prop, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}

		return &ast.MemberExpression{
			Object:   left,
			Property: prop,
			Computed: false,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	return left, nil
}

func (p *parser) parsePrimaryExpression() (ast.Expression, error) {
	p.skipWhitespaceAndComments()

	// Handle parentheses (could be grouped expression or arrow function params)
	if p.match("(") {
		savedPos := p.pos

		// Try to parse as arrow function parameters
		p.advance()
		p.skipWhitespaceAndComments()

		// Check if this looks like arrow function params
		isArrowFunc := false
		if p.match(")") {
			// Empty params () => ...
			p.advance()
			p.skipWhitespaceAndComments()
			if p.match("=") && p.peek(1) == ">" {
				isArrowFunc = true
			}
		} else if p.matchIdentifier() {
			// Could be (x) => ... or (x, y) => ...
			// Save position and try to parse params
			tempPos := p.pos
			for !p.match(")") && !p.isAtEnd() {
				if p.matchIdentifier() {
					p.advanceWord()
					p.skipWhitespaceAndComments()
					if p.match(":") {
						// Type annotation
						p.advance()
						p.skipWhitespaceAndComments()
						// Skip type
						for !p.match(",") && !p.match(")") && !p.isAtEnd() {
							p.advance()
						}
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
			return nil, fmt.Errorf("expected ')' after expression")
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

	// Object literal - DISABLED for now to avoid conflicts with block statements
	// TODO: Implement proper disambiguation between object literals and blocks
	// if p.match("{") {
	// 	return p.parseObjectLiteral()
	// }

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

func (p *parser) parseParameterList() ([]*ast.Parameter, error) {
	var params []*ast.Parameter

	for !p.match(")") && !p.isAtEnd() {
		id, err := p.parseIdentifier()
		if err != nil {
			return nil, err
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
			ID:       id,
			ParamType: paramType,
			Position: id.Pos(),
			EndPos:   p.currentPos(),
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

		for !p.match("}") && !p.isAtEnd() {
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

		for !p.match("}") && !p.isAtEnd() {
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
	return isLetter(char) || char == '_'
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
	for !p.isAtEnd() && (isLetter(p.source[p.pos]) || isDigit(p.source[p.pos]) || p.source[p.pos] == '_') {
		p.pos++
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
	for !p.isAtEnd() && (isLetter(p.source[p.pos]) || isDigit(p.source[p.pos]) || p.source[p.pos] == '_') {
		word.WriteByte(p.source[p.pos])
		p.advance()
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
	for !p.isAtEnd() {
		char := p.source[p.pos]

		if char == ' ' || char == '\t' || char == '\r' || char == '\n' {
			p.advance()
		} else if char == '/' && p.peek(1) == "/" {
			// Single-line comment
			p.advance()
			p.advance()
			for !p.isAtEnd() && p.source[p.pos] != '\n' {
				p.advance()
			}
		} else if char == '/' && p.peek(1) == "*" {
			// Multi-line comment
			p.advance()
			p.advance()
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
	}
}

func isLetter(char byte) bool {
	return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
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

// parseArrayLiteral parses an array literal [1, 2, 3]
func (p *parser) parseArrayLiteral() (*ast.ArrayExpression, error) {
	startPos := p.currentPos()

	p.expect("[")
	p.skipWhitespaceAndComments()

	var elements []ast.Expression

	for !p.match("]") && !p.isAtEnd() {
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

// parseObjectLiteral parses an object literal { key: value }
func (p *parser) parseObjectLiteral() (*ast.ObjectExpression, error) {
	startPos := p.currentPos()

	p.expect("{")
	p.skipWhitespaceAndComments()

	var properties []ast.Property

	for !p.match("}") && !p.isAtEnd() {
		prop, err := p.parseProperty()
		if err != nil {
			return nil, err
		}

		properties = append(properties, prop)

		p.skipWhitespaceAndComments()
		if p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()
			// Allow trailing comma
			if p.match("}") {
				break
			}
		} else if !p.match("}") {
			return nil, fmt.Errorf("expected ',' or '}' in object literal")
		}
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' to close object literal")
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

	// Parse parameters
	if p.match("(") {
		p.advance()
		p.skipWhitespaceAndComments()

		// Parse parameter list
		for !p.match(")") && !p.isAtEnd() {
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

				// Parse type annotation (simplified)
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
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

// parseProperty parses an object property
func (p *parser) parseProperty() (ast.Property, error) {
	startPos := p.currentPos()

	// Parse key (identifier or string)
	var key ast.Expression
	var err error

	if p.matchString() {
		str := p.advanceStringLiteral()
		key = &ast.Literal{
			Value:    str[1 : len(str)-1],
			Raw:      str,
			Position: startPos,
			EndPos:   p.currentPos(),
		}
	} else if p.matchIdentifier() {
		key, err = p.parseIdentifier()
		if err != nil {
			return ast.Property{}, err
		}
	} else {
		return ast.Property{}, fmt.Errorf("expected property key")
	}

	p.skipWhitespaceAndComments()

	// Expect colon
	if !p.match(":") {
		return ast.Property{}, fmt.Errorf("expected ':' after property key")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	// Parse value
	value, err := p.parseExpression()
	if err != nil {
		return ast.Property{}, err
	}

	return ast.Property{
		Key:      key,
		Value:    value,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}
