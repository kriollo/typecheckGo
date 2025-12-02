package checker

import (
	"tstypechecker/pkg/ast"
	"tstypechecker/pkg/types"
)

// ControlFlowNarrowing handles advanced control flow-based type narrowing
type ControlFlowNarrowing struct {
	tc *TypeChecker
}

// NewControlFlowNarrowing creates a new control flow narrowing analyzer
func NewControlFlowNarrowing(tc *TypeChecker) *ControlFlowNarrowing {
	return &ControlFlowNarrowing{tc: tc}
}

// AnalyzeBlockWithNarrowing analyzes a block statement and applies type narrowing
// Returns true if the block always returns/throws (never completes normally)
func (cfn *ControlFlowNarrowing) AnalyzeBlockWithNarrowing(
	block *ast.BlockStatement,
	initialNarrowing map[string]*types.Type,
	filename string,
) bool {
	if block == nil || len(block.Body) == 0 {
		return false
	}

	// Apply initial narrowing
	restore := cfn.tc.typeNarrowing.ApplyNarrowing(initialNarrowing)
	defer restore()

	// Track if we've seen a definite exit (return/throw)
	alwaysExits := false

	for i, stmt := range block.Body {
		// Check the statement
		cfn.tc.checkStatement(stmt, filename)

		// Check if this statement always exits
		if cfn.statementAlwaysExits(stmt) {
			alwaysExits = true
			// Any code after this is unreachable, but we still check it
			// (TypeScript does this too for error reporting)
			break
		}

		// If this is the last statement and it's a return/throw, the block always exits
		if i == len(block.Body)-1 {
			if cfn.statementAlwaysExits(stmt) {
				alwaysExits = true
			}
		}
	}

	return alwaysExits
}

// statementAlwaysExits checks if a statement always exits (return/throw/infinite loop)
func (cfn *ControlFlowNarrowing) statementAlwaysExits(stmt ast.Statement) bool {
	switch s := stmt.(type) {
	case *ast.ReturnStatement:
		return true
	case *ast.ThrowStatement:
		return true
	case *ast.IfStatement:
		// If statement always exits if both branches always exit
		consequentExits := cfn.blockAlwaysExits(s.Consequent)
		if s.Alternate == nil {
			return false // No else branch, might not exit
		}
		alternateExits := cfn.blockAlwaysExits(s.Alternate)
		return consequentExits && alternateExits
	case *ast.BlockStatement:
		return cfn.blockAlwaysExits(s)
	case *ast.SwitchStatement:
		// Switch always exits if all cases (including default) exit
		hasDefault := false
		allCasesExit := true
		for _, caseClause := range s.Cases {
			if caseClause.Test == nil {
				hasDefault = true
			}
			caseExits := false
			for _, caseStmt := range caseClause.Consequent {
				if cfn.statementAlwaysExits(caseStmt) {
					caseExits = true
					break
				}
			}
			if !caseExits {
				allCasesExit = false
			}
		}
		return hasDefault && allCasesExit
	default:
		return false
	}
}

// blockAlwaysExits checks if a statement (which might be a block) always exits
func (cfn *ControlFlowNarrowing) blockAlwaysExits(stmt ast.Statement) bool {
	if block, ok := stmt.(*ast.BlockStatement); ok {
		for _, s := range block.Body {
			if cfn.statementAlwaysExits(s) {
				return true
			}
		}
		return false
	}
	return cfn.statementAlwaysExits(stmt)
}

// AnalyzeIfStatementWithControlFlow analyzes an if statement with full control flow narrowing
func (cfn *ControlFlowNarrowing) AnalyzeIfStatementWithControlFlow(
	stmt *ast.IfStatement,
	condition ast.Expression,
	filename string,
) {
	// Analyze the condition for type narrowing
	thenNarrowing, elseNarrowing := cfn.tc.typeNarrowing.AnalyzeCondition(condition)

	// Check if the then branch always exits (returns/throws)
	thenAlwaysExits := false
	if blockStmt, ok := stmt.Consequent.(*ast.BlockStatement); ok {
		thenAlwaysExits = cfn.AnalyzeBlockWithNarrowing(blockStmt, thenNarrowing, filename)
	} else {
		// Single statement
		restore := cfn.tc.typeNarrowing.ApplyNarrowing(thenNarrowing)
		cfn.tc.checkStatement(stmt.Consequent, filename)
		restore()
		thenAlwaysExits = cfn.statementAlwaysExits(stmt.Consequent)
	}

	// Check the else branch if present
	elseAlwaysExits := false
	if stmt.Alternate != nil {
		if blockStmt, ok := stmt.Alternate.(*ast.BlockStatement); ok {
			elseAlwaysExits = cfn.AnalyzeBlockWithNarrowing(blockStmt, elseNarrowing, filename)
		} else {
			// Single statement or another if statement
			restore := cfn.tc.typeNarrowing.ApplyNarrowing(elseNarrowing)
			cfn.tc.checkStatement(stmt.Alternate, filename)
			restore()
			elseAlwaysExits = cfn.statementAlwaysExits(stmt.Alternate)
		}
	}

	// CRITICAL: If the then branch always exits (returns/throws),
	// then code AFTER the if statement has the ELSE narrowing applied!
	if thenAlwaysExits && !elseAlwaysExits && stmt.Alternate == nil {
		// Then branch exits, no else branch
		// Apply the else narrowing to the parent scope
		// This will affect code AFTER the if statement
		for varName, narrowedType := range elseNarrowing {
			cfn.tc.varTypeCache[varName] = narrowedType
		}
	}
}
