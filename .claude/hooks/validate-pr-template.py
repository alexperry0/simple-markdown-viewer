#!/usr/bin/env python3
"""
PR Template Validation Hook (PreToolUse)

Validates that PR bodies include all required sections from the lean PR template.
Blocks PR creation if template is incomplete.

Exit Codes:
  0 - Validation passed (or not a PR creation tool call)
  2 - BLOCKING ERROR - PR template is incomplete

Required sections (lean template):
  - Closes # (or N/A for docs-only PRs)
  - Summary
  - Self-Review (with checklist)
  - Test Plan
"""

import json
import sys
import re


def is_docs_only_pr(data: dict) -> bool:
    """Check if this is a documentation-only PR based on branch name."""
    tool_input = data.get("tool_input", {})
    head_branch = tool_input.get("head", "")
    return head_branch.startswith("docs/") or head_branch.startswith("doc/")


def get_pr_body_from_input(data: dict) -> str | None:
    """Extract PR body from various tool inputs."""
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    # MCP GitHub create_pull_request (supports both mcp__github__ and mcp__plugin_github_github__ prefixes)
    if tool_name.startswith("mcp") and "github" in tool_name and tool_name.endswith("create_pull_request"):
        return tool_input.get("body", "")

    # Bash with gh pr create
    if tool_name == "Bash":
        command = tool_input.get("command", "")

        # Strip heredoc/body content before checking if this is a gh pr create command.
        # This prevents false positives when "gh pr create" appears inside a string
        # argument to a different command (e.g., gh issue create --body "mentions gh pr create").
        command_without_heredocs = re.sub(
            r"\$\(cat\s+<<-?'?(\w+)'?\s*.*?\s*\1\s*\)", "", command, flags=re.DOTALL
        )
        command_without_body_strings = re.sub(
            r'--body\s+"[^"]*"', "", command_without_heredocs, flags=re.DOTALL
        )

        # Check if "gh pr create" appears as an actual command invocation
        # (at start, or after && or ; or |) rather than inside a string argument
        is_pr_create = bool(re.search(
            r'(?:^|&&|;|\|)\s*gh\s+pr\s+create\b', command_without_body_strings
        ))

        if is_pr_create:
            # Check for --body-file flag first
            body_file_match = re.search(r'--body-file\s+["\']?([^\s"\']+)["\']?', command)
            if body_file_match:
                file_path = body_file_match.group(1)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return f.read()
                except (IOError, OSError):
                    # Can't read file, skip validation
                    return None

            # Check for heredoc pattern: $(cat <<'EOF' ... EOF)
            heredoc_match = re.search(r"\$\(cat\s+<<'?EOF'?\s*(.*?)\s*EOF\s*\)", command, re.DOTALL)
            if heredoc_match:
                return heredoc_match.group(1)

            # Extract body from --body flag
            body_match = re.search(r'--body\s+"([^"]*)"', command, re.DOTALL)
            if body_match:
                return body_match.group(1)

            # If gh pr create but no body found, skip validation
            return None

    return None


def validate_pr_template(body: str, is_docs_pr: bool = False) -> list[str]:
    """
    Validate PR body against required template sections.
    Returns list of missing sections.
    """
    required_sections = {
        # Closes # - allow N/A for docs PRs, otherwise require issue number
        "Closes #": r"(?:closes|fixes|resolves)\s*#(?:\d+|n/?a)" if is_docs_pr else r"(?:closes|fixes|resolves)\s*#\d+",
        "Summary": r"##\s*summary",
        "Self-Review": r"##\s*self-review",
        "Checklist Verified": r"###?\s*checklist\s*verified",
        "Security checkbox (expected: '- [x] Security ...')": r"\[x\]\s*security",
        "Correctness checkbox (expected: '- [x] Correctness ...')": r"\[x\]\s*correctness",
        "Logic flow checkbox (expected: '- [x] Logic flow ...')": r"\[x\]\s*logic\s*flow",
        "User impact checkbox (expected: '- [x] User impact ...')": r"\[x\]\s*user\s*impact",
        "Best practices checkbox (expected: '- [x] Best practices ...')": r"\[x\]\s*best\s*practices",
        "Test Plan": r"##\s*test\s*plan",
    }

    body_lower = body.lower()
    missing = []

    for section_name, pattern in required_sections.items():
        if not re.search(pattern, body_lower, re.IGNORECASE):
            missing.append(section_name)

    return missing


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        # If we can't parse input, allow the action (fail open for safety)
        print(f"Warning: Could not parse hook input: {e}", file=sys.stderr)
        sys.exit(0)

    # Extract PR body from the tool input
    pr_body = get_pr_body_from_input(input_data)

    # If this isn't a PR creation call, allow it
    if pr_body is None:
        sys.exit(0)

    # Check if this is a docs-only PR (allows Closes #N/A)
    is_docs_pr = is_docs_only_pr(input_data)

    # Validate the PR body
    missing_sections = validate_pr_template(pr_body, is_docs_pr)

    if missing_sections:
        docs_note = "\n💡 For docs/ branches: Use 'Closes #N/A' if no issue exists." if not is_docs_pr else ""
        error_msg = f"""
❌ PR TEMPLATE VALIDATION FAILED

Missing required sections:
{chr(10).join(f'  • {section}' for section in missing_sections)}

Your PR body must follow the template in .claude/commands/create-pr.md

💡 TIP: Use /create-pr command to ensure proper template format.{docs_note}

Required sections:
  ✓ Closes #[issue] - Link to issue (or #N/A for docs/ branches)
  ✓ Summary - 1-3 bullet points
  ✓ Self-Review - With checklist verified (Security, Correctness, Logic flow, User impact, Best practices)
  ✓ Test Plan - What was tested
"""
        print(error_msg, file=sys.stderr)
        sys.exit(2)  # Exit code 2 = BLOCK the tool call

    # Validation passed
    sys.exit(0)


if __name__ == "__main__":
    main()
