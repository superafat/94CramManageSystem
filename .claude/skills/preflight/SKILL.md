---
name: preflight
description: "Pre-push validation. Run before any git push to catch issues early."
---

# Pre-Push Preflight Validation

Run ALL checks below. Fix issues automatically. Only push when every check passes.

## Checks

1. **Dependencies**: Run `pnpm install` — ensure no missing packages
2. **TypeScript**: Run `pnpm typecheck` — zero errors required
3. **Localhost references**: `grep -rn 'localhost\|127\.0\.0\.1' apps/ packages/ --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next` — flag any non-test/non-config references
4. **Secrets in code**: `grep -rn 'password.*=.*["\x27].\+["\x27]\|api_key.*=.*["\x27].\+["\x27]' apps/ packages/ --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude='*.test.*' --exclude='*.spec.*'` — must find nothing
5. **`as any` audit**: `grep -rn 'as any' apps/ packages/ --include='*.ts' --include='*.tsx' --exclude-dir=node_modules` — flag new occurrences (check against git diff)
6. **Console.log cleanup**: `grep -rn 'console\.log' apps/ packages/ --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude='*.test.*'` — flag debug logs in production code
7. **Env var coverage**: For any new `process.env.*` or `NEXT_PUBLIC_*` references in changed files, verify they exist in:
   - `.env.example`
   - CI/CD workflow files (`.github/workflows/`)
8. **Docker platform**: If any Dockerfile was modified, verify it has `--platform linux/amd64`

## Output

After all checks, output a summary table:

| Check | Status | Details |
|-------|--------|---------|
| Dependencies | PASS/FAIL | ... |
| TypeScript | PASS/FAIL | ... |
| ... | ... | ... |

Fix all FAIL items automatically, re-run checks, then report final status.
