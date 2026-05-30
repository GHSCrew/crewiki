// Pure, framework-agnostic markdown renderer shared by the client content
// view and the server-rendered public share page. No React, no "use client".

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function renderInline(raw: string): string {
  let s = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  s = s.replace(/\[\[(.+?)\]\]/g, (_, inner) => {
    const parts = inner.split("|");
    const target = parts[0].trim();
    const label = (parts[1] ?? parts[0]).trim();
    return `<a class="wikilink" href="/wiki/content/${slugify(target)}">${label}</a>`;
  });
  s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

const CALLOUT_ICONS: Record<string, string> = {
  note: "ℹ", tip: "💡", warning: "⚠", danger: "🔴",
  info: "ℹ", success: "✓", question: "?", example: "⋮", quote: '"',
};

function parseTableCells(row: string): string[] {
  return row.split("|").slice(1, -1).map((c) => c.trim());
}

function isTableStart(lines: string[], i: number): boolean {
  return (
    lines[i].includes("|") &&
    i + 1 < lines.length &&
    /^\|[\s\-:|]+\|$/.test(lines[i + 1])
  );
}

export function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.match(/^```/)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      html += `<pre><code${lang ? ` class="language-${escHtml(lang)}"` : ""}>${escHtml(codeLines.join("\n"))}</code></pre>`;
      i++;
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,3}) (.+)$/);
    if (hm) {
      const level = hm[1].length;
      const text = hm[2].trim();
      const id = slugify(text);
      html += `<h${level} id="${id}">${renderInline(text)}</h${level}>`;
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,})$/)) {
      html += "<hr>";
      i++;
      continue;
    }

    // Blockquote / callout
    if (line.startsWith("> ") || line === ">") {
      const bqLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        bqLines.push(lines[i].startsWith("> ") ? lines[i].slice(2) : "");
        i++;
      }
      const firstLine = bqLines[0] ?? "";
      const cm = firstLine.match(/^\[!([\w]+)\]\s*(.*)$/i);
      if (cm) {
        const type = cm[1].toLowerCase();
        const titleText = cm[2].trim() || (type.charAt(0).toUpperCase() + type.slice(1));
        const icon = CALLOUT_ICONS[type] ?? "📌";
        const bodyHtml = renderMarkdown(bqLines.slice(1).join("\n"));
        html += `<div class="callout callout-${escHtml(type)}"><div class="callout-title"><span>${icon}</span> ${escHtml(titleText)}</div><div class="callout-body">${bodyHtml}</div></div>`;
      } else {
        html += `<blockquote><p>${renderInline(bqLines.join(" "))}</p></blockquote>`;
      }
      continue;
    }

    // Table
    if (isTableStart(lines, i)) {
      const headers = parseTableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(parseTableCells(lines[i]));
        i++;
      }
      html +=
        "<table><thead><tr>" +
        headers.map((h) => `<th>${renderInline(h)}</th>`).join("") +
        "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c) => `<td>${renderInline(c)}</td>`).join("") + "</tr>").join("") +
        "</tbody></table>";
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      let isTask = false;
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        const body = lines[i].slice(2);
        const done = body.match(/^\[x\] (.+)$/i);
        const open = body.match(/^\[ \] (.+)$/);
        if (done) {
          isTask = true;
          items.push(`<li class="task-done">☑ ${renderInline(done[1])}</li>`);
        } else if (open) {
          isTask = true;
          items.push(`<li class="task-open">☐ ${renderInline(open[1])}</li>`);
        } else {
          items.push(`<li>${renderInline(body)}</li>`);
        }
        i++;
      }
      html += `<ul${isTask ? ' class="task-list"' : ""}>${items.join("")}</ul>`;
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const m = lines[i].match(/^\d+\. (.+)$/);
        if (m) items.push(`<li>${renderInline(m[1])}</li>`);
        i++;
      }
      html += `<ol>${items.join("")}</ol>`;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect until a blank line or a block-level starter
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,6} /) &&
      !lines[i].match(/^[-*] /) &&
      !lines[i].match(/^\d+\. /) &&
      !lines[i].startsWith(">") &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^(-{3,}|\*{3,})$/) &&
      !isTableStart(lines, i)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      html += `<p>${renderInline(paraLines.join(" "))}</p>`;
    } else {
      i++; // guard against infinite loop on unhandled line
    }
  }

  return html;
}

export function extractToc(content: string): Array<{ level: number; text: string; id: string }> {
  return content
    .split("\n")
    .filter((l) => /^#{1,3} /.test(l))
    .map((l) => {
      const m = l.match(/^(#{1,3}) (.+)$/)!;
      return { level: m[1].length, text: m[2].trim(), id: slugify(m[2].trim()) };
    });
}

const YT_RE = /^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\S+$/;

export function extractYoutubeFromMarkdown(content: string): { urls: string[]; strippedContent: string } {
  const lines = content.split("\n");
  const urls: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^> (\S+)$/);
    if (m && YT_RE.test(m[1])) {
      urls.push(m[1]);
      i++;
    } else {
      break;
    }
  }
  return { urls, strippedContent: lines.slice(i).join("\n") };
}

/** Plain-text excerpt for meta descriptions: strips the leading H1 and markdown syntax. */
export function plainExcerpt(content: string, max = 180): string {
  const text = content
    .replace(/^# [^\n]*\n?/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_~`|-]/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}
