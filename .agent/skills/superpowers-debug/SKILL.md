---
name: superpowers-debug
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview
Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law
```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use
- Test failures, bugs, unexpected behavior
- Performance problems, build failures
- Integration issues

**Use ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- You don't fully understand the issue

## The Four Phases

### Phase 1: Root Cause Investigation
**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**
   ```
   For EACH component boundary:
     - Log what data enters/exits component
     - Verify environment/config propagation
     - Check state at each layer
   Run once to gather evidence WHERE it breaks
   THEN investigate that specific component
   ```

5. **Trace Data Flow**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis
1. **Find Working Examples** - similar working code in same codebase
2. **Compare Against References** - read reference implementation COMPLETELY
3. **Identify Differences** - list every difference, however small
4. **Understand Dependencies** - components, settings, config, environment

### Phase 3: Hypothesis and Testing
1. **Form Single Hypothesis** - "I think X is the root cause because Y"
2. **Test Minimally** - smallest possible change, one variable at a time
3. **Verify Before Continuing** - Didn't work? Form NEW hypothesis, don't pile fixes
4. **When You Don't Know** - Say "I don't understand X", ask for help

### Phase 4: Implementation
1. **Create Failing Test Case** - simplest reproduction, MUST have before fixing
2. **Implement Single Fix** - ONE change, no "while I'm here" improvements
3. **Verify Fix** - test passes? no regressions?
4. **If Fix Doesn't Work** - count attempts:
   - < 3: Return to Phase 1, re-analyze
   - **≥ 3: STOP and question the architecture**

5. **If 3+ Fixes Failed: Question Architecture**
   - Is this pattern fundamentally sound?
   - Should we refactor vs. continue fixing symptoms?
   - Discuss with user before attempting more fixes

## Red Flags - STOP and Follow Process
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow
- "One more fix attempt" (when already tried 2+)
- Each fix reveals new problem in different place

**ALL of these mean: STOP. Return to Phase 1.**

## Common Rationalizations
| Excuse | Reality |
|--------|---------|
| "Issue is simple" | Simple issues have root causes too |
| "Emergency, no time" | Systematic is FASTER than thrashing |
| "Just try this first" | First fix sets the pattern. Do it right |
| "Multiple fixes saves time" | Can't isolate what worked. Causes new bugs |
| "I see the problem" | Seeing symptoms ≠ understanding root cause |
| "One more attempt" (after 2+) | 3+ failures = architectural problem |

## Quick Reference
| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| 1. Root Cause | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare | Identify differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Create test, fix, verify | Bug resolved, tests pass |

## Reporting Format
- Symptom
- Repro steps
- Root cause
- Fix
- Regression protection
- Verification
