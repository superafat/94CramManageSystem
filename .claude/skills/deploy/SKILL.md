---
name: deploy
description: "Deploy pipeline with prerequisite checks. Use when deploying any service to Cloud Run."
---

# Deploy Pipeline

You MUST complete every step in order. If any step fails, STOP and fix before continuing.

## Pre-Deploy Checklist

1. **Install dependencies**: Run `pnpm install` to ensure all packages are up to date
2. **TypeScript check**: Run `pnpm typecheck` — must be 0 errors
3. **Secret scan**: Run `git diff --cached | grep -iE 'password|secret|api_key|private_key'` — must find nothing
4. **Env var sync**: Verify all environment variables referenced in code exist in:
   - The target Cloud Run service (check with `gcloud run services describe`)
   - GitHub Actions workflow files (`.github/workflows/`)
   - `.env.example` file
5. **Demo flow check**: If changes touch auth/login/security code, verify demo login still works:
   - manage demo: `/api/auth/demo`
   - inclass demo: check demo tenant flow
6. **Docker build test**: Build with `--platform linux/amd64` locally to verify it compiles

## Deploy

7. **Commit**: Create a clean commit following `feat(scope)/fix(scope)` convention
8. **Push**: Push to trigger GitHub Actions CI/CD
9. **Monitor CI**: Watch the GitHub Actions run with `gh run list --limit 3`
10. **Verify deployment**: After CI passes, hit the Cloud Run health endpoint to confirm the new revision is serving traffic

## Post-Deploy

11. **Smoke test**: Verify login and core flows work on the live URL
12. **Report**: Summarize what was deployed and verification results
