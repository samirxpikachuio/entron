# Entron Language — Rules & Methods Reference

> Comprehensive reference of the Entron programming language: syntax rules, statements, operators, and built-in methods.  
> Entron source files use the `.entron` or `.ent` extension.

## 1. Lexical Rules

- **Comments** — lines starting with `note:`, `comment:`, or `--` are ignored. Full-line comments only.
- **Case sensitivity** — keywords are lowercase; identifiers/variable names are case-insensitive (stored lowercased).
- **Statement separator** — newline. Indentation is not significant.
- **File extensions** — `.entron` or `.ent`.

## 2. Data Types & Literals

| Type | Description |
|---|---|
| `number` | Integer or decimal (e.g. `42`, `3.14`) |
| `string` | Double- or single-quoted text, supports escapes and `{{ ... }}` interpolation |
| `boolean` | `true`/`false` (also `yes`/`no`) |
| `nothing` | Null/none value (`nothing` or `none`) |
| `list` | Ordered collection |
| `record` | Key-value map (dictionary) |

Literals: numbers `100`, `-5`, `3.14`; negative `negative 42`; strings `"Hello"`; booleans; nothing; `empty list`; `empty record`.

## 3. Variables & Mutability

```entron
define variable name as value
define name as value
create name as value
set name to value
```

Mutation helpers:
```entron
add 25 to score
subtract 10 from score
change score by 5
```

Member assignment:
```entron
set key "country" in user to "USA"
```

## 4. Output & Input

```entron
display value
display value joined with "text"
print value
ask "prompt" into variable
```

## 5. Math Operators

| Operation | Entron | Traditional |
|---|---|---|
| Addition | `a plus b` | `a + b` |
| Subtraction | `a minus b` | `a - b` |
| Multiplication | `a times b` | `a * b` |
| Division | `a divided by b` | `a / b` |
| Modulo | `a modulo b` | `a % b` |
| Concat | `a joined with b` | `a + b` |
| Negative | `negative 42` | `-42` |
| Sqrt | `math square root of 144` | `Math.sqrt` |
| Power | `math power of 2 to 8` | `Math.pow` |
| Abs | `math absolute value of x` | `Math.abs` |
| Floor | `math floor of x` | `Math.floor` |
| Ceil | `math ceil of x` | `Math.ceil` |
| Round | `math round of x` | `Math.round` |
| Random | `random number between 1 and 100` | rand |

Note: `times` repeats strings: `"ha" times 3`.

## 6. Comparisons & Logic

Comparisons: `is equal to`, `is not equal to`, `is greater than`, `is less than`, `is at least`, `is at most`, `contains`.  
Logic: `and`, `or`, `not`.

## 7. Unary Methods

`length of x`, `uppercase of x`, `lowercase of x`, `trimmed x`, `reversed x`, `sorted x`, `keys of x`, `values of x`, `not x`, `negative x`.  
List access: `first item of list`, `last item of list`, `item at position N of list`.  
Record access: `value for key "k" in record`.  
String: `split "a,b,c" by ","`. JSON: `parse json expr`. Other: `current timestamp`.

## 8. Conditionals

```entron
if condition then
    ...
otherwise if condition then
    ...
otherwise
    ...
end if
```
## 13. Strings

Interpolation:
```entron
display "Hello {{ name }}!"
display "Score: {{ score divided by 2 }}%"
```

Methods:
```entron
trimmed str
uppercase of str
lowercase of str
split "a,b,c" by ","
```

## 14. File I/O

```entron
write "Hello file!" to file "log.txt"
append "Second line" to file "log.txt"
if file exists "log.txt" then
    define variable contents as ""
    read file "log.txt" into contents
    display contents
end if
```

## 15. Error Handling

```entron
try
    define variable broken as 100 divided by 0
otherwise on error err
    display "Recovered: " joined with err
end try
```

## 16. Async Timers

```entron
wait 250 milliseconds
wait 2 seconds
```

## 17. Network Fetch

```entron
define variable response as fetch url "https://api.example.com/data" with headers record with key "Content-Type" as "application/json"
display response
```

## 18. Built-In Servers

REST:
```entron
define function handleApiRequest with request
    define variable path as value for key "path" in request
    if path is equal to "/api/status" then
        return record with key "status" as 200 and key "type" as "application/json" and key "body" as "{\"status\":\"healthy\"}"
    otherwise
        return record with key "status" as 404 and key "body" as "Not found"
    end if
end function
start http server on port 3000 with handler handleApiRequest
```

WebSocket:
```entron
define function onClientConnected with client_id
    send message "Welcome!" to socket client_id
end function
define function onClientMessage with client_id and message
    send message "Echo: " joined with message to socket client_id
end function
start websocket server on port 8080 with on open onClientConnected and on message onClientMessage
```

GraphQL:
```entron
define variable schema as "type Query { hello: String, time: String }"
define variable resolvers as record with key "hello" as "Hello GraphQL!" and key "time" as "2026-10-19"
start graphql server on port 4000 with schema schema and resolvers resolvers
```

MQTT:
```entron
define function onMqttMessage with topic and payload
    display "Telemetry on " joined with topic joined with ": " joined with payload
    publish mqtt topic "ack/status" with payload "Received"
end function
start mqtt server on port 1883 with handler onMqttMessage
```

Socket/MQTT statements:
```entron
send message "text" to socket client_id
publish mqtt topic "topic" with payload "payload"
```

## 19. Constants

- `pi` → π
- `euler` → e
- `true` / `yes` → boolean true
- `false` / `no` → boolean false
- `nothing` / `none` → null

## Notes

- Lambda and class/import/export syntax exists in parser but runtime support may be limited.
- List comprehension syntax exists in parser; runtime support may be limited.


Switch:
```entron
switch value
    case 1
        ...
    otherwise
        ...
end switch
```

## 9. Loops

```entron
repeat N times
    ...
end repeat

count from 1 to 5 as index do
    ...
end count

while condition do
    ...
end while

for each item in list do
    ...
end for
```

Break/continue: `break loop`, `continue loop`.

## 10. Functions

```entron
define function name with param1 and param2
    ...
    return value
end function
define variable result as call name with arg1 and arg2
```

## 11. Lists

```entron
define variable nums as list containing 1 and 2 and 3
define variable empty_items as empty list
append 4 to nums
remove item at position 1 from nums
```

Access: `length of nums`, `first item of nums`, `last item of nums`, `item at position 2 of nums`, `sorted nums`, `reversed nums`, `nums contains 20`.

## 12. Records

```entron
define variable user as record with key "name" as "Grace" and key "role" as "Engineer"
define variable empty_rec as empty record
value for key "name" in user
set key "country" in user to "USA"
keys of user
values of user
```
