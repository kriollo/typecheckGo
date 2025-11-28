#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { GoTypeChecker, TypeCheckResult } from './index';

const program = new Command();

program
  .name('go-typecheck')
  .description('Type checker for Go written in TypeScript')
  .version('1.0.0');

program
  .command('check <file>')
  .description('Check a Go file for type errors')
  .action(async (file: string) => {
    const checker = new GoTypeChecker();
    const result = await checker.checkFile(file);
    reportResult(result);
  });

program
  .command('check-code <code>')
  .description('Check Go code from string')
  .option('-n, --filename <filename>', 'Filename to use for error reporting', 'stdin.go')
  .action(async (code: string, options: { filename: string }) => {
    const checker = new GoTypeChecker();
    const result = await checker.checkCode(code, { filename: options.filename });
    reportResult(result);
  });

program
  .command('check-stdin')
  .description('Check Go code from stdin')
  .option('-n, --filename <filename>', 'Filename to use for error reporting', 'stdin.go')
  .action(async (options: { filename: string }) => {
    const code = readFileSync(0, 'utf-8'); // Read from stdin
    const checker = new GoTypeChecker();
    const result = await checker.checkCode(code, { filename: options.filename });
    reportResult(result);
  });

function reportResult(result: TypeCheckResult) {
  const allIssues = [...result.errors, ...result.warnings];

  if (allIssues.length === 0) {
    console.log('✓ No type errors found');
    return;
  }

  allIssues.forEach(issue => {
    const prefix = issue.severity === 'error' ? '✗' : '⚠';
    console.log(`${prefix} ${issue.file}:${issue.line}:${issue.column} - ${issue.message} (${issue.code})`);
  });

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;

  if (errorCount > 0 && warningCount > 0) {
    console.log(`\nFound ${errorCount} errors and ${warningCount} warnings`);
  } else if (errorCount > 0) {
    console.log(`\nFound ${errorCount} errors`);
  } else {
    console.log(`\nFound ${warningCount} warnings`);
  }

  if (errorCount > 0) {
    process.exit(1);
  }
}

program.parse();
