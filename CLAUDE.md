# @gramio/jsx

JSX runtime for formatting Telegram bot messages in GramIO.

## Structure

Monorepo with Bun workspaces:

- `packages/jsx/` — main `@gramio/jsx` package (JSX runtime + keyboard builders)
- `examples/example-bot/` — example bot using the JSX runtime

The core source is `packages/jsx/src/jsx-runtime.ts` — exports `jsx`, `jsxs`, `jsxDEV`, `Fragment`, `normalizeChildren`, `extractKeyboard`.

## Commands

```bash
bun install                    # install deps
bun test                       # run tests (from packages/jsx/)
bunx pkgroll && tsc            # build package to dist/
bunx biome check --write .     # lint + format
```

## Conventions

- Formatter: Biome with tabs, double quotes
- TSX files use `jsxImportSource: @gramio/jsx` (set in tsconfig)
- Tests: `bun:test` + `@gramio/test` (TelegramTestEnvironment)
- `bot.command()` handlers need `bot_command` entities in updates — use `env.emitUpdate()` with entities for command tests, or use `bot.on("message")` / `user.sendMessage()` for plain message tests

## How JSX Works

JSX elements map to GramIO's `FormattableString` (for text formatting: `<b>`, `<i>`, `<u>`, `<s>`, `<spoiler>`, `<code>`, `<pre>`, `<blockquote>`, `<a>`, `<mention>`, `<custom-emoji>`, `<br>`, `<fragment>`).

`<keyboard>`, `<row>`, `<button>` produce `InlineKeyboard`/`Keyboard` objects with a `toJSON()` method — pass directly as `reply_markup`.

## Dependencies

- `gramio` — core bot framework (provides `FormattableString`, `InlineKeyboard`, `Keyboard`, formatting functions)
- `@gramio/types` — Telegram API types
- `@gramio/test` (dev) — test environment for bot testing
