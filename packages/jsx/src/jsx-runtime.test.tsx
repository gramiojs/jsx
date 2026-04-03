import { describe, expect, it } from "bun:test";
import { Bot, FormattableString, format } from "gramio";
import { TelegramTestEnvironment } from "@gramio/test";
import {
	jsx,
	jsxs,
	Fragment,
	normalizeChildren,
	extractKeyboard,
} from "./jsx-runtime.ts";

// Helper to call jsx as JSX would
function h(
	type: string,
	props: Record<string, unknown> | null = {},
): ReturnType<typeof jsx> {
	return jsx(type as Parameters<typeof jsx>[0], props);
}

describe("normalizeChildren", () => {
	it("returns empty array for null/undefined", () => {
		expect(normalizeChildren(null)).toEqual([]);
		expect(normalizeChildren(undefined)).toEqual([]);
	});

	it("wraps string as array", () => {
		expect(normalizeChildren("hello")).toEqual(["hello"]);
	});

	it("wraps number as string array", () => {
		expect(normalizeChildren(42)).toEqual(["42"]);
	});

	it("returns empty for booleans", () => {
		expect(normalizeChildren(true)).toEqual([]);
		expect(normalizeChildren(false)).toEqual([]);
	});

	it("flattens nested arrays", () => {
		expect(normalizeChildren(["a", ["b", "c"]])).toEqual(["a", "b", "c"]);
	});

	it("passes through FormattableString", () => {
		const fs = format`test`;
		const result = normalizeChildren(fs);
		expect(result).toHaveLength(1);
		expect(result[0]).toBeInstanceOf(FormattableString);
	});

	it("passes through objects with type property", () => {
		const btn = { type: "button", text: "Click" };
		const result = normalizeChildren(btn);
		expect(result).toEqual([btn]);
	});
});

describe("text formatting elements", () => {
	it("<b> renders bold", () => {
		const result = h("b", { children: "Bold" }) as FormattableString;
		expect(result.text).toBe("Bold");
		expect(result.entities).toEqual([
			{ type: "bold", offset: 0, length: 4 },
		]);
	});

	it("<i> renders italic", () => {
		const result = h("i", { children: "Italic" }) as FormattableString;
		expect(result.text).toBe("Italic");
		expect(result.entities).toEqual([
			{ type: "italic", offset: 0, length: 6 },
		]);
	});

	it("<u> renders underline", () => {
		const result = h("u", { children: "Underline" }) as FormattableString;
		expect(result.text).toBe("Underline");
		expect(result.entities).toEqual([
			{ type: "underline", offset: 0, length: 9 },
		]);
	});

	it("<s> renders strikethrough", () => {
		const result = h("s", { children: "Strike" }) as FormattableString;
		expect(result.text).toBe("Strike");
		expect(result.entities).toEqual([
			{ type: "strikethrough", offset: 0, length: 6 },
		]);
	});

	it("<spoiler> renders spoiler", () => {
		const result = h("spoiler", { children: "Hidden" }) as FormattableString;
		expect(result.text).toBe("Hidden");
		expect(result.entities).toEqual([
			{ type: "spoiler", offset: 0, length: 6 },
		]);
	});

	it("<code> renders inline code", () => {
		const result = h("code", { children: "x = 1" }) as FormattableString;
		expect(result.text).toBe("x = 1");
		expect(result.entities).toEqual([
			{ type: "code", offset: 0, length: 5 },
		]);
	});

	it("<pre> renders pre-formatted block", () => {
		const result = h("pre", {
			children: "code block",
		}) as FormattableString;
		expect(result.text).toBe("code block");
		expect(result.entities).toEqual([
			{ type: "pre", offset: 0, length: 10 },
		]);
	});

	it("<blockquote> renders blockquote", () => {
		const result = h("blockquote", {
			children: "Quote",
		}) as FormattableString;
		expect(result.text).toBe("Quote");
		expect(result.entities).toEqual([
			{ type: "blockquote", offset: 0, length: 5 },
		]);
	});

	it("<blockquote expandable> renders expandable blockquote", () => {
		const result = h("blockquote", {
			expandable: true,
			children: "Expand me",
		}) as FormattableString;
		expect(result.text).toBe("Expand me");
		expect(result.entities).toEqual([
			{ type: "expandable_blockquote", offset: 0, length: 9 },
		]);
	});

	it("<br /> renders newline", () => {
		const result = h("br", {}) as FormattableString;
		expect(result.text).toBe("\n");
	});
});

describe("link and mention elements", () => {
	it("<a> renders text link", () => {
		const result = h("a", {
			href: "https://gramio.dev",
			children: "GramIO",
		}) as FormattableString;
		expect(result.text).toBe("GramIO");
		expect(result.entities).toEqual([
			{
				type: "text_link",
				offset: 0,
				length: 6,
				url: "https://gramio.dev",
			},
		]);
	});

	it("<mention> renders text mention", () => {
		const result = h("mention", {
			id: 12345,
			children: "Alice",
		}) as FormattableString;
		expect(result.text).toBe("Alice");
		expect(result.entities).toEqual([
			{
				type: "text_mention",
				offset: 0,
				length: 5,
				user: { id: 12345, first_name: "Alice", is_bot: false },
			},
		]);
	});

	it("<custom-emoji> renders custom emoji", () => {
		const result = h("custom-emoji", {
			emojiId: "5222106016283378623",
			children: "👍",
		}) as FormattableString;
		expect(result.text).toBe("👍");
		expect(result.entities).toEqual([
			{
				type: "custom_emoji",
				offset: 0,
				length: 2,
				custom_emoji_id: "5222106016283378623",
			},
		]);
	});
});

describe("Fragment", () => {
	it("renders children as-is", () => {
		const result = Fragment({ children: "Hello" }) as FormattableString;
		expect(result.text).toBe("Hello");
	});

	it("concatenates multiple children", () => {
		const result = Fragment({
			children: ["Hello", " ", "World"],
		}) as FormattableString;
		expect(result.text).toBe("Hello World");
	});
});

describe("nested elements", () => {
	it("bold inside italic", () => {
		const inner = h("b", { children: "bold" }) as FormattableString;
		const result = h("i", { children: inner }) as FormattableString;
		expect(result.text).toBe("bold");
		expect(result.entities).toHaveLength(2);
		const types = result.entities.map(
			(e: { type: string }) => e.type,
		);
		expect(types).toContain("bold");
		expect(types).toContain("italic");
	});

	it("multiple children with formatting", () => {
		const boldPart = h("b", { children: "Hello" }) as FormattableString;
		const result = Fragment({
			children: [boldPart, " World"],
		}) as FormattableString;
		expect(result.text).toBe("Hello World");
		expect(result.entities).toEqual([
			{ type: "bold", offset: 0, length: 5 },
		]);
	});
});

describe("inline keyboard", () => {
	it("renders callback button", () => {
		const btn = h("button", {
			callbackData: "action:1",
			children: "Click",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { inline: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			inline_keyboard: { text: string; callback_data: string }[][];
		};
		expect(json.inline_keyboard).toBeDefined();
		expect(json.inline_keyboard[0][0].text).toBe("Click");
		expect(json.inline_keyboard[0][0].callback_data).toBe("action:1");
	});

	it("renders url button", () => {
		const btn = h("button", {
			url: "https://gramio.dev",
			children: "Open",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { inline: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			inline_keyboard: { text: string; url: string }[][];
		};
		expect(json.inline_keyboard[0][0].url).toBe("https://gramio.dev");
	});

	it("renders webApp button", () => {
		const btn = h("button", {
			webApp: { url: "https://app.example.com" },
			children: "App",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { inline: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			inline_keyboard: { text: string; web_app: { url: string } }[][];
		};
		expect(json.inline_keyboard[0][0].web_app.url).toBe(
			"https://app.example.com",
		);
	});

	it("renders loginUrl button", () => {
		const btn = h("button", {
			loginUrl: { url: "https://example.com/login" },
			children: "Login",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { inline: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			inline_keyboard: { text: string; login_url: { url: string } }[][];
		};
		expect(json.inline_keyboard[0][0].login_url.url).toBe(
			"https://example.com/login",
		);
	});

	it("renders switchToChat button", () => {
		const btn = h("button", {
			switchToChat: "query",
			children: "Switch",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { inline: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			inline_keyboard: {
				text: string;
				switch_inline_query: string;
			}[][];
		};
		expect(json.inline_keyboard[0][0].switch_inline_query).toBe("query");
	});

	it("renders switchToCurrentChat button", () => {
		const btn = h("button", {
			switchToCurrentChat: "query",
			children: "Switch Current",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { inline: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			inline_keyboard: {
				text: string;
				switch_inline_query_current_chat: string;
			}[][];
		};
		expect(
			json.inline_keyboard[0][0].switch_inline_query_current_chat,
		).toBe("query");
	});

	it("renders copyText button", () => {
		const btn = h("button", {
			copyText: "secret",
			children: "Copy",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { inline: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			inline_keyboard: {
				text: string;
				copy_text: { text: string };
			}[][];
		};
		expect(json.inline_keyboard[0][0].copy_text.text).toBe("secret");
	});

	it("renders multiple rows", () => {
		const btn1 = h("button", { callbackData: "a", children: "A" });
		const btn2 = h("button", { callbackData: "b", children: "B" });
		const row1 = h("row", { children: btn1 });
		const row2 = h("row", { children: btn2 });
		const kb = h("keyboard", {
			inline: true,
			children: [row1, row2],
		}) as { toJSON: () => unknown };

		const json = kb.toJSON() as {
			inline_keyboard: { text: string }[][];
		};
		expect(json.inline_keyboard[0][0].text).toBe("A");
		expect(json.inline_keyboard[1][0].text).toBe("B");
	});
});

describe("reply keyboard", () => {
	it("renders simple text button", () => {
		const btn = h("button", { children: "Hello" });
		const row = h("row", { children: btn });
		const kb = h("keyboard", { children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			keyboard: { text: string }[][];
		};
		expect(json.keyboard[0][0].text).toBe("Hello");
	});

	it("renders requestContact button", () => {
		const btn = h("button", {
			requestContact: true,
			children: "Share Contact",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			keyboard: { text: string; request_contact: boolean }[][];
		};
		expect(json.keyboard[0][0].request_contact).toBe(true);
	});

	it("renders requestLocation button", () => {
		const btn = h("button", {
			requestLocation: true,
			children: "Share Location",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			keyboard: { text: string; request_location: boolean }[][];
		};
		expect(json.keyboard[0][0].request_location).toBe(true);
	});

	it("renders requestPoll button", () => {
		const btn = h("button", {
			requestPoll: { type: "quiz" },
			children: "Quiz",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			keyboard: {
				text: string;
				request_poll: { type: string };
			}[][];
		};
		expect(json.keyboard[0][0].request_poll.type).toBe("quiz");
	});

	it("renders requestChat button", () => {
		const btn = h("button", {
			requestChat: {
				request_id: 1,
				chat_is_channel: true,
				chat_is_created: false,
			},
			children: "Choose Chat",
		});
		const row = h("row", { children: btn });
		const kb = h("keyboard", { children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as {
			keyboard: {
				text: string;
				request_chat: { request_id: number; chat_is_channel: boolean };
			}[][];
		};
		expect(json.keyboard[0][0].request_chat.request_id).toBe(1);
		expect(json.keyboard[0][0].request_chat.chat_is_channel).toBe(true);
	});

	it("supports oneTime option", () => {
		const btn = h("button", { children: "Click" });
		const row = h("row", { children: btn });
		const kb = h("keyboard", { oneTime: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as { one_time_keyboard: boolean };
		expect(json.one_time_keyboard).toBe(true);
	});

	it("supports persistent option", () => {
		const btn = h("button", { children: "Click" });
		const row = h("row", { children: btn });
		const kb = h("keyboard", { persistent: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as { is_persistent: boolean };
		expect(json.is_persistent).toBe(true);
	});

	it("supports selective option", () => {
		const btn = h("button", { children: "Click" });
		const row = h("row", { children: btn });
		const kb = h("keyboard", { selective: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as { selective: boolean };
		expect(json.selective).toBe(true);
	});

	it("supports resized option", () => {
		const btn = h("button", { children: "Click" });
		const row = h("row", { children: btn });
		const kb = h("keyboard", { resized: true, children: row }) as {
			toJSON: () => unknown;
		};

		const json = kb.toJSON() as { resize_keyboard: boolean };
		expect(json.resize_keyboard).toBe(true);
	});

	it("supports placeholder option", () => {
		const btn = h("button", { children: "Click" });
		const row = h("row", { children: btn });
		const kb = h("keyboard", {
			placeholder: "Type here...",
			children: row,
		}) as { toJSON: () => unknown };

		const json = kb.toJSON() as { input_field_placeholder: string };
		expect(json.input_field_placeholder).toBe("Type here...");
	});
});

function commandUpdate(text: string, chatId = 1, userId = 1) {
	return {
		update_id: Math.floor(Math.random() * 100000),
		message: {
			message_id: Math.floor(Math.random() * 100000),
			date: Math.floor(Date.now() / 1000),
			chat: { id: chatId, type: "private" as const },
			from: { id: userId, first_name: "Test", is_bot: false },
			text,
			entities: [{ type: "bot_command" as const, offset: 0, length: text.split(" ")[0].length }],
		},
	};
}

describe("integration with gramio bot", () => {
	it("bot sends formatted JSX message", async () => {
		const bot = new Bot("test");

		bot.command("start", (ctx) =>
			ctx.send(
				<>
					<b>Welcome</b> to the bot!
				</>,
			),
		);

		const env = new TelegramTestEnvironment(bot);
		await env.emitUpdate(commandUpdate("/start"));

		expect(env.apiCalls[0].method).toBe("sendMessage");
		const sent = env.apiCalls[0].params.text as FormattableString;
		expect(sent.text).toBe("Welcome to the bot!");
		expect(sent.entities).toEqual([
			{ type: "bold", offset: 0, length: 7 },
		]);
	});

	it("bot sends message with inline keyboard from JSX", async () => {
		const bot = new Bot("test");

		bot.command("menu", (ctx) =>
			ctx.send("Choose:", {
				reply_markup: (
					<keyboard inline>
						<row>
							<button callbackData="opt:1">Option 1</button>
							<button callbackData="opt:2">Option 2</button>
						</row>
					</keyboard>
				),
			}),
		);

		const env = new TelegramTestEnvironment(bot);
		await env.emitUpdate(commandUpdate("/menu"));

		expect(env.apiCalls[0].method).toBe("sendMessage");
		const rawMarkup = env.apiCalls[0].params.reply_markup as { toJSON: () => unknown };
		const markup = (typeof rawMarkup.toJSON === "function" ? rawMarkup.toJSON() : rawMarkup) as {
			inline_keyboard: { text: string; callback_data: string }[][];
		};
		expect(markup.inline_keyboard[0]).toHaveLength(2);
		expect(markup.inline_keyboard[0][0].text).toBe("Option 1");
		expect(markup.inline_keyboard[0][0].callback_data).toBe("opt:1");
		expect(markup.inline_keyboard[0][1].text).toBe("Option 2");
		expect(markup.inline_keyboard[0][1].callback_data).toBe("opt:2");
	});

	it("bot sends complex formatted message", async () => {
		const bot = new Bot("test");

		bot.command("info", (ctx) =>
			ctx.send(
				<>
					<b>Title</b>
					<br />
					<i>Subtitle</i>
					<br />
					<code>some_code()</code>
				</>,
			),
		);

		const env = new TelegramTestEnvironment(bot);
		await env.emitUpdate(commandUpdate("/info"));

		const sent = env.apiCalls[0].params.text as FormattableString;
		expect(sent.text).toBe("Title\nSubtitle\nsome_code()");
		expect(sent.entities).toHaveLength(3);
	});

	it("bot sends reply keyboard from JSX", async () => {
		const bot = new Bot("test");

		bot.command("kb", (ctx) =>
			ctx.send("Choose:", {
				reply_markup: (
					<keyboard oneTime placeholder="Pick one">
						<row>
							<button>Option A</button>
							<button>Option B</button>
						</row>
					</keyboard>
				),
			}),
		);

		const env = new TelegramTestEnvironment(bot);
		await env.emitUpdate(commandUpdate("/kb"));

		const rawMarkup = env.apiCalls[0].params.reply_markup as { toJSON: () => unknown };
		const markup = (typeof rawMarkup.toJSON === "function" ? rawMarkup.toJSON() : rawMarkup) as {
			keyboard: { text: string }[][];
			one_time_keyboard: boolean;
			input_field_placeholder: string;
		};
		expect(markup.keyboard[0][0].text).toBe("Option A");
		expect(markup.keyboard[0][1].text).toBe("Option B");
		expect(markup.one_time_keyboard).toBe(true);
		expect(markup.input_field_placeholder).toBe("Pick one");
	});

	it("bot sends message via on('message') handler", async () => {
		const bot = new Bot("test");

		bot.on("message", (ctx) =>
			ctx.send(
				<>
					<i>Echo:</i> {ctx.text}
				</>,
			),
		);

		const env = new TelegramTestEnvironment(bot);
		const user = env.createUser({ first_name: "Eve" });

		await user.sendMessage("hello");

		expect(env.apiCalls[0].method).toBe("sendMessage");
		const sent = env.apiCalls[0].params.text as FormattableString;
		expect(sent.text).toBe("Echo: hello");
		expect(sent.entities).toEqual([
			{ type: "italic", offset: 0, length: 5 },
		]);
	});
});

describe("jsxs alias", () => {
	it("jsxs is the same function as jsx", () => {
		expect(jsxs).toBe(jsx);
	});
});
