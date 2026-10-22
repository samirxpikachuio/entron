# Entron Syntax Library

Entron is a plain-English dynamic programming language. Programs read like natural language.

## Table of Contents
- [Variables](#variables)
- [Output](#output)
- [Input](#input)
- [Math](#math)
- [Comparisons & Logic](#comparisons--logic)
- [Conditionals](#conditionals)
- [Loops](#loops)
- [Lists](#lists)
- [Functions](#functions)
- [Comments](#comments)

## Variables

```entron
define variable name as value
define name as value
set name to value
```

Examples:
```entron
define greeting as "Hello, World!"
define age as 25
set age to age plus 1
```

## Output

```entron
display value
display value joined with "text"
```

Examples:
```entron
display "Hello"
display name joined with " says hi"
```

## Input

```entron
ask "prompt" into variable
```

Example:
```entron
ask "What is your name? " into name
display "Hello, " joined with name
```

## Math

Operators (words): `plus`, `minus`, `times`, `divided by`, `modulo`

```entron
display 10 plus 25 times 2
display 100 divided by 4
display 17 modulo 5
```

## Comparisons & Logic

Comparisons: `is equal to`, `is not equal to`, `is greater than`, `is less than`,
`is greater than or equal to`, `is less than or equal to`

Logic: `and`, `or`, `not`

```entron
if age is greater than 18 then
  display "Adult"
end if
```

## Conditionals

```entron
if condition then
  ...
else
  ...
end if
```

## Loops

Repeat:
```entron
repeat N times
  ...
end repeat
```

While:
```entron
while condition
  ...
end while
```

For each:
```entron
for each item in list
  display item
end for
```

## Lists

```entron
create nums as list containing 1 and 2 and 3
append 4 to nums
remove 2 from nums
display nums
```

## Functions

```entron
function greet with name
  display "Hello, " joined with name
  return nothing
end function

call greet with "Entron"
```

## Comments

Lines starting with `#` are comments.

```entron
# This is a comment
define x as 5  # inline not supported; use full-line comments
```

## File Extension

Entron source files use `.entron` or `.ent`.

## Running

```sh
entron run file.entron
entron file.entron
entron repl
```

---

Entron v1.0.1 — The Modern Plain-English Programming Language.
