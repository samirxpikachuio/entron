# Entron Syntax Library

Entron supports three levels of English for every construct (Level 1 existing, Level 2 simple, Level 3 natural). All three are accepted by the interpreter.

## Three Levels of English

### Variables
- Level 1: `define variable age as 18` / `display age`
- Level 2: `make age equal to 18` / `show age`
- Level 3: `let the age be 18` / `tell me the age`

### Changing values
- Level 1: `set score to 100` / `add 10 to score`
- Level 2: `change score to 100` / `increase score by 10`
- Level 3: `let the score be 100` / `make the score 10 more`

### Asking for input
- Level 1: `ask "What is your name?" into name`
- Level 2: `ask "What is your name?" and save as name`
- Level 3: `ask me for my name`

### Math
- Level 1: `define variable total as price plus tax`
- Level 2: `make total equal to price plus tax`
- Level 3: `add the price and tax together`

### Conditions
- Level 1: `if age is at least 18 then ... otherwise ... end if`
- Level 2: `if age is 18 or more then ...`
- Level 3: `if the age is 18 or older ... say "Adult" ... otherwise ... say "Underage" ... end`

### Repeating
- Level 1: `repeat 5 times ... end repeat`
- Level 2: `repeat 5 times ... end repeat`
- Level 3: `say "Hello" 5 times`

### Lists
- Level 1: `define variable fruits as list containing "Apple" and "Mango"` / `append "Orange" to fruits` / `display first item of fruits`
- Level 2: `make fruits contain "Apple" and "Mango"` / `add "Orange" to fruits` / `show first item of fruits`
- Level 3: `make a list of fruits: "Apple", "Mango"` / `add "Orange" to the list` / `tell me the first fruit`

### Functions
- Level 1: `define function greet with name ... end function` / `call greet with "Samir"`
- Level 2: `make a function called greet with name ... end function` / `run greet with "Samir"`
- Level 3: `teach the computer to greet someone named name ... end` / `greet Samir`

### Strings
- Level 1: `define variable message as uppercase of "hello"`
- Level 2: `make message equal to uppercase of "hello"`
- Level 3: `turn "hello" into uppercase`

### Files
- Level 1: `write "Hello!" to file "note.txt"` / `read file "note.txt" into contents`
- Level 2: `write "Hello!" to "note.txt"` / `read "note.txt" and save as contents`
- Level 3: `save "Hello!" in "note.txt"` / `read "note.txt"` / `tell me what it says`

### Waiting
- Level 1: `wait 2 seconds`
- Level 2: `wait for 2 seconds`
- Level 3: `wait for 2 seconds then say "Done"`

### Web requests
- Level 1: `define variable response as fetch url "https://example.com"`
- Level 2: `get data from "https://example.com"`
- Level 3: `get the data from "https://example.com"` / `tell me what you received`

All existing Level 1 syntax remains fully supported for compatibility.

--- Original reference below ---

`
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
