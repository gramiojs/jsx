import { Bot } from "gramio";

const bot = new Bot(process.env.BOT_TOKEN as string)
	.command("start", (context) => context.send(<b>Hello!</b>))
	.command("test", async (context) => {
		await context.reply(
			<>
				{/* Basic formatting */}
				<b>Bold text</b>
				<br />
				<i>Italic text</i>
				<br />
				<u>Underlined text</u>
				<br />
				<s>Strikethrough</s>
				<br />

				{/* Spoiler with nested bold */}
				<spoiler>
					<b>Bold spoiler</b>
				</spoiler>
				<br />

				{/* Links and mentions */}
				<a href="https://example.com">example.com</a>
				<br />
				<mention id={context.from.id}>Your ID: {context.from.id}</mention>
				<br />

				{/* Code blocks */}
				<code>print("Hello")</code>
				<br />
				<pre>
					{`function greet() {
  console.log("Hello, world!");
}`}
				</pre>
				<br />

				{/* Blockquotes */}
				<blockquote>Simple blockquote</blockquote>
				<br />
				<blockquote expandable>
					Expandable
					<br />
					blockquote
					<br />
					Expandable
					<br />
					blockquote
					<br />
					Expandable
					<br />
					blockquote
				</blockquote>
				<br />

				{/* Custom emoji */}
				<custom-emoji emojiId="5222106016283378623">👍</custom-emoji>
			</>,
			{
				reply_markup: (
					<keyboard inline>
						<row>
							<button callbackData="test">Normal</button>
							<button url="https://example.com">Link</button>
						</row>
						<row>
							<button webApp={{ url: "https://example.com/" }}>WebApp</button>
							<button loginUrl={{ url: "https://example.com/login" }}>
								Login
							</button>
						</row>
						<row>
							<button switchToChat="test">Switch</button>
							<button switchToCurrentChat="test">Switch current</button>
						</row>
					</keyboard>
				),
			},
		);

		await context.send("Reply keyboard test", {
			reply_markup: (
				<keyboard oneTime placeholder="Placeholder test">
					<row>
						<button requestContact>Contact</button>
						<button
							requestChat={{
								request_id: 0,
								chat_is_channel: true,
								chat_is_created: true,
								chat_has_username: true,
							}}
						>
							Чат
						</button>
						<button requestLocation>Гео</button>
					</row>
					<row>
						<button requestPoll={{ type: "quiz" }}>Quiz</button>
						<button requestPoll={{ type: "regular" }}>Poll</button>
					</row>
					<row>
						<button webApp={{ url: "https://example.com/" }}>Webapp</button>
						<button>Normal</button>
					</row>
				</keyboard>
			),
		});
	})
	.onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));

bot.start();
