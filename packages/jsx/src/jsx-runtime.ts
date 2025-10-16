export {
	jsx,
	jsx as jsxs,
	jsx as jsxDEV,
	Fragment,
	normalizeChildren,
	extractKeyboard,
};
export type { ButtonNode, RowNode, KeyboardNode };

import {
	InlineKeyboard,
	type TelegramInlineKeyboardMarkup,
	blockquote,
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
	underline,
	type TelegramReplyKeyboardMarkup,
	Keyboard,
	type TelegramKeyboardButtonRequestChat,
	type TelegramSwitchInlineQueryChosenChat,
	type TelegramLoginUrl,
	type TelegramWebAppInfo,
	type TelegramCallbackGame,
} from "gramio";

type Node = TextNode | ButtonNode | RowNode | KeyboardNode | FormattableString;

export namespace JSX {
	export interface IntrinsicElements {
		b: { children?: Node | Node[] };
		i: { children?: Node | Node[] };
		u: { children?: Node | Node[] };
		s: { children?: Node | Node[] };
		spoiler: { children?: Node | Node[] };
		a: { href: string; children?: Node | Node[] };
		mention: { id: number; children?: Node | Node[] };
		"custom-emoji": {
			emojiId: string;
			children?: Node | Node[];
		};
		code: { children?: Node | Node[] };
		pre: { children?: Node | Node[] };
		blockquote: { expandable?: boolean; children?: Node | Node[] };
		br: Record<string, never>;
		button:
			| {
					kind: "inline"; // you can specify it just to verify if you use correct props for your kind of keyboard, srry for this ugly solution i need more sleep :D
					children?: TextNode[];
					callbackData?: string;
					url?: string;
					webApp?: { url: string };
					loginUrl?: TelegramLoginUrl;
					switchToChat?: string;
					switchToCurrentChat?: string;
					switchToChosenChat?: string | TelegramSwitchInlineQueryChosenChat;
					copyText?: string;
					game?: TelegramCallbackGame;
			  }
			| {
					kind?: "reply";
					children?: Node | Node[];
					requestChat?: TelegramKeyboardButtonRequestChat;
					requestContact?: boolean;
					requestLocation?: boolean;
					requestPoll?: { type: "quiz" | "regular" };
					webApp?: { url: string };
			  };

		keyboard:
			| {
					inline: true;
					children?: InlineRowNode[];
			  }
			| {
					inline?: false;
					persistent?: boolean;
					selective?: boolean;
					resized?: boolean;
					oneTime?: boolean;
					placeholder?: string;
					children?: ReplyRowNode[];
			  };

		row: { children?: ButtonNode[] };

		fragment: { children?: Node | Node[] };
	}
}

type InlineButtonNode = {
	type: "button";
	text: string;
	callbackData?: string;
	url?: string;
	webApp?: { url: string };
	loginUrl?: TelegramLoginUrl;
	switchToChat?: string;
	switchToChosenChat?: string | TelegramSwitchInlineQueryChosenChat;
	switchToCurrentChat?: string;
	copyText?: string;
	game?: TelegramCallbackGame;
	pay?: boolean;
};

type ReplyButtonNode = {
	type: "button";
	text: string;
	requestChat?: TelegramKeyboardButtonRequestChat;
	requestContact?: boolean;
	requestLocation?: boolean;
	requestPoll?: { type: "quiz" | "regular" };
	webApp?: TelegramWebAppInfo;
};

type ButtonNode = InlineButtonNode | ReplyButtonNode;

type TextNode = string | number | boolean;
type InlineRowNode = { type: "row"; buttons: InlineButtonNode[] };
type ReplyRowNode = { type: "row"; buttons: ReplyButtonNode[] };
type RowNode = InlineRowNode | ReplyRowNode;

type KeyboardNode = {
	type: "keyboard";
	rows: RowNode[];
	inline?: boolean;
	persistent?: boolean;
	selective?: boolean;
	resized?: boolean;
	oneTime?: boolean;
	placeholder?: string;
};

function normalizeChildren(children: unknown): Node[] {
	if (children == null) return [];
	if (Array.isArray(children)) {
		return children.flatMap(normalizeChildren);
	}
	if (typeof children === "string" || typeof children === "number") {
		return [String(children)];
	}

	if (typeof children === "boolean") {
		return [];
	}

	if (children instanceof FormattableString) {
		return [children];
	}
	if (typeof children === "object" && children !== null && "type" in children) {
		return [children as ButtonNode | RowNode | KeyboardNode];
	}
	return [];
}

function jsx<K extends keyof JSX.IntrinsicElements>(
	type: K | "text",
	props: Record<string, unknown> | null = {},
): FormattableString | Node | KeyboardResult {
	const children = normalizeChildren(props?.children);

	if (type === "keyboard") {
		const { children: _, ...rest } = props ?? {};
		return extractKeyboard({
			type: "keyboard",
			rows: children as RowNode[],
			...rest,
		});
	}
	if (type === "row") {
		return { type: "row", buttons: children as ButtonNode[] };
	}
	if (type === "button") {
		const { children: _, ...rest } = props ?? {};
		return {
			type: "button",
			text: children[0] ? String(children[0]) : "",
			...rest,
		};
	}

	const renderedChildren: FormattableString =
		children.reduce<FormattableString>((acc, child) => {
			if (child instanceof FormattableString) return format`${acc}${child}`;
			if (typeof child === "string") return format`${acc}${child}`;
			if (child && typeof child === "object" && "type" in child) {
				return acc;
			}
			return acc;
		}, format``);

	switch (type) {
		case "b":
			return bold(renderedChildren);
		case "i":
			return italic(renderedChildren);
		case "u":
			return underline(renderedChildren);
		case "s":
			return strikethrough(renderedChildren);
		case "spoiler":
			return spoiler(renderedChildren);
		case "code":
			return code(renderedChildren);
		case "pre":
			return pre(renderedChildren);
		case "blockquote":
			return props?.expandable
				? expandableBlockquote(renderedChildren)
				: blockquote(renderedChildren);
		case "a":
			return link(renderedChildren, String(props?.href ?? ""));
		case "mention":
			return mention(renderedChildren, {
				id: Number(props?.id ?? 0),
				first_name: renderedChildren.text,
				is_bot: false,
			});
		case "custom-emoji":
			return customEmoji(renderedChildren, String(props?.emojiId ?? ""));
		case "fragment":
			return renderedChildren;
		case "text":
			return format`${String(props?.value ?? "")}`;
		case "br":
			return format`\n`;
		default:
			return renderedChildren;
	}
}

const Fragment: (props: { children?: unknown }) => Node | KeyboardResult =
	(props: {
		children?: unknown;
	}) => jsx("fragment", props);

type KeyboardResult = {
	toJSON: () => TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup;
};

function extractKeyboard(node: KeyboardNode): KeyboardResult {
	let kb: InlineKeyboard | Keyboard;

	if (node.inline) {
		kb = new InlineKeyboard();

		for (const row of node.rows) {
			for (const btn of row.buttons) {
				if ("callbackData" in btn && btn.callbackData)
					kb.text(btn.text, btn.callbackData);
				else if ("url" in btn && btn.url) kb.url(btn.text, btn.url);
				else if ("webApp" in btn && btn.webApp)
					kb.webApp(btn.text, btn.webApp.url);
				else if ("loginUrl" in btn && btn.loginUrl)
					kb.login(btn.text, btn.loginUrl.url);
				else if ("switchToChat" in btn && btn.switchToChat)
					kb.switchToChat(btn.text, btn.switchToChat as string);
				else if ("switchToChosenChat" in btn && btn.switchToChosenChat)
					kb.switchToChosenChat(btn.text, btn.switchToChosenChat);
				else if ("switchToCurrentChat" in btn && btn.switchToCurrentChat)
					kb.switchToCurrentChat(btn.text, btn.switchToCurrentChat as string);
				else if ("game" in btn && btn.game) kb.game(btn.text, btn.game);
				else if ("copyText" in btn && btn.copyText)
					kb.copy(btn.text, btn.copyText);
				else if ("pay" in btn && btn.pay) kb.pay(btn.text);
			}
			kb.row();
		}
	} else {
		kb = new Keyboard();
		if ("persistent" in node && node.persistent) kb.persistent();
		if ("oneTime" in node && node.oneTime) kb.oneTime();
		if ("selective" in node && node.selective) kb.selective();
		if ("resized" in node && node.resized) kb.resized();
		if ("placeholder" in node && node.placeholder)
			kb.placeholder(node.placeholder);

		for (const row of node.rows) {
			for (const btn of row.buttons) {
				if ("requestContact" in btn && btn.requestContact)
					kb.requestContact(btn.text);
				else if ("requestChat" in btn && btn.requestChat)
					kb.requestChat(btn.text, btn.requestChat.request_id, btn.requestChat);
				else if ("requestLocation" in btn && btn.requestLocation)
					kb.requestLocation(btn.text);
				else if ("requestPoll" in btn && btn.requestPoll)
					kb.requestPoll(btn.text, btn.requestPoll.type);
				else if ("webApp" in btn && btn.webApp)
					kb.webApp(btn.text, btn.webApp.url);
				else kb.text(btn.text);
			}
			kb.row();
		}
	}

	return { toJSON: () => kb.toJSON() };
}
