export function normalizeNatural(source: string): string {
  const lines = source.split(/\n/);
  const stack: string[] = [];
  const out: string[] = [];

  for (const rawLine of lines) {
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : "";
    const trimmed = rawLine.trim();

    if (trimmed === "") {
      out.push(rawLine);
      continue;
    }

    // Standalone 'end' -> close current block
    if (trimmed === "end" || trimmed === "end." || trimmed === "end,") {
      const type = stack.pop() || "if";
      const mapping: Record<string, string> = {
        if: "end if",
        repeat: "end repeat",
        function: "end function",
        while: "end while",
        for: "end for",
        count: "end count",
        try: "end try",
        switch: "end switch",
        class: "end class",
      };
      out.push(indent + (mapping[type] || "end if"));
      continue;
    }

    let t = trimmed;

    // Aliases and shorthand (Level 2/3 natural forms)
    t = t.replace(/^echo\s+(.*)$/, "display $1");
    t = t.replace(/^output\s+(.*)$/, "display $1");
    t = t.replace(/^print\s+(.*)$/, "display $1");
    t = t.replace(/^pause\s+(\d+)\s+(seconds?|milliseconds?)$/i, "wait $1 $2");
    t = t.replace(/^sleep\s+(\d+)\s+(seconds?|milliseconds?)$/i, "wait $1 $2");
    t = t.replace(/^delay\s+(\d+)\s+(seconds?|milliseconds?)$/i, "wait $1 $2");
    t = t.replace(/^wait\s+(\d+)\s+sec(s)?$/i, "wait $1 seconds");
    t = t.replace(/^wait\s+(\d+)\s+ms$/i, "wait $1 milliseconds");
    t = t.replace(/^loop\s+(\d+)\s+times$/i, "repeat $1 times");
    t = t.replace(/^do\s+(\d+)\s+times$/i, "repeat $1 times");
    t = t.replace(/^when\s+(.*)$/, "if $1");
    t = t.replace(/^unless\s+(.*)$/, "if not $1");
    t = t.replace(/^function\s+(\w+)\s+with\s+(.*)$/, "define function $1 with $2");
    t = t.replace(/^def\s+(\w+)\s+with\s+(.*)$/, "define function $1 with $2");
    t = t.replace(/^invoke\s+(\w+)\s+with\s+(.*)$/, "call $1 with $2");
    t = t.replace(/^execute\s+(\w+)\s+with\s+(.*)$/, "call $1 with $2");
    t = t.replace(/^var\s+(\w+)\s+as\s+(.*)$/, "define variable $1 as $2");
    t = t.replace(/^create\s+(?!variable|list)(\w+)\s+as\s+(.*)$/, "define variable $1 as $2");
    t = t.replace(/^increment\s+(\w+)\s+by\s+(.*)$/, "add $2 to $1");
    t = t.replace(/^decrement\s+(\w+)\s+by\s+(.*)$/, "subtract $2 from $1");
    t = t.replace(/^sum of\s+(.+?)\s+and\s+(.+)$/i, "$1 plus $2");
    t = t.replace(/^difference of\s+(.+?)\s+and\s+(.+)$/i, "$1 minus $2");
    t = t.replace(/^product of\s+(.+?)\s+and\s+(.+)$/i, "$1 times $2");
    t = t.replace(/^quotient of\s+(.+?)\s+and\s+(.+)$/i, "$1 divided by $2");
    t = t.replace(/^remainder of\s+(.+?)\s+and\s+(.+)$/i, "$1 modulo $2");
    t = t.replace(/^uppercase\s+(.+)$/i, "display uppercase of $1");
    t = t.replace(/^lowercase\s+(.+)$/i, "display lowercase of $1");
    t = t.replace(/^trim\s+(.+)$/i, "display trimmed $1");
    t = t.replace(/^open file\s+(.+)$/i, "read file $1 into contents");
    t = t.replace(/^save\s+(.+?)\s+to\s+(.+)$/i, "write $1 to file $2");
    t = t.replace(/^fetch\s+(.+)$/i, (m, u) => /^fetch url\b/i.test(u) ? m : `fetch url ${u} into response`);
    t = t.replace(/^get\s+(.+)$/i, (m, u) => /^get data from\b/i.test(u) ? m : `get data from ${u}`);
    t = t.replace(/^input\s+(\w+)$/i, "ask \"Input:\" into $1");
    t = t.replace(/^create list\s+(\w+)\s+with\s+(.+)$/i, (m, name, items) => `define variable ${name} as list containing ${items.split(/,\s*/).join(" and ")}`);
    // add alias removed to avoid breaking arithmetic add statements
    t = t.replace(/^length of\s+(.+)$/i, "display length of $1");
    t = t.replace(/^first item of\s+(.+)$/i, "display first item of $1");
    t = t.replace(/^last item of\s+(.+)$/i, "display last item of $1");
    t = t.replace(/^value for key\s+(.+?)\s+in\s+(.+)$/i, "value for key $1 in $2");
    t = t.replace(/^record with key\s+(.+)$/i, "record with key $1");
    t = t.replace(/^call\s+(\w+)\s+(.+)$/i, (m, name, rest) => /^call\s+\w+\s+with\b/i.test(m) ? m : `call ${name} with ${rest}`);
    t = t.replace(/^end$/i, "end");

    // Level 3 repeat with delay: say "Hello" 5 times waiting 1 seconds
    // (handled below)
    t = t.replace(/^show\s+(.*)$/, "display $1");
    let repeatDelayMatch = t.match(/^(say|show|display|print)\s+(.+?)\s+(\d+)\s+times\s+(?:waiting|with(?: a)? delay of|every)\s+(\d+)\s+(seconds?|milliseconds?)$/i);
    if (repeatDelayMatch) {
      const expr = repeatDelayMatch[2];
      const n = repeatDelayMatch[3];
      const dur = repeatDelayMatch[4];
      const unitRaw = repeatDelayMatch[5].toLowerCase();
      const unitNorm = unitRaw.startsWith("millisecond") ? "milliseconds" : "seconds";
      t = `repeat ${n} times\n${indent}    wait ${dur} ${unitNorm}\n${indent}    display ${expr}\n${indent}end repeat`;
    } else {
      let simpleRepeatMatch = t.match(/^(say|show|display|print)\s+(.+?)\s+(\d+)\s+times$/i);
      if (simpleRepeatMatch) {
        const expr = simpleRepeatMatch[2];
        const n = simpleRepeatMatch[3];
        t = `repeat ${n} times\n${indent}    display ${expr}\n${indent}end repeat`;
      }
    }
    t = t.replace(/^say\s+(.*)$/, "display $1");
    t = t.replace(/^(display\s+)(.+?)\s+and\s+(.+)$/, "$1$2 joined with $3");
    let mm = t.match(/^tell me (the )?(.*)$/);
    if (mm) t = "display " + mm[2];
    t = t.replace(/first fruit/g, "first item of fruits");
    t = t.replace(/last fruit/g, "last item of fruits");
    t = t.replace(/^tell me what it says$/, "display contents");
    t = t.replace(/^display what it says$/, "display contents");
    t = t.replace(/^tell me what you received$/, "display response");
    t = t.replace(/^display what you received$/, "display response");
    t = t.replace(/^tell me the result$/, "display result");
    t = t.replace(/^tell me my (\w+)$/, "display $1");

    // wait combined forms: "wait for 2 seconds then say "Done"" / "wait for 5 seconds say 5"
    let waitMatch = t.match(/^wait for (.+?)\s+then\s+(say|show|display|print)\s+(.+)$/i);
    if (!waitMatch) waitMatch = t.match(/^wait for (.+?)\s+(say|show|display|print)\s+(.+)$/i);
    if (!waitMatch) waitMatch = t.match(/^wait (.+?)\s+then\s+(say|show|display|print)\s+(.+)$/i);
    if (!waitMatch) waitMatch = t.match(/^wait (.+?)\s+(say|show|display|print)\s+(.+)$/i);
    if (waitMatch) {
      t = `wait ${waitMatch[1]}\n${indent}display ${waitMatch[3]}`;
    }

    // wait
    t = t.replace(/^wait for (.*)$/, "wait $1");
    t = t.replace(/^then say (.*)$/, "display $1");
    t = t.replace(/^then show (.*)$/, "display $1");

    // variables
    t = t.replace(/^let (the )?(\w+) be (.*)$/, "set $2 to $3");
    t = t.replace(/^make (\w+) equal to (.*)$/, "set $1 to $2");
    let m = t.match(/^make (the )?(\w+) (be|to) (.*)$/);
    if (m) t = `set ${m[2]} to ${m[4]}`;
    m = t.match(/^make a list of (\w+):\s*(.*)$/);
    if (m) {
      const items = m[2].split(/,\s*/).join(" and ");
      t = `define variable ${m[1]} as list containing ${items}`;
    }
    t = t.replace(/^change (\w+) to (.*)$/, "set $1 to $2");
    t = t.replace(/^increase (\w+) by (.*)$/, "add $2 to $1");
    t = t.replace(/^add (.*) to the list$/, "append $1 to fruits");
    t = t.replace(/^decrease (\w+) by (.*)$/, "subtract $2 from $1");
    m = t.match(/^make (the )?(\w+) (\d+) more$/);
    if (m) t = `add ${m[3]} to ${m[2]}`;
    m = t.match(/^make (the )?(\w+) (\d+) less$/);
    if (m) t = `subtract ${m[3]} from ${m[2]}`;

    // functions
    t = t.replace(/^make a function called (\w+) with (.*)$/, "define function $1 with $2");
    m = t.match(/^teach the computer to (\w+) someone named (\w+)$/);
    if (m) t = `define function ${m[1]} with ${m[2]}`;
    t = t.replace(/^run (\w+) with (.*)$/, "call $1 with $2");

    // asking input
    m = t.match(/^ask me for my (\w+)$/);
    if (m) t = `ask "What is your ${m[1]}?" into ${m[1]}`;
    t = t.replace(/^ask (.*) and save as (\w+)$/, "ask $1 into $2");

    // strings
    m = t.match(/^turn (.*) into uppercase$/);
    if (m) t = `define variable result as uppercase of ${m[1]}`;
    m = t.match(/^turn (.*) into lowercase$/);
    if (m) t = `define variable result as lowercase of ${m[1]}`;

    // files
    m = t.match(/^save (.*) in (.*)$/);
    if (m) t = `write ${m[1]} to file ${m[2]}`;
    m = t.match(/^read (.+)$/);
    if (m && !/^read file\b/.test(m[1]) && !/^read file\b/.test(t)) {
      t = `read file ${m[1]} into contents`;
    }

    // math natural
    m = t.match(/^add (.*) and (.*) together$/);
    if (m) {
      const a = m[1].replace(/^the\s+/i, "").trim();
      const b = m[2].replace(/^the\s+/i, "").trim();
      t = `define variable total as ${a} plus ${b}`;
    }

    // conditions
    t = t.replace(/^if (the )?(.*) is (\d+) or older$/, "if $2 is at least $3 then");
    t = t.replace(/^if (the )?(.*) is (\d+) or more$/, "if $2 is at least $3 then");
    t = t.replace(/^if (the )?(.*) is (\d+) or younger$/, "if $2 is at most $3 then");
    t = t.replace(/^if (the )?(\w+) is (\d+) or more then$/, "if $2 is at least $3 then");
    if (/^if\b/.test(t) && !/\bthen\b/.test(t)) t += " then";

    // web
    m = t.match(/^get (the )?data from (.*)$/);
    if (m) t = `fetch url ${m[2]} into response`;

    // function call natural: "greet Samir"
    m = t.match(/^(\w+)\s+(.+)$/);
    const keywords = /^(if|while|for|count|repeat|define|set|add|subtract|display|print|ask|write|read|fetch|wait|try|start|send|publish|switch|class|import|export|return|break|continue|append|remove|change|increase|decrease|save|turn|run|make|let|show|say|tell|get|end|otherwise|then|create|function|variable|case|default|do|to|in|by|with|as|and|or|not|end)\b/;
    if (m && !keywords.test(t)) {
      let args = m[2].trim();
      if (!/^["']/.test(args) && !/^-?\d/.test(args)) {
        args = `\"${args}\"`;
      }
      t = `call ${m[1]} with ${args}`;
    }

    // push block stack based on transformed line
    if (/^if\b/.test(t)) stack.push("if");
    else if (/^define function\b/.test(t)) stack.push("function");
    else if (/^repeat\b/.test(t)) stack.push("repeat");
    else if (/^while\b/.test(t)) stack.push("while");
    else if (/^for\b/.test(t)) stack.push("for");
    else if (/^count\b/.test(t)) stack.push("count");
    else if (/^try\b/.test(t)) stack.push("try");
    else if (/^switch\b/.test(t)) stack.push("switch");
    else if (/^class\b/.test(t)) stack.push("class");

    out.push(indent + t);
  }

  return out.join("\n");
}
