import { readFileSync, writeFileSync } from "node:fs"

const { version } = JSON.parse(readFileSync("package.json", "utf-8"))

const manifest = JSON.parse(readFileSync("./www/manifest.json", "utf-8"))

manifest.version = version

writeFileSync("./www/manifest.json", JSON.stringify(manifest, null, 2))