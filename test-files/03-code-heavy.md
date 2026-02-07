# Code Block Stress Test

## Many Languages

### HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test</title>
    <style>
        .container { display: flex; gap: 16px; }
        .container > div { flex: 1; }
    </style>
</head>
<body>
    <div class="container">
        <div id="main">Hello</div>
    </div>
    <script>
        document.getElementById('main').textContent = 'World';
    </script>
</body>
</html>
```

### CSS

```css
:root {
    --primary: #0366d6;
    --bg: #ffffff;
}

@media (prefers-color-scheme: dark) {
    :root {
        --primary: #58a6ff;
        --bg: #0d1117;
    }
}

.markdown-body h1::before {
    content: "# ";
    color: var(--primary);
    opacity: 0.3;
}
```

### SQL

```sql
SELECT
    u.username,
    COUNT(p.id) AS post_count,
    MAX(p.created_at) AS last_post
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
WHERE u.active = true
    AND u.created_at > '2024-01-01'
GROUP BY u.username
HAVING COUNT(p.id) > 5
ORDER BY post_count DESC
LIMIT 20;
```

### JSON

```json
{
    "name": "simple-markdown-viewer",
    "version": "0.1.0",
    "dependencies": {
        "tauri": "^2.0.0"
    },
    "nested": {
        "deeply": {
            "nested": {
                "value": [1, 2, 3, null, true, false]
            }
        }
    }
}
```

### Bash

```bash
#!/bin/bash
set -euo pipefail

# Find all markdown files and count words
find . -name "*.md" -print0 | while IFS= read -r -d '' file; do
    words=$(wc -w < "$file")
    printf "%-40s %d words\n" "$file" "$words"
done | sort -t' ' -k2 -rn | head -20
```

### TOML

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

[[bin]]
name = "server"
path = "src/main.rs"
```

### YAML

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        rust: [stable, nightly]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ matrix.rust }}
      - run: cargo test --all
```

### No Language Specified

```
This code block has no language hint.
highlight.js should use auto-detection.
fn main() {
    println!("Can it figure out this is Rust?");
}
```

## Very Long Lines

```
This is a single very long line of code that should trigger horizontal scrolling in the code block rather than wrapping. The pre element needs overflow-x: auto to handle this gracefully. Let's make it even longer to be absolutely sure it overflows the 800px max-width of the markdown body container and tests the scroll behavior properly. Still going... almost there... done.
```

## Code Block with Special Characters

```html
<div class="test">&amp; &lt; &gt; &quot; &#39;</div>
<!-- HTML entities should be preserved, not double-encoded -->
```

## Inline Code Edge Cases

Here's a backtick inside inline code: `` `backtick` `` and some with `<html>` tags inside.

Empty inline code: `` and `single backtick`.
