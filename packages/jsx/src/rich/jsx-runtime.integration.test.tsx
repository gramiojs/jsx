/** @jsxImportSource @gramio/jsx/rich */

import { describe, expect, test } from "bun:test";
import { TelegramTestEnvironment } from "@gramio/test";
import { Bot } from "gramio";
import type { RichNode } from "./jsx-runtime.ts";

describe("rich JSX integration", () => {
	test("routes a rich JSX tree through sendRichMessage", async () => {
		const content = (
			<rich>
				<h1>Status</h1>
				<document url="https://example.com/report.pdf" caption="Report" />
			</rich>
		) as RichNode;
		const bot = new Bot("test").on("message", (context) =>
			context.send(content),
		);
		const environment = new TelegramTestEnvironment(bot);
		const user = environment.createUser();

		await user.sendMessage("render");

		expect(environment.lastApiCall("sendRichMessage")?.params).toMatchObject({
			chat_id: user.payload.id,
			rich_message: {
				markdown:
					'# Status\n\n<figure><tg-document src="https://example.com/report.pdf"></tg-document><figcaption>Report</figcaption></figure>',
			},
		});
	});
});
