import { execSync } from "node:child_process";
import fs from "node:fs";

const version = execSync("npm pkg get version")
	.toString()
	.replace(/"|\n/gi, "");

const jsrConfig = JSON.parse(String(fs.readFileSync("packages/jsx/deno.json")));

jsrConfig.version = version;

fs.writeFileSync("packages/jsx/deno.json", JSON.stringify(jsrConfig, null, 4));

try {
	execSync(
		"cd packages/jsx && bunx @teidesu/slow-types-compiler@latest fix --entry deno.json",
	);
} catch (error) {
	console.error(error);
}

console.log("Prepared to release on JSR!");
