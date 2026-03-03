# Git Bisect Guide

## What is Git Bisect?
Binary search through commits to find the exact commit that introduced a bug. Instead of checking every commit, bisect cuts the search space in half each step.

## Basic Usage

```bash
# Start bisect
git bisect start

# Mark current commit as bad (has the bug)
git bisect bad

# Mark a known good commit (before the bug existed)
git bisect good abc1234

# Git checks out middle commit — test it, then:
git bisect good   # if this commit works fine
git bisect bad    # if this commit has the bug

# Repeat until Git identifies the exact breaking commit
# Git says: "abc5678 is the first bad commit"

# Done — return to original branch
git bisect reset
```

## Example Session

```bash
$ git bisect start
$ git bisect bad                    # HEAD has the bug
$ git bisect good v1.0.0            # v1.0.0 was fine
Bisecting: 50 revisions left to test after this (roughly 6 steps)
[commit-hash] Some commit message

# Test this commit...
$ npm test
# Tests fail!
$ git bisect bad

Bisecting: 25 revisions left to test after this (roughly 5 steps)
[commit-hash] Another commit message

# Test this commit...
$ npm test  
# Tests pass!
$ git bisect good

Bisecting: 12 revisions left to test after this (roughly 4 steps)
# ... repeat 4 more times

abc5678 is the first bad commit
commit abc5678
Author: Alice <alice@example.com>
Date:   Mon Jan 15 14:30:00 2024

    Refactor user service to use new API

$ git bisect reset  # Back to where you started
```

## Automated Bisect

```bash
# Let a script determine good/bad automatically
git bisect start HEAD v1.0.0
git bisect run npm test

# Or with a custom script
git bisect run ./test-bug.sh
```

```bash
# test-bug.sh — exit 0 = good, exit 1 = bad
#!/bin/bash
npm run build 2>/dev/null || exit 125  # skip if can't build (exit 125 = skip)
npm test -- --grep "login test" 2>/dev/null
```

## Tips

```bash
# Skip a commit that can't be tested (won't build, etc.)
git bisect skip

# View bisect log
git bisect log

# Replay a bisect session
git bisect log > bisect.log
git bisect replay bisect.log

# Visualize remaining commits
git bisect visualize
```

## When to Use

| Scenario | Use Bisect? |
|----------|------------|
| "This worked last week, now it's broken" | ✅ Yes |
| "When did this performance regression start?" | ✅ Yes |
| "The bug has always been there" | ❌ No (no good commit) |
| "Only 3 commits since last deploy" | ❌ Just check manually |
| Bug requires complex manual testing | ⚠️ Possible but slow |
| Bug is caught by automated test | ✅ Perfect for `bisect run` |
