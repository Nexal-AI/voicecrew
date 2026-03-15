# Voicecrew Rollback Procedure

> **Purpose:** Emergency procedures for rolling back a published npm version  
> **Scope:** All `voicecrew` package versions  
> **Severity Levels:** P0 (Critical), P1 (High), P2 (Medium)

---

## Decision Matrix

| Time Since Publish | Severity | Action |
|-------------------|----------|--------|
| 0-72 hours | P0/P1/P2 | `npm unpublish` (preferred) |
| 72+ hours | P0 | `npm deprecate` + immediate patch |
| 72+ hours | P1/P2 | `npm deprecate` + planned patch |

---

## Method 1: Unpublish (0-72 Hour Window)

### When to Use
- Discovery of critical security vulnerability
- Broken package that fails on install
- PII or secrets accidentally published
- MUST be within 72 hours of initial publish

### Steps

#### Step 1: Assess Impact
```bash
# Check download count since publish
npm view voicecrew@0.1.0 --json | jq '.downloads'

# Check dependents
npm view voicecrew@0.1.0 --json | jq '.dependents'
```

#### Step 2: Execute Unpublish
```bash
# Login with account that has publish rights
npm login

# Unpublish specific version
npm unpublish voicecrew@0.1.0

# Verify removal
npm view voicecrew@0.1.0
# Expected: "version not found: 0.1.0"
```

#### Step 3: GitHub Release Cleanup
```bash
# Delete GitHub release (optional but recommended)
gh release delete v0.1.0 --yes

# Delete tag locally and remotely
git push --delete origin v0.1.0
git tag -d v0.1.0
```

#### Step 4: Communication
- Post in #incident-response channel
- Notify Ops ( COO) immediately
- Update any consumers who may have installed

### Limitations of Unpublish
- **72-hour window:** npm registry hard limit
- Download threshold: If > 300 downloads, may require npm support ticket
- Cannot unpublish entire package if other versions exist (voicecrew has 0.x)

---

## Method 2: Deprecate (After 72 Hours)

### When to Use
- Issues discovered after 72-hour window
- Non-critical bugs that don't warrant emergency unpublish
- Breaking changes that affect subset of users

### Steps

#### Step 1: Apply Deprecation
```bash
# Deprecate with clear message
npm deprecate voicecrew@0.1.0 "Critical bug in v0.1.0: [brief description]. Upgrade to v0.1.1 immediately."

# Verify deprecation
npm view voicecrew@0.1.0
# Look for: "deprecated": "Critical bug in v0.1.0..."
```

#### Step 2: Publish Fixed Version
```bash
# Bump version in package.json
# 0.1.0 → 0.1.1 (patch)
# Or if breaking: 0.1.0 → 0.2.0 (minor)

# Commit fix
git add .
git commit -m "fix: resolve [issue description]"

# Tag and publish new version
git tag v0.1.1
git push origin v0.1.1
# Workflow auto-publishes
```

#### Step 3: Update GitHub Release
```bash
# Edit existing release to add deprecation notice
gh release edit v0.1.0 --notes "⚠️ DEPRECATED: [reason]. Use v0.1.1 instead."
```

#### Step 4: Communication
- Post deprecation notice to README
- Tweet from @voicecrew (if social active)
- Notify known consumers via email if critical

---

## Method 3: Emergency Patch Release

### When to Use
- Cannot unpublish (after 72hrs)
- Deprecation not sufficient (security patches)
- Need immediate replacement version

### Steps

#### Step 1: Hotfix Branch
```bash
# From the problematic tag
git checkout -b hotfix/v0.1.1 v0.1.0

# Apply fix
git cherry-pick <fix-commit>  # or manually commit

# Verify tests pass
pnpm run test
```

#### Step 2: Version Bump
```bash
# Update package.json version
# DO NOT use npm version (creates git tag we don't want yet)
```

#### Step 3: Tag and Publish
```bash
# Commit version bump
git commit -am "chore: bump to v0.1.1 for hotfix"

# Tag
git tag v0.1.1
git push origin v0.1.1

# Workflow publishes automatically
```

#### Step 4: Merge Hotfix
```bash
# Back to main
git checkout main
git merge hotfix/v0.1.1
git push origin main
```

---

## Emergency Contacts

| Role | Agent ID | Escalation |
|------|----------|------------|
| DevOps | Ship (engineering-ship-7a8t) | Primary |
| Engineering Lead | Arch (engineering-arch-mdz6) | Secondary |
| COO | Ops (specialized-ops-m7ur) | Decision Authority |
| Publisher Account | Madan (Human CEO) | Account Owner |

---

## Post-Incident Actions

### Immediate (0-24 hours)
1. Document incident timeline
2. Identify root cause
3. Assess customer impact

### Short-term (1-7 days)
1. Publish post-mortem
2. Update test suite to catch similar issues
3. Review CI/CD for gaps

### Long-term
1. Update runbook with lessons learned
2. Consider additional gates (manual approval, extended testing)
3. Schedule release process review

---

## Prevention Checklist

To minimize rollback risk, ensure before every publish:

- [ ] All tests pass (unit, integration, e2e)
- [ ] TypeScript compilation succeeds
- [ ] Test install from packed tarball (`npm pack && npm install ./voicecrew-x.x.x.tgz`)
- [ ] Verify no secrets in built files (`grep -i password dist/*`)
- [ ] Check bundle size hasn't ballooned
- [ ] Manual smoke test of key exports
- [ ] Beta test with sample project

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-15  
**Next Review:** 2026-06-15 (quarterly)
