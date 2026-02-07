# Large Document Performance Test

This file tests rendering performance with a significant amount of content.

## Section 1: Lorem Ipsum

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

## Section 2: Tables Galore

| ID | Name | Email | Role | Status | Created |
|----|------|-------|------|--------|---------|
| 1 | Alice Johnson | alice@example.com | Admin | Active | 2024-01-15 |
| 2 | Bob Smith | bob@example.com | Editor | Active | 2024-02-20 |
| 3 | Carol Williams | carol@example.com | Viewer | Inactive | 2024-03-10 |
| 4 | David Brown | david@example.com | Editor | Active | 2024-04-05 |
| 5 | Eve Davis | eve@example.com | Admin | Active | 2024-05-12 |
| 6 | Frank Miller | frank@example.com | Viewer | Active | 2024-06-18 |
| 7 | Grace Wilson | grace@example.com | Editor | Inactive | 2024-07-22 |
| 8 | Hank Moore | hank@example.com | Viewer | Active | 2024-08-30 |
| 9 | Ivy Taylor | ivy@example.com | Admin | Active | 2024-09-14 |
| 10 | Jack Anderson | jack@example.com | Editor | Active | 2024-10-01 |

## Section 3: Deeply Nested Lists

1. Level one
   1. Level two
      1. Level three
         1. Level four
            1. Level five - how deep can we go?
               - Switch to unordered
                 - Even deeper
                   - Maximum nesting test
   2. Back to level two
2. Back to level one

- Unordered level one
  - Level two
    - Level three
      - Level four has a paragraph:

        This is a paragraph inside a deeply nested list item. It should be indented properly and maintain correct spacing relative to its parent list item.

      - Another level four item
    - Back to three
  - Back to two

## Section 4: Mixed Content Blocks

> Here's a blockquote containing a code block:
>
> ```python
> def greet(name):
>     return f"Hello, {name}!"
> ```
>
> And a list:
> - Item A
> - Item B
>
> And a table:
>
> | Key | Value |
> |-----|-------|
> | foo | bar   |

## Section 5: Sequential Code Blocks

```javascript
// Block 1
const a = 1;
```

```javascript
// Block 2
const b = 2;
```

```javascript
// Block 3
const c = a + b;
```

## Section 6: Image Sizing

Images should respect max-width:

![Small placeholder](https://via.placeholder.com/100x50.png)

![Medium placeholder](https://via.placeholder.com/400x200.png)

![Large placeholder](https://via.placeholder.com/1200x400.png)

## Section 7: Special Characters

Ampersand: &
Less than: <
Greater than: >
Copyright: (c)
Em dash: ---
En dash: --
Ellipsis: ...
Quotes: "double" and 'single'
Unicode: cafe, naive, resume
Emoji-like: :) :( :D

## Section 8: Repeated Paragraphs for Scroll Testing

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisi vel consectetur interdum, nisl nunc egestas nisi, vitae tincidunt nisl nunc euismod nisi.

Phasellus lacinia sapien quis est. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing.

Morbi vestibulum volutpat enim. Aliquam eu nunc. Nunc sed turpis. Sed mollis, eros et ultrices tempus, mauris ipsum aliquam libero, non adipiscing dolor urna a orci.

Nulla porta dolor. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos hymenaeos. Pellentesque dapibus hendrerit tortor.

Praesent egestas tristique nibh. Sed a libero. Cras varius. Donec vitae orci sed dolor rutrum auctor. Fusce egestas elit eget lorem.

Suspendisse nisl elit, rhoncus eget, elementum ac, condimentum eget, diam. Nam at tortor in tellus interdum sagittis. Aliquam lobortis.

Donec orci lectus, aliquam vel, dapibus a, blandit sit amet, nulla. Curabitur blandit mollis lacus. Nulla facilisi. Aenean tellus metus, bibendum sed, posuere ac, mattis non, nunc.

Vestibulum fringilla pede sit amet augue. In turpis. Pellentesque posuere. Praesent turpis. Aenean posuere, tortor sed cursus feugiat, nunc augue blandit nunc.

Ut a nisl id ante tempus hendrerit. Proin pretium, leo ac pellentesque mollis, felis nunc ultrices eros, sed gravida augue augue mollis justo.

Suspendisse eu ligula. Nulla facilisi. Donec id justo. Praesent porttitor, nulla vitae posuere iaculis, arcu nisl dignissim dolor, a pretium mi sem ut ipsum.

Curabitur suscipit suscipit tellus. Praesent vestibulum dapibus nibh. Etiam iaculis nunc ac metus. Ut id nisl quis enim dignissim sagittis.

Etiam sollicitudin, ipsum eu pulvinar rutrum, tellus ipsum laoreet sapien, quis venenatis ante odio sit amet eros. Proin magna. Duis vel nibh at velit scelerisque suscipit.

## Section 9: Back to Back Headers

### Header Three
#### Header Four
##### Header Five
###### Header Six
### Another Header Three
## Back to Two
# Back to One

## Section 10: End

This is the end of the large document test. If you've scrolled this far, the viewer handles large content well.
