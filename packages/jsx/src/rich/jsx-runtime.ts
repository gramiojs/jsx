/**
 * Rich Messages JSX runtime for `@gramio/jsx`.
 *
 * Lowers a JSX tree directly to the Telegram **rich-markdown** dialect (Bot API 10.1
 * {@link https://core.telegram.org/bots/api#rich-messages | rich messages}) and produces a
 * branded {@link RichNode} — pass it straight to `ctx.send(...)` / `ctx.reply(...)` /
 * `ctx.editText(...)` and `@gramio/contexts` routes it to `sendRichMessage` (it shares the
 * `Symbol.for("@gramio/format/rich.RichString")` brand, so no `@gramio/format` dependency is
 * needed here).
 *
 * Enable per-file with the pragma:
 * ```tsx
 * /** @jsxImportSource @gramio/jsx/rich *\/
 * ```
 * or globally via `tsconfig` `"jsxImportSource": "@gramio/jsx/rich"`.
 *
 * @module
 */

export { jsx, jsx as jsxs, jsx as jsxDEV, Fragment };
export { RichNode };
export type { Structural };

/** Brand shared with `@gramio/format`'s `RichString` so `@gramio/contexts` routes it to `sendRichMessage`. */
const RICH_STRING = Symbol.for("@gramio/format/rich.RichString");

/** A lowered rich-markdown node. Carries the rendered dialect string; pass it to `ctx.send`. */
class RichNode {
	constructor(
		/** The rendered rich-markdown fragment. */
		public markdown: string,
		/** Whether this node is a block (separated from siblings by a blank line). */
		public block = false,
	) {}

	get [RICH_STRING](): true {
		return true;
	}

	/** Map onto the `rich_message` send param. */
	toInputRichMessage(): { markdown: string } {
		return { markdown: this.markdown };
	}

	toString(): string {
		return this.markdown;
	}

	toJSON(): string {
		return this.markdown;
	}
}

/** Structural nodes consumed by their parent element (never rendered on their own). */
type Structural =
	| { __tg: "li"; content: string; done?: boolean }
	| { __tg: "summary"; content: string }
	| { __tg: "tr"; cells: { content: string; header: boolean }[] }
	| { __tg: "td"; content: string; header?: boolean };

type RichChild =
	| RichNode
	| Structural
	| string
	| number
	| boolean
	| null
	| undefined;

// --- escaping (mirrors @gramio/format/rich; kept local so this runtime needs no format dep) ---

// Inline specials — always escaped. `& < >` → numeric entities; the rest backslash-escaped.
const INLINE_ESCAPE = /[\\`*_~=|[\]()<>&]/g;
function escapeInline(text: string): string {
	return text.replace(INLINE_ESCAPE, (char) => {
		if (char === "&") return "&#38;";
		if (char === "<") return "&#60;";
		if (char === ">") return "&#62;";
		return `\\${char}`;
	});
}

// Block starters (`#`, `-`, `+`) are only structural at the start of a line — escape them there
// only, so `e-mail` / `C++` stay clean mid-text while a literal "# hi" line can't become a heading.
function escapeText(text: string): string {
	return text
		.split("\n")
		.map((line) => {
			const m = /^(\s*)([#\-+])([\s\S]*)$/.exec(line);
			return m ? `${m[1]}\\${m[2]}${escapeInline(m[3])}` : escapeInline(line);
		})
		.join("\n");
}

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&#38;")
		.replaceAll("<", "&#60;")
		.replaceAll(">", "&#62;")
		.replaceAll('"', "&#34;");
}

function htmlAttribute(name: string, value: unknown): string {
	return value === undefined ? "" : ` ${name}="${escapeHtml(String(value))}"`;
}

function isStructural(value: unknown): value is Structural {
	return !!value && typeof value === "object" && "__tg" in value;
}

function normalizeChildren(children: unknown): RichChild[] {
	if (children == null || children === false || children === true) return [];
	if (Array.isArray(children)) return children.flatMap(normalizeChildren);
	return [children as RichChild];
}

/** Render inline children to one rich-markdown run (strings escaped, nodes inlined verbatim). */
function inline(children: RichChild[]): string {
	let out = "";
	for (const child of children) {
		if (child == null || typeof child === "boolean") continue;
		if (child instanceof RichNode) out += child.markdown;
		else if (isStructural(child)) continue;
		else out += escapeText(String(child));
	}
	return out;
}

/** Collect children as raw text (no escaping) — for code / formula content. */
function raw(children: RichChild[]): string {
	let out = "";
	for (const child of children) {
		if (child == null || typeof child === "boolean") continue;
		if (child instanceof RichNode) out += child.markdown;
		else if (isStructural(child)) continue;
		else out += String(child);
	}
	return out;
}

function htmlInline(children: RichChild[]): string {
	return inline(children)
		.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
		.replace(/_([^_]+)_/g, "<i>$1</i>")
		.replace(/~~([^~]+)~~/g, "<s>$1</s>")
		.replace(/\|\|([^|]+)\|\|/g, "<tg-spoiler>$1</tg-spoiler>")
		.replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Combine block/inline children for a container: blocks joined by blank lines. */
function combine(children: RichChild[]): string {
	const parts: string[] = [];
	let inlineRun = "";
	const flush = () => {
		if (inlineRun) {
			parts.push(inlineRun);
			inlineRun = "";
		}
	};
	for (const child of children) {
		if (child == null || typeof child === "boolean" || isStructural(child))
			continue;
		if (child instanceof RichNode && child.block) {
			flush();
			parts.push(child.markdown);
		} else if (child instanceof RichNode) {
			inlineRun += child.markdown;
		} else {
			inlineRun += escapeText(String(child));
		}
	}
	flush();
	return parts.join("\n\n");
}

type Props = Record<string, unknown> | null;

function prop<T = string>(props: Props, key: string): T | undefined {
	return props ? (props[key] as T | undefined) : undefined;
}

function jsx(type: string, props: Props = {}): RichNode | Structural {
	const children = normalizeChildren(props?.children);

	switch (type) {
		// --- inline ---
		case "b":
		case "strong":
			return new RichNode(`**${inline(children)}**`);
		case "i":
		case "em":
			return new RichNode(`_${inline(children)}_`);
		case "u":
			return new RichNode(`<u>${inline(children)}</u>`);
		case "s":
		case "strike":
			return new RichNode(`~~${inline(children)}~~`);
		case "spoiler":
			return new RichNode(`||${inline(children)}||`);
		case "mark":
			return new RichNode(`==${inline(children)}==`);
		case "sup":
			return new RichNode(`<sup>${inline(children)}</sup>`);
		case "sub":
			return new RichNode(`<sub>${inline(children)}</sub>`);
		case "code":
			return new RichNode(`\`${raw(children).replace(/`/g, "\\`")}\``);
		case "math":
			return new RichNode(`$${raw(children)}$`);
		case "a":
			return new RichNode(
				`[${inline(children)}](${prop(props, "href") ?? ""})`,
			);
		case "mention":
			return new RichNode(
				`[${inline(children)}](tg://user?id=${prop(props, "id") ?? 0})`,
			);
		case "custom-emoji":
			return new RichNode(
				`![${inline(children)}](tg://emoji?id=${prop(props, "emojiId") ?? ""})`,
			);
		case "date-time": {
			const fmt = prop(props, "format");
			return new RichNode(
				`![${inline(children)}](tg://time?unix=${prop(props, "unixTime") ?? 0}${fmt ? `&format=${fmt}` : ""})`,
			);
		}
		case "ref":
			return new RichNode(`[^${prop(props, "id") ?? ""}]`);

		// --- block ---
		case "h1":
		case "h2":
		case "h3":
		case "h4":
		case "h5":
		case "h6":
			return new RichNode(
				`${"#".repeat(Number(type[1]))} ${inline(children)}`,
				true,
			);
		case "p":
			return new RichNode(combine(children), true);
		case "hr":
			return new RichNode("---", true);
		case "pre": {
			const lang = prop(props, "language") ?? prop(props, "lang") ?? "";
			return new RichNode(`\`\`\`${lang}\n${raw(children)}\n\`\`\``, true);
		}
		case "math-block":
			return new RichNode(`$$${raw(children)}$$`, true);
		case "thinking":
			return new RichNode(
				`<tg-thinking>${inline(children)}</tg-thinking>`,
				true,
			);
		case "blockquote":
			if (prop<boolean>(props, "expandable") || prop(props, "credit")) {
				const credit = prop<unknown>(props, "credit");
				return new RichNode(
					`<blockquote${prop<boolean>(props, "expandable") ? " expandable" : ""}>${htmlInline(children)}${
						credit === undefined
							? ""
							: `<cite>${htmlInline(normalizeChildren(credit))}</cite>`
					}</blockquote>`,
					true,
				);
			}
			return new RichNode(
				combine(children)
					.split("\n")
					.map((line) => `>${line}`)
					.join("\n"),
				true,
			);
		case "footnote":
			return new RichNode(
				`[^${prop(props, "id") ?? ""}]: ${inline(children)}`,
				true,
			);
		case "media": {
			const caption = prop(props, "caption");
			return new RichNode(
				`![](${prop(props, "url") ?? ""}${caption ? ` "${String(caption).replace(/"/g, '\\"')}"` : ""})`,
				true,
			);
		}
		case "document": {
			const element = `<tg-document${htmlAttribute("src", prop(props, "url") ?? "")}></tg-document>`;
			const caption = prop<unknown>(props, "caption");
			return new RichNode(
				caption === undefined
					? element
					: `<figure>${element}<figcaption>${htmlInline(
							normalizeChildren(caption),
						)}</figcaption></figure>`,
				true,
			);
		}
		case "button": {
			const action = prop<string>(props, "type") ?? "disabled";
			let attributes = ` type="${escapeHtml(action)}"`;
			attributes += htmlAttribute("style", prop(props, "style"));
			switch (action) {
				case "url":
				case "web_app":
				case "login_url":
					attributes += htmlAttribute("url", prop(props, "url"));
					break;
				case "callback_data":
					attributes += htmlAttribute("data", prop(props, "data"));
					break;
				case "switch_inline_query":
				case "switch_inline_query_current_chat":
				case "switch_inline_query_chosen_chat":
					attributes += htmlAttribute("query", prop(props, "query"));
					break;
				case "copy_text":
					attributes += htmlAttribute("text", prop(props, "text"));
					break;
			}
			if (prop<boolean>(props, "requestWriteAccess"))
				attributes += " request-write-access";
			if (prop<boolean>(props, "allowUserChats"))
				attributes += " allow-user-chats";
			if (prop<boolean>(props, "allowBotChats"))
				attributes += " allow-bot-chats";
			if (prop<boolean>(props, "allowGroupChats"))
				attributes += " allow-group-chats";
			if (prop<boolean>(props, "allowChannelChats"))
				attributes += " allow-channel-chats";
			attributes += htmlAttribute("forward-text", prop(props, "forwardText"));
			return new RichNode(
				`<tg-button${attributes}>${escapeHtml(raw(children))}</tg-button>`,
			);
		}
		case "button-row":
			return new RichNode(
				`<tg-button-row${htmlAttribute("align", prop(props, "align"))}>${inline(
					children,
				)}</tg-button-row>`,
				true,
			);

		// --- list / table structural parents ---
		case "li":
			return {
				__tg: "li",
				content: inline(children),
				done: prop<boolean>(props, "done"),
			};
		case "ul":
			return new RichNode(renderList(children, "ul"), true);
		case "ol":
			return new RichNode(renderList(children, "ol"), true);
		case "tasklist":
			return new RichNode(renderList(children, "task"), true);
		case "summary":
			return { __tg: "summary", content: inline(children) };
		case "details": {
			const summary = children.find(
				(c): c is Extract<Structural, { __tg: "summary" }> =>
					isStructural(c) && c.__tg === "summary",
			);
			const body = combine(children);
			return new RichNode(
				`<details${prop(props, "open") ? " open" : ""}><summary>${summary?.content ?? ""}</summary>\n\n${body}\n\n</details>`,
				true,
			);
		}
		case "td":
		case "th":
			// `inline()` already escapes `|` (it's an inline special), so cells are pipe-safe.
			return { __tg: "td", content: inline(children), header: type === "th" };
		case "tr":
			return {
				__tg: "tr",
				cells: children
					.filter(
						(c): c is Extract<Structural, { __tg: "td" }> =>
							isStructural(c) && c.__tg === "td",
					)
					.map((c) => ({ content: c.content, header: c.header === true })),
			};
		case "table":
			return new RichNode(
				renderTable(
					children,
					prop(props, "align"),
					prop<boolean>(props, "compact") === true,
				),
				true,
			);

		case "br":
			return new RichNode("\n");
		case "rich":
		case "fragment":
			return new RichNode(combine(children), true);
		default:
			return new RichNode(combine(children), true);
	}
}

function renderList(children: RichChild[], kind: "ul" | "ol" | "task"): string {
	const items = children.filter(
		(c): c is Extract<Structural, { __tg: "li" }> =>
			isStructural(c) && c.__tg === "li",
	);
	return items
		.map((item, i) => {
			if (kind === "ol") return `${i + 1}. ${item.content}`;
			if (kind === "task")
				return `- [${item.done ? "x" : " "}] ${item.content}`;
			return `- ${item.content}`;
		})
		.join("\n");
}

function renderTable(
	children: RichChild[],
	align: unknown,
	compact: boolean,
): string {
	const rows = children.filter(
		(c): c is Extract<Structural, { __tg: "tr" }> =>
			isStructural(c) && c.__tg === "tr",
	);
	if (rows.length === 0) return "";
	const columns = Math.max(...rows.map((r) => r.cells.length));
	const aligns = Array.isArray(align) ? (align as string[]) : [];
	if (compact) {
		return `<table compact>${rows
			.map(
				(row, rowIndex) =>
					`<tr>${Array.from({ length: columns }, (_, index) => {
						const cell = row.cells[index];
						const tag = cell?.header || rowIndex === 0 ? "th" : "td";
						return `<${tag}${htmlAttribute("align", aligns[index])}>${
							cell?.content ?? ""
						}</${tag}>`;
					}).join("")}</tr>`,
			)
			.join("")}</table>`;
	}
	const renderRow = (cells: { content: string }[]) =>
		`| ${Array.from({ length: columns }, (_, i) => cells[i]?.content ?? "").join(" | ")} |`;
	const delimiter = `| ${Array.from({ length: columns }, (_, i) => {
		switch (aligns[i]) {
			case "center":
				return ":---:";
			case "right":
				return "---:";
			case "left":
				return ":---";
			default:
				return "---";
		}
	}).join(" | ")} |`;
	const [header, ...body] = rows;
	return [
		renderRow(header.cells),
		delimiter,
		...body.map((r) => renderRow(r.cells)),
	].join("\n");
}

const Fragment = (props: { children?: unknown }): RichNode =>
	new RichNode(combine(normalizeChildren(props?.children)), true);

// --- JSX typing ---

type Children = { children?: unknown };

type RichButtonStyle = "danger" | "success" | "primary" | "link";
type RichButtonProps =
	| { type: "url" | "web_app"; url: string; style?: RichButtonStyle }
	| {
			type: "login_url";
			url: string;
			forwardText?: string;
			requestWriteAccess?: boolean;
			style?: RichButtonStyle;
	  }
	| { type: "callback_data"; data: string; style?: RichButtonStyle }
	| {
			type: "switch_inline_query" | "switch_inline_query_current_chat";
			query?: string;
			style?: RichButtonStyle;
	  }
	| {
			type: "switch_inline_query_chosen_chat";
			query?: string;
			allowUserChats?: boolean;
			allowBotChats?: boolean;
			allowGroupChats?: boolean;
			allowChannelChats?: boolean;
			style?: RichButtonStyle;
	  }
	| { type: "copy_text"; text: string; style?: RichButtonStyle }
	| { type: "disabled"; style?: RichButtonStyle };

export namespace JSX {
	export type Element = RichNode | Structural;
	export interface ElementChildrenAttribute {
		children: object;
	}
	export interface IntrinsicElements {
		// inline
		b: Children;
		strong: Children;
		i: Children;
		em: Children;
		u: Children;
		s: Children;
		strike: Children;
		spoiler: Children;
		mark: Children;
		sup: Children;
		sub: Children;
		code: Children;
		math: Children;
		a: { href: string } & Children;
		mention: { id: number } & Children;
		"custom-emoji": { emojiId: string } & Children;
		"date-time": { unixTime: number; format?: string } & Children;
		ref: { id: string };
		// block
		h1: Children;
		h2: Children;
		h3: Children;
		h4: Children;
		h5: Children;
		h6: Children;
		p: Children;
		hr: Record<string, never>;
		br: Record<string, never>;
		pre: { language?: string; lang?: string } & Children;
		"math-block": Children;
		thinking: Children;
		blockquote: { expandable?: boolean; credit?: unknown } & Children;
		footnote: { id: string } & Children;
		media: { url: string; caption?: string };
		document: { url: string; caption?: unknown };
		button: RichButtonProps & Children;
		"button-row": { align?: "left" | "center" | "right" } & Children;
		// list
		ul: Children;
		ol: Children;
		tasklist: Children;
		li: { done?: boolean } & Children;
		// table
		table: {
			align?: ("left" | "center" | "right")[];
			compact?: boolean;
		} & Children;
		tr: Children;
		td: Children;
		th: Children;
		// collapsible
		details: { open?: boolean } & Children;
		summary: Children;
		// root
		rich: Children;
		fragment: Children;
	}
}
