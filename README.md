# @gramio/jsx

Use **JSX** to format your Telegram bot messages

## Setup

```bash
npm install @gramio/jsx
# or
bun add @gramio/jsx
```

Then in your **tsconfig.json**:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gramio/jsx"
  }
}
```

---

## Usage
```jsx
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
							<button
								webApp={{ url: "https://example.com/" }}
							>
								WebApp
							</button>
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
```

# Notes
## ⚠️ Important: Keyboards

The `<keyboard>` element **does not render inside the message body**.
You must pass it separately via the `reply_markup` option of `context.reply` (or `context.send` and etc):
