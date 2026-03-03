---
name: debugging
description: Systematic debugging framework — structured root-cause analysis, hypothesis-driven debugging, evidence collection, defense-in-depth validation, regression prevention. Use when fixing bugs, investigating failures, diagnosing performance issues, or troubleshooting production incidents.
license: MIT
---

# Systematic Debugging Mastery

A rigorous, evidence-based approach to finding and fixing bugs. Eliminates random trial-and-error with structured investigation.

## The 4 Debugging Disciplines

### 1. Systematic Debugging
**Problem:** Random code changes waste time and introduce new bugs.
**Solution:** Structured investigation with binary search and hypothesis testing.

```
OBSERVE → HYPOTHESIZE → TEST → CONCLUDE → VERIFY
```

#### Investigation Protocol
```markdown
1. **Reproduce** — Create minimal reproduction case
   - Exact steps to trigger the bug
   - Expected vs actual behavior
   - Environment (OS, browser, versions)

2. **Isolate** — Narrow the scope
   - Binary search: disable half the code, which half fails?
   - Recent changes: `git bisect` to find the breaking commit
   - Dependencies: does it fail with mocked deps?

3. **Hypothesize** — Form a testable theory
   - "I believe X is causing Y because Z"
   - List ALL plausible hypotheses, rank by likelihood
   - Design a test that distinguishes between them

4. **Test** — Gather evidence (don't just "try things")
   - Add targeted logging/breakpoints
   - Check ONE hypothesis at a time
   - Record results

5. **Fix** — Apply minimal, targeted change
   - Fix the ROOT cause, not the symptom
   - Write a regression test
   - Verify the fix doesn't break anything else
```

### 2. Root Cause Tracing
**Never fix symptoms. Always find the root cause.**

```
Symptom: "Login page shows blank screen"
SURFACE: The React component isn't rendering
  WHY? → An error is thrown during render
    WHY? → `user.name` is undefined
      WHY? → API returns null for user object
        WHY? → Database query has wrong WHERE clause
          ROOT CAUSE: Migration changed column name but query wasn't updated
```

#### 5 Whys Template
```markdown
**Symptom:** [What the user sees]
1. Why? → [Immediate cause]
2. Why? → [Deeper cause]
3. Why? → [System-level cause]
4. Why? → [Process-level cause]
5. Why? → [Root cause]

**Fix:** [Address root cause, not symptom]
**Prevention:** [How to prevent recurrence]
```

### 3. Defense-in-Depth Validation
**One test is not enough. Validate at every layer.**

```markdown
After fixing a bug, verify at ALL levels:
- [ ] Unit test: Does the fix work in isolation?
- [ ] Integration test: Does it work with real dependencies?
- [ ] E2E test: Does the user flow work end-to-end?
- [ ] Regression test: Did the fix break anything else?
- [ ] Edge cases: Does it handle null, empty, max values?
- [ ] Concurrency: Does it work under load?
```

### 4. Verification Before Completion
**Never claim "it works" without evidence.**

```markdown
## Verification Checklist
- [ ] Bug is reproduced (I can trigger it consistently)
- [ ] Root cause is identified (not just the symptom)
- [ ] Fix is applied (minimal change, well-documented)
- [ ] Test is passing (regression test added)
- [ ] Related tests pass (full test suite green)
- [ ] Build succeeds (no compile errors, no warnings)
- [ ] Manual verification (I tested the exact user flow)
```

## Reference Navigation

- **[Git Bisect Guide](references/git-bisect.md)** — Binary search through commits to find the breaking change
- **[Debugging Tools](references/debugging-tools.md)** — Browser DevTools, Node.js inspector, logging strategies
- **[Common Bug Patterns](references/common-bug-patterns.md)** — Race conditions, off-by-one, null refs, async mistakes
- **[Production Debugging](references/production-debugging.md)** — Log analysis, tracing, error monitoring, incident response

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|-------------------|
| Random code changes | Hypothesize → Test → Conclude |
| "It works on my machine" | Reproduce in isolated environment |
| Fix the symptom | Fix the root cause |
| Skip verification | Verify at every layer |
| "I think I fixed it" | Prove with tests and evidence |
| Blame the framework | Check your code first |
| Debug in production | Reproduce locally, then fix |

## Quick Decision: Which Tool?

| Situation | Tool |
|-----------|------|
| "When did this break?" | `git bisect` |
| "What's the state at this point?" | Debugger breakpoint |
| "What's being sent/received?" | Network tab / logging |
| "Why is this slow?" | Performance profiler |
| "What's the call sequence?" | Stack trace / tracing |
| "Is this a known issue?" | Error monitoring (Sentry) |

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [code-review](../code-review/SKILL.md) | Finding bugs before they ship, review checklists |
| [testing](../testing/SKILL.md) | Writing regression tests after fixes |
| [devops](../devops/SKILL.md) | Monitoring, logging, production debugging |
| [databases](../databases/SKILL.md) | Query performance analysis with EXPLAIN |
