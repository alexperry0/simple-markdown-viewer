#!/usr/bin/env python3
"""
Self-Review Format Validation Hook (PostToolUse)

Validates that self-review output follows the Self-Reviewer persona checklist.
This is a POST hook - it adds context/warnings after the tool completes rather than blocking.

Exit Codes:
  0 - Always (post hooks don't block, they add context)

Output:
  JSON with additionalContext if format issues detected

Required checklist items (from .claude/personas/self-reviewer.md):
  - Security
  - Correctness
  - Logic flow
  - User impact
  - Best practices / Architecture
"""

import json
import sys
import re


def check_self_review_format(content: str) -> dict:
    """
    Check if content appears to be a self-review and validate its format.
    Returns dict with 'is_self_review' bool and 'issues' list.
    """
    content_lower = content.lower()

    # Detect if this is a self-review output
    self_review_indicators = [
        "self-review",
        "self review",
        "checklist verified",
        "senior developer",
        "self-reviewer",
        "self reviewer",
        "review complete"
    ]

    is_self_review = any(indicator in content_lower for indicator in self_review_indicators)

    if not is_self_review:
        return {"is_self_review": False, "issues": []}

    # Required checklist categories
    required_categories = {
        "Security": [
            r"security",
            r"secrets?",
            r"injection",
            r"auth(?:orization|entication)?",
        ],
        "Correctness": [
            r"correctness",
            r"logic\s*errors?",
            r"null\s*ref",
            r"edge\s*cases?",
        ],
        "Logic flow": [
            r"logic\s*flow",
            r"control\s*flow",
            r"state\s*transitions?",
            r"algorithm",
        ],
        "User impact": [
            r"user\s*impact",
            r"functionality",
            r"performance",
            r"breaking\s*changes?",
        ],
        "Best practices": [
            r"best\s*practices?",
            r"architecture",
            r"error\s*handling",
        ],
    }

    issues = []

    for category, patterns in required_categories.items():
        found = any(re.search(p, content_lower) for p in patterns)
        if not found:
            issues.append(category)

    # Check for proper status indication
    status_patterns = [
        r"ready\s*for\s*(?:pr|review|external)",
        r"issues?\s*found",
        r"status[:\s]",
    ]
    has_status = any(re.search(p, content_lower) for p in status_patterns)
    if not has_status:
        issues.append("Status indication (Ready for PR / Issues Found)")

    return {"is_self_review": True, "issues": issues}


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Warning: Could not parse hook input: {e}", file=sys.stderr)
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_output = input_data.get("tool_output", {})

    # Get content from various output formats
    content = ""
    if isinstance(tool_output, str):
        content = tool_output
    elif isinstance(tool_output, dict):
        content = str(tool_output.get("content", ""))
        content += str(tool_output.get("stdout", ""))

    # Also check the tool input for Write operations
    tool_input = input_data.get("tool_input", {})
    if tool_name == "Write":
        content += str(tool_input.get("content", ""))

    result = check_self_review_format(content)

    if result["is_self_review"] and result["issues"]:
        # Output additional context for Claude
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"""
⚠️ SELF-REVIEW FORMAT CHECK

Your self-review may be missing these checklist categories:
{chr(10).join(f'  • {issue}' for issue in result["issues"])}

The Self-Reviewer persona requires checking ALL of these:
  ✓ Security (secrets, injection, auth bypass)
  ✓ Correctness (logic errors, null refs, race conditions)
  ✓ Logic flow (control flow, state transitions, algorithms)
  ✓ User impact (functionality, performance)
  ✓ Best practices (error handling, architecture)

Reference: .claude/personas/self-reviewer.md
"""
            }
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
