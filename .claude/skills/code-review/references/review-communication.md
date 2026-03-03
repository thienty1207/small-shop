# Code Review Communication

How to give and receive code review feedback constructively.

## Giving Feedback

### The CIDER Framework

| Step | Action | Example |
|------|--------|---------|
| **C**ontext | Explain what you're reviewing | "Looking at the auth flow changes..." |
| **I**mpact | Explain why it matters | "This could allow unauthorized access..." |
| **D**etail | Point to specific code | "In `auth.ts:45`, the token isn't validated" |
| **E**xample | Show the fix | "Consider: `if (!validateToken(token))...`" |
| **R**esource | Link to documentation | "See OWASP guidelines on session management" |

### Tone Guidelines

```markdown
❌ AVOID:
- "This is wrong"
- "You should know better"
- "Why would you do this?"
- "This doesn't make sense"

✅ INSTEAD:
- "This could be improved by..."
- "Have you considered..."
- "What was the reasoning behind...?"
- "I'm not sure I understand the approach here—could you explain?"
```

### Comment Templates

**Security Issue:**
```markdown
🔴 **Security Concern**

**What:** The user input at line 45 is passed directly to the SQL query.

**Risk:** This creates a SQL injection vulnerability that could expose or corrupt data.

**Fix:**
\```typescript
// Use parameterized query
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId])
\```

**Reference:** [OWASP SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)
```

**Performance Suggestion:**
```markdown
🟡 **Performance Suggestion**

**Current:** Loading all users, then filtering in memory.
**Issue:** With 10K+ users, this will be slow and memory-intensive.

**Suggested fix:**
\```typescript
// Filter in database instead
const activeUsers = await db.query(
  'SELECT * FROM users WHERE status = $1 LIMIT 100',
  ['active']
)
\```

Not blocking, but worth addressing before this scales.
```

**Style/Nitpick:**
```markdown
💭 **Nitpick** (non-blocking)

Consider renaming `data` to `userProfile` for clarity.
The current name doesn't convey what the variable contains.
```

**Question:**
```markdown
❓ **Question**

I see this function is called in both the login and registration flows.
Is there a reason we're not extracting it to a shared utility?

Not suggesting a change necessarily—just want to understand the context.
```

**Praise:**
```markdown
✨ **Nice!**

Great use of the early return pattern here. 
Much cleaner than the nested if-else we had before.
```

## Receiving Feedback

### Response Guidelines

```markdown
✅ DO:
- Thank the reviewer for their time
- Ask clarifying questions if unclear
- Explain your reasoning (without being defensive)
- Accept valid feedback gracefully
- Push back respectfully if you disagree

❌ DON'T:
- Take feedback personally
- Dismiss comments without consideration
- Make excuses for poor code
- Argue about subjective preferences
- Ignore feedback without response
```

### Response Templates

**Accepting feedback:**
```markdown
Good catch! I didn't consider the null case. Fixed in commit abc123.
```

**Asking for clarification:**
```markdown
I'm not sure I follow—could you explain why `Map` would be better here?
Is it the O(1) lookup or is there another benefit I'm missing?
```

**Respectfully disagreeing:**
```markdown
I considered using a Map, but in this case we only have ~10 items and 
the object literal is more readable. Happy to discuss if you feel strongly!
```

**Explaining context:**
```markdown
The reason I used `any` here is that this is a temporary migration script 
that will be deleted after the data migration. I'll add a TODO comment 
to make that clearer.
```

## Review Etiquette

### For Reviewers

| Do | Don't |
|----|-------|
| Review within 24 hours | Let PRs sit for days |
| Focus on the important issues | Nitpick every line |
| Offer solutions, not just criticism | Just say "this is bad" |
| Acknowledge good work | Only point out negatives |
| Be specific about what needs to change | Leave vague comments |
| Approve when requirements are met | Block on preferences |

### For Authors

| Do | Don't |
|----|-------|
| Keep PRs small (<400 lines) | Submit 2000-line PRs |
| Write clear PR descriptions | Leave description blank |
| Respond to all comments | Ignore feedback |
| Request re-review after changes | Merge without approval |
| Self-review before requesting | Submit without checking |

## Handling Disagreements

### Escalation Path

```
1. Discuss in PR comments
   ↓ (No resolution)
2. Sync call or DM for complex topics
   ↓ (Still no agreement)
3. Get a third opinion from team
   ↓ (Still contested)
4. Tech lead makes final call
```

### When to Defer

- **Defer to author:** Subjective style choices, personal preference
- **Defer to reviewer:** Security concerns, established patterns, performance
- **Defer to team:** New patterns, architectural decisions, tooling choices

## Batch Review Tips

When reviewing large PRs:

1. **First pass:** Understand the overall change (5 min)
2. **Second pass:** Check architecture and design (10 min)
3. **Third pass:** Line-by-line review (varies)
4. **Final pass:** Run and test the code (5-10 min)

## Related Skills

- [Review Checklists](review-checklists.md) — Templates for different review types
- [Common Findings](common-findings.md) — Frequent issues to watch for
