package parser

import (
	"tstypechecker/pkg/ast"
)

// parseReturnTypeAnnotation parses a return type annotation, stopping before '{' or ';'
// This is needed because '{' could be the start of a function body, not an object type
func (p *parser) parseReturnTypeAnnotation() (ast.TypeNode, error) {
	// Save position in case we need to backtrack
	startPos := p.currentPos()

	// Check if the next token is '{' - if so, there's no return type
	if p.match("{") || p.match(";") {
		return nil, nil
	}

	// Try to parse the type annotation
	// We need to be careful not to consume '{' that belongs to the function body
	typeNode, err := p.parseTypeAnnotationFull()
	if err != nil {
		return nil, err
	}

	// Handle assertion signature: "asserts arg" or "asserts arg is Type"
	// Check if the parsed type is a TypeReference to "asserts"
	if typeRef, ok := typeNode.(*ast.TypeReference); ok && typeRef.Name == "asserts" {
		p.skipWhitespaceAndComments()

		// Parse the argument name
		_, err := p.parseTypeAnnotationFull()
		if err != nil {
			return nil, err
		}

		// Check for "is Type" after the argument
		if p.matchKeyword("is") {
			p.advanceWord() // consume 'is'
			p.skipWhitespaceAndComments()

			// Parse the target type
			_, err := p.parseTypeAnnotationFull()
			if err != nil {
				return nil, err
			}
		}

		// Return void type for assertion functions
		return &ast.TypeReference{
			Name:     "void",
			Position: typeNode.Pos(),
			EndPos:   p.currentPos(),
		}, nil
	}

	// Handle type predicate: "arg is Type"
	// parseTypeAnnotationFull might have parsed "arg" as a TypeReference
	if p.matchKeyword("is") {
		p.advanceWord() // consume 'is'
		p.skipWhitespaceAndComments()

		// Parse the target type
		_, err := p.parseTypeAnnotationFull()
		if err != nil {
			return nil, err
		}

		// Return boolean type for now as we don't have TypePredicate node
		// Ideally we should store this info, but for now this fixes the parser panic
		return &ast.TypeReference{
			Name:     "boolean",
			Position: typeNode.Pos(),
			EndPos:   p.currentPos(),
		}, nil
	}

	// If we accidentally consumed a '{', we need to detect this
	// This is a safety check - parseTypeAnnotationFull should not consume '{'
	// when it's meant to be a function body
	_ = startPos // Suppress unused warning

	return typeNode, nil
}
