import { describe, expect, test } from "bun:test";
import { Fragment, type RichNode, jsx } from "./jsx-runtime.ts";

// Call jsx the way the JSX transform would: jsx(type, { ...props, children }).
function h(
	type: string,
	props: Record<string, unknown> = {},
	...children: unknown[]
) {
	return jsx(type as Parameters<typeof jsx>[0], {
		...props,
		children: children.length === 1 ? children[0] : children,
	});
}

const md = (node: unknown) => (node as RichNode).markdown;

describe("inline elements → rich-md tokens", () => {
	test("bold / italic / underline / strike / spoiler / mark", () => {
		expect(md(h("b", {}, "x"))).toBe("**x**");
		expect(md(h("i", {}, "x"))).toBe("_x_");
		expect(md(h("u", {}, "x"))).toBe("<u>x</u>");
		expect(md(h("s", {}, "x"))).toBe("~~x~~");
		expect(md(h("spoiler", {}, "x"))).toBe("||x||");
		expect(md(h("mark", {}, "x"))).toBe("==x==");
	});

	test("nested inline composes correctly", () => {
		expect(md(h("b", {}, h("i", {}, "x")))).toBe("**_x_**");
	});

	test("links / mention / custom-emoji / date-time", () => {
		expect(md(h("a", { href: "https://t.me/" }, "go"))).toBe(
			"[go](https://t.me/)",
		);
		expect(md(h("mention", { id: 42 }, "u"))).toBe("[u](tg://user?id=42)");
		expect(md(h("custom-emoji", { emojiId: "5" }, "👍"))).toBe(
			"![👍](tg://emoji?id=5)",
		);
		expect(md(h("date-time", { unixTime: 100, format: "wDT" }, "t"))).toBe(
			"![t](tg://time?unix=100&format=wDT)",
		);
	});

	test("code content is raw (only backticks escaped); sup/sub/math", () => {
		expect(md(h("code", {}, "a*b_c"))).toBe("`a*b_c`");
		expect(md(h("sup", {}, "2"))).toBe("<sup>2</sup>");
		expect(md(h("sub", {}, "n"))).toBe("<sub>n</sub>");
		expect(md(h("math", {}, "x^2"))).toBe("$x^2$");
	});

	test("plain text children are escaped (no injection)", () => {
		expect(md(h("p", {}, "**x** <b> & [l](u)"))).toBe(
			"\\*\\*x\\*\\* &#60;b&#62; &#38; \\[l\\]\\(u\\)",
		);
	});
});

describe("block elements", () => {
	test("headings 1–6", () => {
		expect(md(h("h1", {}, "T"))).toBe("# T");
		expect(md(h("h6", {}, "T"))).toBe("###### T");
	});

	test("paragraph / divider / pre", () => {
		expect(md(h("p", {}, "hi"))).toBe("hi");
		expect(md(h("hr"))).toBe("---");
		expect(md(h("pre", { language: "ts" }, "const a = 1"))).toBe(
			"```ts\nconst a = 1\n```",
		);
	});

	test("unordered / ordered / task lists", () => {
		expect(md(h("ul", {}, h("li", {}, "a"), h("li", {}, "b")))).toBe(
			"- a\n- b",
		);
		expect(md(h("ol", {}, h("li", {}, "a"), h("li", {}, "b")))).toBe(
			"1. a\n2. b",
		);
		expect(
			md(h("tasklist", {}, h("li", { done: true }, "a"), h("li", {}, "b"))),
		).toBe("- [x] a\n- [ ] b");
	});

	test("blockquote prefixes every line", () => {
		expect(md(h("blockquote", {}, h("p", {}, "one"), h("p", {}, "two")))).toBe(
			">one\n>\n>two",
		);
	});

	test("expandable blockquote supports a credit", () => {
		expect(
			md(
				h(
					"blockquote",
					{ expandable: true, credit: "The Author" },
					"Expandable <details>",
				),
			),
		).toBe(
			"<blockquote expandable>Expandable &#60;details&#62;<cite>The Author</cite></blockquote>",
		);
	});

	test("media / thinking / math-block", () => {
		expect(md(h("media", { url: "a.jpg", caption: "Cap" }))).toBe(
			'![](a.jpg "Cap")',
		);
		expect(md(h("thinking", {}, "Reasoning…"))).toBe(
			"<tg-thinking>Reasoning…</tg-thinking>",
		);
		expect(md(h("math-block", {}, "E=mc^2"))).toBe("$$E=mc^2$$");
	});

	test("details + summary", () => {
		const node = h(
			"details",
			{ open: true },
			h("summary", {}, h("b", {}, "More")),
			h("p", {}, "body"),
		);
		expect(md(node)).toBe(
			"<details open><summary>**More**</summary>\n\nbody\n\n</details>",
		);
	});

	test("table from tr/td with alignment + escaped pipes", () => {
		const node = h(
			"table",
			{ align: ["left", "center"] },
			h("tr", {}, h("th", {}, "H1"), h("th", {}, "H2")),
			h("tr", {}, h("td", {}, "a|b"), h("td", {}, h("b", {}, "c"))),
		);
		expect(md(node)).toBe("| H1 | H2 |\n| :--- | :---: |\n| a\\|b | **c** |");
	});

	test("document, rich buttons and compact table use the 10.3 HTML shape", () => {
		expect(
			md(
				h("document", {
					url: 'https://example.com/a.zip?x="unsafe"',
					caption: "Archive <ready>",
				}),
			),
		).toBe(
			'<figure><tg-document src="https://example.com/a.zip?x=&#34;unsafe&#34;"></tg-document><figcaption>Archive &#60;ready&#62;</figcaption></figure>',
		);

		const row = h(
			"button-row",
			{ align: "right" },
			h(
				"button",
				{ type: "url", url: "https://gramio.dev?a=1&b=2", style: "success" },
				"Open <GramIO>",
			),
			h("button", { type: "disabled" }, "Soon"),
		);
		expect(md(row)).toBe(
			'<tg-button-row align="right"><tg-button type="url" style="success" url="https://gramio.dev?a=1&#38;b=2">Open &#60;GramIO&#62;</tg-button><tg-button type="disabled">Soon</tg-button></tg-button-row>',
		);

		expect(
			md(
				h(
					"table",
					{ compact: true, align: ["left", "right"] },
					h("tr", {}, h("th", {}, "Name"), h("th", {}, "Value")),
					h("tr", {}, h("td", {}, "A < B"), h("td", {}, "42")),
				),
			),
		).toBe(
			'<table compact><tr><th align="left">Name</th><th align="right">Value</th></tr><tr><td align="left">A &#60; B</td><td align="right">42</td></tr></table>',
		);
	});
});

describe("composition + brand", () => {
	test("Fragment joins block children with blank lines", () => {
		const node = Fragment({
			children: [h("h1", {}, "Title"), h("p", {}, "Body")],
		});
		expect(md(node)).toBe("# Title\n\nBody");
	});

	test("a node is brand-detectable as a RichString (routes to sendRichMessage)", () => {
		const node = h("b", {}, "x") as RichNode;
		const brand = Symbol.for("@gramio/format/rich.RichString");
		expect((node as unknown as Record<symbol, unknown>)[brand]).toBe(true);
		expect(node.toInputRichMessage()).toEqual({ markdown: "**x**" });
	});
});
