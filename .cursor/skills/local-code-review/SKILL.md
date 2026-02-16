---
name: local-code-review
description: Review the attached code diff for quality and best practices.
disable-model-invocation: true
---

Review the attached code diff for quality and best practices.

# Context:
-  This is a branch code review to catch issues before merging into the main branch.
-  You have full access to the codebase and should analyze the actual implementation context.

# Goal:
-  Identify actual bugs, issues, or improvements by analyzing the code changes within their full application context.
-  Only flag genuine problems with concrete evidence from the codebase.

# Requirements:
-  **Read and analyze** the affected files to understand the full context, not just the diff.
-  **Verify functionality**: Check if changes break existing behavior by examining how the code is used.
-  **Check dependencies**: Analyze variable and function usage to ensure dependencies are properly managed.
-  **Identify real issues**: Only report problems you can substantiate by examining the actual code.
-  **Provide concrete fixes**: Give specific code suggestions based on your analysis, not generic advice.
-  **Skip hypothetical concerns**: Don't ask the user to "validate" or "confirm" things you can determine yourself.

# Deliverables:
-  Clear feedback on identified issues with specific suggestions for improvement.
-  If no issues are found, confirm that the code looks good to proceed.
