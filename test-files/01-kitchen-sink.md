# Kitchen Sink Test

This file exercises every standard markdown element in one place.

## Inline Formatting

This is **bold**, this is *italic*, this is ***bold italic***, and this is ~~strikethrough~~.

Here's some `inline code` and a [link to GitHub](https://github.com). An autolinked URL: https://example.com

## Headings

### Third Level
#### Fourth Level
##### Fifth Level
###### Sixth Level

## Paragraphs and Line Breaks

This is a paragraph with enough text to potentially wrap across multiple lines in the viewer window. It should reflow nicely at different window widths without horizontal scrolling.

This is a second paragraph separated by a blank line.

This line has two trailing spaces
to force a hard line break.

## Unordered Lists

- Item one
- Item two
  - Nested item A
  - Nested item B
    - Deeply nested
- Item three

## Ordered Lists

1. First
2. Second
   1. Sub-item one
   2. Sub-item two
3. Third

## Mixed Lists

1. Ordered first
   - Unordered nested
   - Another unordered
2. Ordered second

## Task Lists

- [x] Completed task
- [ ] Incomplete task
- [x] Another done task
- [ ] Still todo

## Blockquotes

> This is a blockquote.
>
> It can span multiple paragraphs.

> Nested blockquotes:
>
> > This is nested inside another blockquote.

## Horizontal Rules

---

***

___

## Links and Images

[Inline link](https://example.com)

[Link with title](https://example.com "Example Title")

![Alt text for image](https://via.placeholder.com/200x100.png)

## Tables

| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |
| L2   | C2     | R2    |
| L3   | C3     | R3    |

### Wide Table

| Column A | Column B | Column C | Column D | Column E | Column F |
|----------|----------|----------|----------|----------|----------|
| Data that is quite long | More long data here | Even more | And more | Still going | Last one |

## Code Blocks

### Fenced with Language

```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
```

```rust
fn main() {
    let message = "Hello from Rust!";
    println!("{}", message);

    let numbers: Vec<i32> = (0..10).filter(|x| x % 2 == 0).collect();
    println!("{:?}", numbers);
}
```

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```

### Fenced without Language

```
This is a plain code block.
No syntax highlighting applied.
Just monospace text.
```

### Indented Code Block

    This is an indented code block.
    Four spaces at the start of each line.
    No language detection.

## Emphasis Edge Cases

*single asterisks*
_single underscores_
**double asterisks**
__double underscores__

## Definition-style (if supported)

Term 1
: Definition for term 1

Term 2
: Definition for term 2

## Keyboard Keys

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

Use <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to open the command palette.

## Footnotes (if supported)

Here's a sentence with a footnote.[^1]

[^1]: This is the footnote content.
