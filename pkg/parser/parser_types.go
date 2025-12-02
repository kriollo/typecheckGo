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

	// Parse first type (unary)
	firstType, err := p.parseTypeAnnotationUnary()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	// Check for union type: T | U or T | U | V | ...
	if p.match("|") {
		types := []ast.TypeNode{firstType}

		// Loop to handle multiple union types
		for p.match("|") && !p.isAtEnd() {
			p.advance()
			p.skipWhitespaceAndComments()

			right, err := p.parseTypeAnnotationUnary()
			if err != nil {
				return nil, err
			}
			types = append(types, right)
			p.skipWhitespaceAndComments()
		}

		return &ast.UnionType{
			Types:    types,
			Position: startPos,
			EndPos:   p.currentPos(),
		}, nil
	}

	// Check for intersection type: T & U or T & U & V & ...
	if p.match("&") {
		types := []ast.TypeNode{firstType}

		// Loop to handle multiple intersection types
		for p.match("&") && !p.isAtEnd() {
			p.advance()
			p.skipWhitespaceAndComments()

			right, err := p.parseTypeAnnotationUnary()
			if err != nil {
				return nil, err
			}
			types = append(types, right)
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

// parseTypeAnnotationUnary parses a type without unions/intersections (primary, extends, array)
func (p *parser) parseTypeAnnotationUnary() (ast.TypeNode, error) {
	startPos := p.currentPos()

	// Handle readonly modifier
	isReadonly := false
	if p.match("readonly") {
		p.advanceString(8)
		p.skipWhitespaceAndComments()
		isReadonly = true
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

			res := &ast.ConditionalType{
				CheckType:    firstType,
				ExtendsType:  extendsType,
				InferredType: inferredType,
				TrueType:     trueType,
				FalseType:    falseType,
				Position:     startPos,
				EndPos:       p.currentPos(),
			}

			if isReadonly {
				return &ast.TypeReference{
					Name:          "readonly",
					TypeArguments: []ast.TypeNode{res},
					Position:      startPos,
					EndPos:        p.currentPos(),
				}, nil
			}
			return res, nil
		} else {
			// Not a conditional type, restore position
			p.pos = savedPos
		}
	}

	// Check for array type suffix [] or indexed access type: T[K]
	for p.match("[") {
		p.advance()
		p.skipWhitespaceAndComments()

		// Check if this is an array type (empty brackets) or indexed access type
		if p.match("]") {
			// Array type like (infer U)[] or string[]
			p.advance()

			// Convert firstType to array type by wrapping it
			arrayType := &ast.TypeReference{
				Name:          "(array)",
				TypeArguments: []ast.TypeNode{firstType},
				Position:      startPos,
				EndPos:        p.currentPos(),
			}

			if isReadonly {
				firstType = &ast.TypeReference{
					Name:          "readonly",
					TypeArguments: []ast.TypeNode{arrayType},
					Position:      startPos,
					EndPos:        p.currentPos(),
				}
			} else {
				firstType = arrayType
			}
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

			// Return IndexedAccessType
			res := &ast.IndexedAccessType{
				ObjectType: firstType,
				IndexType:  indexType,
				Position:   startPos,
				EndPos:     p.currentPos(),
			}

			if isReadonly {
				firstType = &ast.TypeReference{
					Name:          "readonly",
					TypeArguments: []ast.TypeNode{res},
					Position:      startPos,
					EndPos:        p.currentPos(),
				}
			} else {
				firstType = res
			}
		}
	}

	if isReadonly {
		return &ast.TypeReference{
			Name:          "readonly",
			TypeArguments: []ast.TypeNode{firstType},
			Position:      startPos,
			EndPos:        p.currentPos(),
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

	// Parse type parameters (generics)
	var typeParams []ast.TypeNode
	if p.match("<") {
		var err error
		typeParams, err = p.parseTypeParameters()
		if err != nil {
			return nil, err
		}
	}

	p.skipWhitespaceAndComments()

	// Parse extends clause
	var extends []ast.TypeNode
	if p.match("extends") {
		p.advanceString(7)
		p.skipWhitespaceAndComments()

		// Parse comma-separated list of extended types
		for {
			extendType, err := p.parseTypeAnnotationPrimary()
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

	p.skipWhitespaceAndComments()

	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' in interface declaration")
	}
	p.advance() // Consume opening brace

	// Parse interface body
	var members []ast.TypeMember

	// Loop through members
	for !p.match("}") && !p.isAtEnd() {
		memberStart := p.currentPos()

		// Check for constructor signature: new (args): Type
		if p.matchKeyword("new") {
			p.advanceWord() // consume new
			p.skipWhitespaceAndComments()

			if p.match("(") {
				// Parse parameters
				// For now, we'll just skip parameters and return type to avoid complex parsing logic here
				// In a full implementation, we would parse them properly
				depth := 1
				p.advance()
				for depth > 0 && !p.isAtEnd() {
					if p.match("(") {
						depth++
					} else if p.match(")") {
						depth--
					}
					p.advance()
				}
				p.skipWhitespaceAndComments()

				if p.match(":") {
					p.advance()
					p.skipWhitespaceAndComments()
					p.skipTypeAnnotation()
				}
				p.skipWhitespaceAndComments()
				if p.match(";") || p.match(",") {
					p.advance()
				}

				// Add a placeholder member for now
				members = append(members, ast.InterfaceProperty{
					Key:      &ast.Identifier{Name: "new", Position: memberStart, EndPos: p.currentPos()},
					Value:    nil,
					Position: memberStart,
					EndPos:   p.currentPos(),
				})
				p.skipWhitespaceAndComments()
				continue
			}
		}

		// Check for call signature: (args): Type
		if p.match("(") {
			callSigStart := p.currentPos()

			// Parse parameters
			params, err := p.parseCallParameters()
			if err != nil {
				return nil, err
			}

			p.skipWhitespaceAndComments()

			var returnType ast.TypeNode
			if p.match(":") {
				p.advance()
				p.skipWhitespaceAndComments()
				returnType, err = p.parseTypeAnnotationFull()
				if err != nil {
					return nil, err
				}
			} else {
				// Default return type is any? or void?
				// For now, let's assume any if missing (though TS requires it usually)
				// Or maybe it's a method shorthand without name?
				// But interface call signature usually requires return type
			}

			p.skipWhitespaceAndComments()
			if p.match(";") || p.match(",") {
				p.advance()
			}

			members = append(members, &ast.CallSignature{
				Parameters: params,
				ReturnType: returnType,
				Position:   callSigStart,
				EndPos:     p.currentPos(),
			})
			p.skipWhitespaceAndComments()
			continue
		}

		// Check for index signature: [key: Type]: Type
		if p.match("[") {
			indexStart := p.currentPos()
			p.advance() // consume [
			p.skipWhitespaceAndComments()

			// Parse identifier
			id, err := p.parseIdentifier()
			if err != nil {
				return nil, err
			}
			p.skipWhitespaceAndComments()

			// Should have : for index signature
			if p.match(":") {
				p.advance() // consume :
				p.skipWhitespaceAndComments()

				keyType, err := p.parseTypeAnnotationFull()
				if err != nil {
					return nil, err
				}

				p.skipWhitespaceAndComments()
				if !p.match("]") {
					return nil, fmt.Errorf("expected ']' in index signature")
				}
				p.advance() // consume ]
				p.skipWhitespaceAndComments()

				if !p.match(":") {
					return nil, fmt.Errorf("expected ':' after index signature")
				}
				p.advance() // consume :
				p.skipWhitespaceAndComments()

				valueType, err := p.parseTypeAnnotationFull()
				if err != nil {
					return nil, err
				}

				members = append(members, &ast.IndexSignature{
					KeyName:   id.Name,
					KeyType:   keyType,
					ValueType: valueType,
					Readonly:  false, // TODO: check for readonly modifier
					Position:  indexStart,
					EndPos:    p.currentPos(),
				})

				p.skipWhitespaceAndComments()
				if p.match(";") || p.match(",") {
					p.advance()
				}
				p.skipWhitespaceAndComments()
				continue
			} else {
				// Not an index signature, skip it
				depth := 1
				for depth > 0 && !p.isAtEnd() {
					if p.match("[") {
						depth++
					} else if p.match("]") {
						depth--
					}
					p.advance()
				}
				p.skipWhitespaceAndComments()
				if p.match(":") {
					p.advance()
					p.skipWhitespaceAndComments()
					p.skipTypeAnnotation()
				}
				p.skipWhitespaceAndComments()
				if p.match(";") || p.match(",") {
					p.advance()
				}
				p.skipWhitespaceAndComments()
				continue
			}
		}

		// Check for readonly modifier
		isReadonly := false
		if p.match("readonly") {
			p.advanceString(8)
			p.skipWhitespaceAndComments()
			isReadonly = true
		}

		// Regular property or method
		if p.matchIdentifier() || p.matchString() {
			// Parse property name
			var name *ast.Identifier
			if p.matchString() {
				str, _ := p.parseStringLiteral()
				name = &ast.Identifier{Name: str, Position: memberStart, EndPos: p.currentPos()}
			} else {
				name, _ = p.parseIdentifier()
			}

			p.skipWhitespaceAndComments()

			// Optional ?
			isOptional := false
			if p.match("?") {
				isOptional = true
				p.advance()
				p.skipWhitespaceAndComments()
			}

			// Method signature: name(args): Type
			if p.match("(") {
				params, err := p.parseCallParameters()
				if err != nil {
					return nil, err
				}

				p.skipWhitespaceAndComments()
				var returnType ast.TypeNode
				if p.match(":") {
					p.advance()
					p.skipWhitespaceAndComments()
					returnType, err = p.parseTypeAnnotationFull()
					if err != nil {
						return nil, err
					}
				} else {
					// Default to any if no return type specified
					returnType = &ast.TypeReference{Name: "any"}
				}

				// Create FunctionType for the method
				// Convert []ast.Parameter to []*ast.Parameter
				paramPtrs := make([]*ast.Parameter, len(params))
				for i := range params {
					paramPtrs[i] = &params[i]
				}

				funcType := &ast.FunctionType{
					Params:   paramPtrs,
					Return:   returnType,
					Position: memberStart,
					EndPos:   p.currentPos(),
				}

				members = append(members, ast.InterfaceProperty{
					Key:      name,
					Value:    funcType,
					Optional: isOptional,
					Readonly: isReadonly,
					Position: memberStart,
					EndPos:   p.currentPos(),
				})
			} else if p.match(":") {
				// Property: name: Type
				p.advance()
				p.skipWhitespaceAndComments()
				propType, err := p.parseTypeAnnotationFull()
				if err != nil {
					return nil, err
				}

				members = append(members, ast.InterfaceProperty{
					Key:      name,
					Value:    propType,
					Optional: isOptional,
					Readonly: isReadonly,
					Position: memberStart,
					EndPos:   p.currentPos(),
				})
			} else {
				// Property without type annotation (implicit any)
				members = append(members, ast.InterfaceProperty{
					Key:      name,
					Value:    &ast.TypeReference{Name: "any"},
					Optional: isOptional,
					Readonly: isReadonly,
					Position: memberStart,
					EndPos:   p.currentPos(),
				})
			}

			p.skipWhitespaceAndComments()
			if p.match(";") || p.match(",") {
				p.advance()
			}
			p.skipWhitespaceAndComments()

			continue
		}

		// If we get here, skip token to avoid infinite loop
		p.advance()
		p.skipWhitespaceAndComments()
	}

	if !p.match("}") {
		return nil, fmt.Errorf("expected '}' to close interface declaration")
	}
	p.advance()

	// Handle union types after interface (invalid TypeScript but we need to support it)
	// Example: interface X { } | { }
	p.skipWhitespaceAndComments()
	if p.match("|") {
		// Skip union types - just consume tokens until we hit a statement boundary
		for p.match("|") && !p.isAtEnd() {
			p.advance() // consume |
			p.skipWhitespaceAndComments()

			// Skip the union type member
			if p.match("{") {
				// Object type
				depth := 1
				p.advance()
				for depth > 0 && !p.isAtEnd() {
					if p.match("{") {
						depth++
					} else if p.match("}") {
						depth--
					}
					p.advance()
				}
			} else {
				// Other type - skip until | or statement end
				for !p.match("|") && !p.match(";") && !p.isAtEnd() && !p.matchKeyword("export", "const", "let", "var", "function", "class", "interface", "type") {
					p.advance()
				}
			}
			p.skipWhitespaceAndComments()
		}
	}

	return &ast.InterfaceDeclaration{
		ID:             id,
		Members:        members,
		Extends:        extends,
		TypeParameters: typeParams,
		Position:       startPos,
		EndPos:         p.currentPos(),
	}, nil
}

// parseCallParameters parses parameters for a call signature: (a: string, b: number)
func (p *parser) parseCallParameters() ([]ast.Parameter, error) {
	if !p.match("(") {
		return nil, fmt.Errorf("expected '(' for parameters")
	}
	p.advance() // consume '('
	p.skipWhitespaceAndComments()

	var params []ast.Parameter

	for !p.match(")") && !p.isAtEnd() {
		// Parse parameter
		startPos := p.currentPos()

		// Check for rest parameter
		isRest := false
		if p.match("...") {
			p.advanceString(3)
			p.skipWhitespaceAndComments()
			isRest = true
		}

		id, err := p.parseIdentifier()
		if err != nil {
			return nil, err
		}
		p.skipWhitespaceAndComments()

		// Optional?
		optional := false
		if p.match("?") {
			p.advance()
			optional = true
			p.skipWhitespaceAndComments()
		}

		// Type annotation
		var typeAnn ast.TypeNode
		if p.match(":") {
			p.advance()
			p.skipWhitespaceAndComments()
			typeAnn, err = p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}
		}

		params = append(params, ast.Parameter{
			ID:        id,
			ParamType: typeAnn,
			Optional:  optional,
			Rest:      isRest,
			Position:  startPos,
			EndPos:    p.currentPos(),
		})

		p.skipWhitespaceAndComments()
		if p.match(",") {
			p.advance()
			p.skipWhitespaceAndComments()
		}
	}

	if !p.match(")") {
		return nil, fmt.Errorf("expected ')' after parameters")
	}
	p.advance() // consume ')'

	return params, nil
}

// parseNamespaceDeclaration parses a namespace declaration: namespace Name { ... }
func (p *parser) parseNamespaceDeclaration() (ast.Statement, error) {
	startPos := p.currentPos()
	p.consumeKeyword("namespace")
	p.skipWhitespaceAndComments()

	name, err := p.parseIdentifier()
	if err != nil {
		return nil, err
	}

	p.skipWhitespaceAndComments()

	if !p.match("{") {
		return nil, fmt.Errorf("expected '{' in namespace declaration")
	}

	// Parse namespace body
	body, err := p.parseBlockStatement()
	if err != nil {
		return nil, err
	}

	return &ast.NamespaceDeclaration{
		Name:     name,
		Body:     body.Body,
		Position: startPos,
		EndPos:   p.currentPos(),
	}, nil
}
