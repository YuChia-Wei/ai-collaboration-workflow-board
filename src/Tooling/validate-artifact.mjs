import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);
assert.equal(manifest, await readFile(resolve(projectRoot, ".openai/hosting.json"), "utf8"), "Hosting metadata must remain unchanged");

async function files(folder) {
  const entries = await readdir(folder, {withFileTypes:true});
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(resolve(folder,entry.name)) : [resolve(folder,entry.name)]))).flat();
}
const schemaRoot=resolve(projectRoot,"src/Infrastructure/Persistence/D1/Migrations");
const migrations=await files(schemaRoot);
assert.ok(migrations.some(path=>path.endsWith(".sql")), "Migration package must contain SQL migrations");
assert.ok(migrations.some(path=>path.endsWith("_journal.json")), "Migration package must contain the Drizzle journal");
assert.ok(migrations.some(path=>path.endsWith("_snapshot.json")), "Migration package must contain Drizzle snapshots");
const packagedRoot=resolve(projectRoot,"dist/.openai/drizzle");
const packaged=await files(packagedRoot);
assert.deepEqual(packaged.map(path=>relative(packagedRoot,path)).sort(),migrations.map(path=>relative(schemaRoot,path)).sort(),"Packaged schema files must match source exactly");
for(const migration of migrations)assert.deepEqual(await readFile(resolve(packagedRoot,relative(schemaRoot,migration))),await readFile(migration),"Migration content must remain unchanged");

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);
const page=await workerModule.default.fetch(new Request("https://artifact.test/"),{});
assert.equal(page.status,200);
assert.match(await page.text(),/工作紀錄/);
const unsigned=await workerModule.default.fetch(new Request("https://artifact.test/api/workflows"),{});
assert.equal(unsigned.status,401);
const importer=await workerModule.default.fetch(new Request("https://artifact.test/api/source-import"),{});
assert.equal(importer.status,403);

console.log("Artifact is valid ESM; fetch, identity boundary, and exact migration package verified");
