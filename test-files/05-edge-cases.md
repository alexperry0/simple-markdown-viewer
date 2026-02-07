# Edge Case Test

## Empty Sections

###

## Single Character Paragraphs

a

b

c

## Very Long Heading

## This is an extremely long heading that tests how the viewer handles headings that exceed the normal content width and might need to wrap to multiple lines in the rendered output

## Very Long Word

Pneumonoultramicroscopicsilicovolcanoconiosis is a real word. But what about a fake one: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

## Very Long URL

Check out [this link with a very long URL](https://example.com/this/is/a/very/long/url/path/that/goes/on/and/on/and/on/and/might/overflow/the/container/if/word/break/is/not/handled/properly/so/lets/see/what/happens)

## Adjacent Blockquotes

> Quote one

> Quote two (should these merge or stay separate?)

## Empty Code Block

```
```

## Code Block with Only Whitespace

```

```

## Paragraph Immediately After Code

```python
x = 1
```
This paragraph comes right after a code block with no blank line.

## Paragraph Immediately After Heading

## Heading
Paragraph right after heading.

## HTML Mixed with Markdown

This <em>should work</em> with **markdown** and <strong>HTML</strong> mixed.

<div>

This paragraph is inside a div. Does markdown render?

</div>

## Backslash Escapes

\*not italic\*

\`not code\`

\# not a heading

\[not a link\]

## Consecutive Horizontal Rules

---
---
---

## Table with Empty Cells

| A | B | C |
|---|---|---|
|   | x |   |
| y |   | z |
|   |   |   |

## List with Blank Lines Between Items

- Item one

- Item two

- Item three

## Numbers that Look Like Ordered Lists

1234. This starts with a big number.

0. What about zero?

## Raw URLs

Visit https://example.com or http://example.org for more info.

Email: user@example.com

## Consecutive Emphasis

*a**b**c*

**a*b*c**

## Unicode and Special Chars

| Language | Hello | Characters |
|----------|-------|------------|
| Japanese | こんにちは | 日本語テスト |
| Chinese | 你好 | 中文测试 |
| Korean | 안녕하세요 | 한국어 테스트 |
| Arabic | مرحبا | اختبار عربي |
| Russian | Привет | Русский тест |
| Emoji | 👋🌍 | 🎉✅❌⚠️ |

## Math-like Content

When x = 2 and y = 3, then x^2 + y^2 = 4 + 9 = 13.

The formula E = mc^2 is famous.

## End of Edge Cases

If everything above rendered without crashing, the viewer is robust.
