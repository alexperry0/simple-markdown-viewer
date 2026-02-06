#!/usr/bin/env python3
"""
Security Check Hook (PreToolUse)

Scans file content for potential security issues before writes/edits.
Blocks operations that would introduce obvious security vulnerabilities.

Exit Codes:
  0 - No security issues found
  2 - BLOCKING ERROR - Security vulnerability detected

Checks for:
  - Hardcoded secrets/API keys
  - SQL injection patterns
  - Dangerous command execution
  - Disabled security features
"""

import json
import sys
import re


# Patterns that indicate potential security issues
SECURITY_PATTERNS = {
    "Hardcoded API Key": [
        r'(?:api[_-]?key|apikey)\s*[=:]\s*["\'][a-zA-Z0-9_\-]{20,}["\']',
        r'(?:secret[_-]?key|secretkey)\s*[=:]\s*["\'][a-zA-Z0-9_\-]{20,}["\']',
        r'(?:access[_-]?token|accesstoken)\s*[=:]\s*["\'][a-zA-Z0-9_\-]{20,}["\']',
    ],
    "Hardcoded Password": [
        r'password\s*[=:]\s*["\'][^"\']{8,}["\']',
        r'(?:pwd|passwd)\s*[=:]\s*["\'][^"\']{8,}["\']',
    ],
    "Connection String with Credentials": [
        r'(?:connection[_-]?string|connstr)\s*[=:]\s*["\'][^"\']*(?:password|pwd)\s*=[^"\']+["\']',
    ],
    "SQL Injection Risk": [
        r'\$"[^"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP)[^"]*\{[^}]+\}[^"]*"',  # String interpolation in SQL
        r'"\s*\+\s*[a-zA-Z_]+\s*\+\s*"[^"]*(?:SELECT|INSERT|UPDATE|DELETE)',  # String concatenation in SQL
    ],
    "Command Injection Risk": [
        r'Process\.Start\([^)]*\+[^)]*\)',  # Dynamic process execution
        r'Runtime\.exec\([^)]*\+[^)]*\)',
    ],
    "Disabled Security": [
        r'RequireHttpsMetadata\s*=\s*false',  # Disabled HTTPS requirement
        r'ValidateAudience\s*=\s*false.*ValidateIssuer\s*=\s*false',  # Disabled JWT validation
        r'AllowAnyOrigin\(\)\.AllowCredentials\(\)',  # Dangerous CORS
    ],
    "Private Key Exposure": [
        r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',
        r'-----BEGIN OPENSSH PRIVATE KEY-----',
    ],
}

# Paths that are exempt from security checks (test files, samples, etc.)
EXEMPT_PATHS = [
    r'\.tests?\.',
    r'test[s]?/',
    r'\.test\.',
    r'sample[s]?/',
    r'example[s]?/',
    r'mock[s]?/',
    r'\.md$',  # Markdown files (documentation)
]


def is_exempt_path(file_path: str) -> bool:
    """Check if file path is exempt from security checks."""
    file_path_lower = file_path.lower()
    return any(re.search(pattern, file_path_lower) for pattern in EXEMPT_PATHS)


def check_security(content: str, file_path: str) -> list[tuple[str, str]]:
    """
    Check content for security issues.
    Returns list of (issue_type, matched_text) tuples.
    """
    if is_exempt_path(file_path):
        return []

    issues = []

    for issue_type, patterns in SECURITY_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                # Truncate long matches for display
                display_match = match[:50] + "..." if len(match) > 50 else match
                issues.append((issue_type, display_match))

    return issues


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Warning: Could not parse hook input: {e}", file=sys.stderr)
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Only check Write and Edit operations
    if tool_name not in ["Write", "Edit"]:
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    content = tool_input.get("content", "") or tool_input.get("new_string", "")

    if not content:
        sys.exit(0)

    issues = check_security(content, file_path)

    if issues:
        error_msg = f"""
🔒 SECURITY CHECK FAILED

File: {file_path}

Security issues detected:
{chr(10).join(f'  ❌ {issue_type}: {match}' for issue_type, match in issues)}

⚠️  This operation has been BLOCKED to prevent security vulnerabilities.

How to fix:
  • Use environment variables or user secrets for credentials
  • Use parameterized queries instead of string interpolation for SQL
  • Review OWASP guidelines for secure coding practices

If this is a false positive (test file, documentation, etc.):
  • Move the file to a tests/ or samples/ directory
  • Or update .claude/hooks/security-check.py to add an exemption
"""
        print(error_msg, file=sys.stderr)
        sys.exit(2)  # BLOCK the operation

    sys.exit(0)


if __name__ == "__main__":
    main()
