package parser

import (
	"fmt"
	"tstypechecker/pkg/ast"
)

// parseTypeParameters parses generic type parameters <T, U extends V, W = X>
func (p *parser) parseTypeParameters() ([]ast.TypeNode, error) {
	if !p.match("<") {
		return nil, nil
	}

	p.advance() // consume <
	p.skipWhitespaceAndComments()

	var typeParams []ast.TypeNode

	for !p.match(">") && !p.isAtEnd() {
		// Parse type parameter: T extends U = V

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

	return typeParams, nil
}
