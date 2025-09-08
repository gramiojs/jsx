export {
  jsx,
  jsx as jsxs,
  jsx as jsxDEV,
  Fragment,
  normalizeChildren,
  extractKeyboard,
};
export type { ButtonNode, RowNode, KeyboardNode };

import { InlineKeyboard, type TelegramInlineKeyboardMarkup, blockquote,
	bold,
	code,
	customEmoji,
	expandableBlockquote,
	FormattableString,
	format,
	italic,
	link,
	mention,
	pre,
	spoiler,
	strikethrough,
	underline, } from "gramio";

type ButtonNode = {
	type: "button";
	text: string;
	callbackData?: string;
	url?: string;
};
type RowNode = { type: "row"; buttons: ButtonNode[] };
type KeyboardNode =
	| { type: "keyboard"; rows: RowNode[] }
	| { type: "fragment"; children: KeyboardNode[] };
type Node = string | ButtonNode | RowNode | KeyboardNode | FormattableString;



	export namespace JSX {
  export interface IntrinsicElements {
    b: { children?: Node | Node[] | string | number };
    i: { children?: Node | Node[] | string | number };
    u: { children?: Node | Node[] | string | number };
    s: { children?: Node | Node[] | string | number };
    spoiler: { children?: Node | Node[] | string | number };
    a: { href: string; children?: Node | Node[] | string | number };
    mention: { id: number; children?: Node | Node[] | string | number };
    "custom-emoji": { emojiId: string; children?: Node | Node[] | string | number };
    code: { children?: Node | Node[] | string | number };
    pre: { children?: Node | Node[] | string | number };
    blockquote: { children?: Node | Node[] | string | number };
    "blockquote-expandable": { children?: Node | Node[] | string | number };
    br: Record<string, never>;
    keyboard: { children?: Node | Node[] };
    row: { children?: Node | Node[] };
    button: { children?: Node | Node[] | string | number; callbackData?: string; url?: string };
    fragment: { children?: Node | Node[] };
  }
}


function normalizeChildren(children: unknown): Node[] {
	if (children == null) return [];
	if (Array.isArray(children)) {
		return children.flatMap(normalizeChildren);
	}
	if (typeof children === "string" || typeof children === "number") {
		return [String(children)];
	}
	if (children instanceof FormattableString) {
		return [children];
	}
	if (
		typeof children === "object" &&
		children !== null &&
		"type" in children
	) {
		return [children as ButtonNode | RowNode | KeyboardNode];
	}
	return [];
}

function jsx(
	type: string,
	props: Record<string, unknown> | null = {},
): FormattableString | Node | { toJSON: () => TelegramInlineKeyboardMarkup } {
	const children = normalizeChildren(props?.children);

	const hasKeyboardChild = children.some(
		(c) =>
			c &&
			typeof c === "object" &&
			"type" in c &&
			["keyboard", "row", "button", "fragment"].includes(c.type),
	);

	if (type === "keyboard") {
		return extractKeyboard({ type: "keyboard", rows: children as RowNode[] });
	}
	if (type === "row") {
		return { type: "row", buttons: children as ButtonNode[] };
	}
	if (type === "button") {
		return {
			type: "button",
			text: children[0] ? String(children[0]) : "",
			callbackData: props?.callbackData
				? String(props.callbackData)
				: undefined,
			url: props?.url ? String(props.url) : undefined,
		};
	}

	const renderedChildren: FormattableString = children.reduce<FormattableString>(
		(acc, child) => {
			if (child instanceof FormattableString) return format`${acc}${child}`;
			if (typeof child === "string") return format`${acc}${child}`;
			if (child && typeof child === "object" && "type" in child) {
				return format`${acc}${jsx(child.type, child)}`;
			}
			return acc;
		},
		format``
);

	switch (type) {
		case "b":
			return format`${bold(renderedChildren)}`;
		case "i":
			return format`${italic(renderedChildren)}`;
		case "u":
			return format`${underline(renderedChildren)}`;
		case "s":
			return format`${strikethrough(renderedChildren)}`;
		case "spoiler":
			return format`${spoiler(renderedChildren)}`;
		case "code":
			return format`${code(renderedChildren)}`;
		case "pre":
			return format`${pre(renderedChildren)}`;
		case "blockquote":
			return format`${blockquote(renderedChildren)}`;
		case "blockquote-expandable":
			return format`${expandableBlockquote(renderedChildren)}`;
		case "a":
			return format`${link(renderedChildren, String(props?.href ?? ""))}`;
		case "mention":
			return format`${mention(renderedChildren, { id: Number(props?.id ?? 0), first_name: renderedChildren.text, is_bot: false })}`;
		case "custom-emoji":
			return format`${customEmoji(renderedChildren, String(props?.emojiId ?? ""))}`;
		case "fragment":
			if (hasKeyboardChild) {
				return { type: "fragment", children: children as KeyboardNode[] };
			}
			return renderedChildren;
		case "text":
			return format`${String(props?.value ?? "")}`;
		case "br":
			return format`\n`;
		default:
			return renderedChildren;
	}
}

const Fragment: (props: {children?: unknown;}) => Node | { toJSON: () => TelegramInlineKeyboardMarkup; } = (props: { children?: unknown }) =>
	jsx("fragment", props);

function extractKeyboard(node: KeyboardNode): { toJSON: () => TelegramInlineKeyboardMarkup } {
	const kb = new InlineKeyboard();

	if (node.type === "keyboard") {
		for (const row of node.rows) {
			for (const btn of row.buttons) {
				if (btn.callbackData) kb.text(btn.text, btn.callbackData);
				else if (btn.url) kb.url(btn.text, btn.url);
			}
			kb.row();
		}
	} else if (node.type === "fragment") {
		for (const child of node.children) {
			const childKb = extractKeyboard(child);
			// Merge the child keyboard into the main keyboard
			const childJson = childKb.toJSON();
			if (childJson.inline_keyboard) {
				for (const row of childJson.inline_keyboard) {
					for (const btn of row) {
						if (btn.callback_data) kb.text(btn.text, btn.callback_data);
						else if (btn.url) kb.url(btn.text, btn.url);
					}
					kb.row();
				}
			}
		}
	}

	return { toJSON: () => kb.toJSON() };
}
