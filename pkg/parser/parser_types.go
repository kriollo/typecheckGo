package parser

import (
	"fmt"
	"tstypechecker/pkg/ast"
)

// parseTypeAnnotationFull parses a complete type annotation including unions and intersections
func (p *parser) parseTypeAnnotationFull() (ast.TypeNode, error) {
	startPos := p.currentPos()

	// Skip leading | or & (allowed in TypeScript)
	if p.match("|") || p.match("&") {
		p.advance()
		p.skipWhitespaceAndComments()
	}

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
			_ = indexType // Suppress unused error

			p.skipWhitespaceAndComments()
			if !p.match("]") {
				return nil, fmt.Errorf("expected ']' in indexed access type")
			}
			p.advance()

			// TODO: Return IndexedAccessType
			// For now return TypeReference
			return &ast.TypeReference{
				Name: "(indexed)",
				// TypeArguments: []ast.TypeNode{firstType, indexType},
				Position: startPos,
				EndPos:   p.currentPos(),
			}, nil
		}
	}

	// Check for union | or intersection &
	if p.match("|") {
		p.advance()
		p.skipWhitespaceAndComments()

		right, err := p.parseTypeAnnotationFull()
		if err != nil {
			return nil, err
		}

		return &ast.UnionType{
			Types:    []ast.TypeNode{firstType, right},
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	if p.match("&") {
		p.advance()
		p.skipWhitespaceAndComments()

		right, err := p.parseTypeAnnotationFull()
		if err != nil {
			return nil, err
		}

		return &ast.IntersectionType{
			Types:    []ast.TypeNode{firstType, right},
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	return firstType, nil
}

func (p *parser) skipTypeAnnotation() {
	_, _ = p.parseTypeAnnotationFull() // Ignore errors when skipping type annotations
}

func (p *parser) parseBreakStatement() (ast.Statement, error) {
	startPos := p.currentPos()
	p.expect("break")
	p.skipWhitespaceAndComments()

	var label *ast.Identifier
	if p.matchIdentifier() {
		l, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}
		label = l
	}

	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.BreakStatement{
		Label:    label,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseContinueStatement() (ast.Statement, error) {
	startPos := p.currentPos()
	p.expect("continue")
	p.skipWhitespaceAndComments()

	var label *ast.Identifier
	if p.matchIdentifier() {
		l, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}
		label = l
	}

	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.ContinueStatement{
		Label:    label,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}

func (p *parser) parseDeclareStatement() (ast.Statement, error) {
	startPos := p.currentPos()
	// Skip declare keyword
	p.advanceString(7)
	p.skipWhitespaceAndComments()

	// Check if this is a module declaration: declare module 'name' { ... }
	if p.matchKeyword("module") {
		p.advanceWord() // consume 'module'
		p.skipWhitespaceAndComments()

		// Parse module name (string literal)
		var moduleName string
		if p.match("'") || p.match("\"") {
			quote := p.source[p.pos]
			p.advance() // consume opening quote

			nameStart := p.pos
			for !p.isAtEnd() && p.source[p.pos] != quote {
				p.advance()
			}
			moduleName = p.source[nameStart:p.pos]

			if !p.match(string(quote)) {
				return nil, fmt.Errorf("expected closing quote for module name")
			}
			p.advance() // consume closing quote
		} else {
			return nil, fmt.Errorf("expected string literal for module name")
		}

		p.skipWhitespaceAndComments()

		// Parse module body
		if !p.match("{") {
			return nil, fmt.Errorf("expected '{' in module declaration")
		}

		// Skip the entire module body
		depth := 1
		p.advance() // consume '{'
		for depth > 0 && !p.isAtEnd() {
			if p.match("{") {
				depth++
			} else if p.match("}") {
				depth--
			}
			p.advance()
		}

		return &ast.ModuleDeclaration{
			Name:     moduleName,
			Body:     []ast.Statement{}, // For now, we just skip the body
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Parse the actual statement (for other declare statements)
	return p.parseStatement()
}

func (p *parser) parseTypeAliasDeclaration() (ast.Declaration, error) {
	startPos := p.currentPos()
	p.expect("type")
	p.skipWhitespaceAndComments()

	id, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Generics
	// Generics
	var typeParams []ast.TypeNode
	if p.match("<") {
		p.advance() // consume <
		p.skipWhitespaceAndComments()

		for !p.match(">") && !p.isAtEnd() {
			// Parse type parameter
			// T extends U = V

			// 1. Name
			id, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}

			typeParam := &ast.TypeParameter{
				Name:     id,
				Position: id.Pos(),
			}

			p.skipWhitespaceAndComments()

			// 2. Constraint (extends)
			if p.match("extends") {
				p.advanceString(7)
				p.skipWhitespaceAndComments()
				constraint, err := p.parseTypeAnnotationFull()
				if err != nil {
					return nil, err
				}
				typeParam.Constraint = constraint
				p.skipWhitespaceAndComments()
			}

			// 3. Default ( = )
			if p.match("=") {
				p.advance()
				p.skipWhitespaceAndComments()
				def, err := p.parseTypeAnnotationFull()
				if err != nil {
					return nil, err
				}
				typeParam.Default = def
				p.skipWhitespaceAndComments()
			}

			typeParam.EndPos = p.currentPos()
			typeParams = append(typeParams, typeParam)

			if p.match(",") {
				p.advance()
				p.skipWhitespaceAndComments()
			} else {
				break
			}
		}

		if !p.match(">") {
			return nil, fmt.Errorf("expected '>' to close type parameters")
		}
		p.advance() // consume >
	}

	p.skipWhitespaceAndComments()
	if !p.match("=") {
		return nil, fmt.Errorf("expected '=' in type alias")
	}
	p.advance()
	p.skipWhitespaceAndComments()

	typ, err := p.parseTypeAnnotationFull()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()
	if p.match(";") {
		p.advance()
	}

	return &ast.TypeAliasDeclaration{
		ID:             id,
		TypeAnnotation: typ,
		TypeParameters: typeParams,
		Position:       startPos,
		EndPos:         p.currentPos(),
	}, nil
}

func (p *parser) parseInterfaceDeclaration() (ast.Declaration, error) {
	startPos := p.currentPos()
	p.expect("interface")
	p.skipWhitespaceAndComments()

	id, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Generics
	if p.match("<") {
		// Skip generics
		depth := 1
		p.advance()
		for depth > 0 && !p.isAtEnd() {
			if p.match("<") {
				depth++
			} else if p.match(">") {
				depth--
			}
			p.advance()
		}
	}

	p.skipWhitespaceAndComments()

	// Extends
	if p.match("extends") {
		p.advanceString(7)
		p.skipWhitespaceAndComments()
		// Skip extends clause
		for !p.match("{") && !p.isAtEnd() {
			p.advance()
		}
	}

	p.skipWhitespaceAndComments()

	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' in interface declaration")
	}

	// Skip body - handle nested braces and potential union types (invalid syntax but we should recover)
	depth := 1
	p.advance()
	for depth > 0 && !p.isAtEnd() {
		if p.match("{") {
			depth++
			p.advance()
		} else if p.match("}") {
			depth--
			p.advance()
			// Check if there's a union type after the closing brace (invalid syntax, but handle it)
			if depth == 0 {
				p.skipWhitespaceAndComments()
				if p.match("|") || p.match("&") {
					// Skip union/intersection type continuation (invalid for interfaces)
					// Continue until we hit a semicolon or newline
					for !p.isAtEnd() && !p.match(";") && !p.match("\n") {
						if p.match("{") {
							depth++
						} else if p.match("}") {
							depth--
							if depth < 0 {
								depth = 0
								break
							}
						}
						p.advance()
					}
					// Skip final semicolon if present
					if p.match(";") {
						p.advance()
					}
				}
			}
		} else {
			p.advance()
		}
	}

	return &ast.InterfaceDeclaration{
		ID:       id,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}
