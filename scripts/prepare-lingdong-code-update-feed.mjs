import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  return process.argv[index + 1]?.trim() || fallback;
}

function readRequiredArg(name) {
  const value = readArg(name);
  if (!value) throw new Error(`missing required argument: ${name}`);
  return value;
}

function readManifestField(content, field) {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") || "";
}

function readInstallerFileUrl(content) {
  const match = content.match(/^\s*-\s+url:\s*(.+)$/m);
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") || "";
}

function replaceInstallerFileUrl(content, value) {
  const pattern = /^(\s*-\s+url:\s*).+$/m;
  if (!pattern.test(content)) throw new Error("manifest installer file url not found");
  return content.replace(pattern, `$1${value}`);
}

function replaceManifestField(content, field, value) {
  const pattern = new RegExp(`^${field}:\\s*.+$`, "m");
  if (!pattern.test(content)) throw new Error(`manifest field not found: ${field}`);
  return content.replace(pattern, `${field}: ${value}`);
}

export function prepareUpdateFeed(input) {
  const artifactDir = resolve(input.artifactDir);
  const outputDir = resolve(input.outputDir);
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const version = input.version?.trim() || "";
  const manifestPath = resolve(artifactDir, "latest.yml");

  if (!existsSync(manifestPath)) throw new Error(`latest.yml not found: ${manifestPath}`);
  if (!baseUrl) throw new Error("baseUrl is required");

  return (async () => {
    const sourceManifest = await readFile(manifestPath, "utf8");
    const manifestVersion = readManifestField(sourceManifest, "version");
    if (!manifestVersion) throw new Error("latest.yml is missing version");
    if (version && manifestVersion !== version) {
      throw new Error(`latest.yml version mismatch: expected ${version}, got ${manifestVersion}`);
    }

    const fileUrl = readInstallerFileUrl(sourceManifest);
    const pathField = readManifestField(sourceManifest, "path") || fileUrl;
    if (!fileUrl || !pathField) throw new Error("latest.yml is missing installer file path");

    const installerName = basename(decodeURIComponent(fileUrl));
    const installerPath = resolve(artifactDir, installerName);
    const blockmapPath = `${installerPath}.blockmap`;
    if (!existsSync(installerPath)) throw new Error(`installer not found: ${installerPath}`);
    if (!existsSync(blockmapPath)) throw new Error(`blockmap not found: ${blockmapPath}`);

    const absoluteInstallerUrl = new URL(installerName, `${baseUrl}/`).href;
    let manifest = sourceManifest;
    manifest = replaceInstallerFileUrl(manifest, absoluteInstallerUrl);
    manifest = replaceManifestField(manifest, "path", absoluteInstallerUrl);

    await mkdir(outputDir, { recursive: true });
    await Promise.all([
      copyFile(installerPath, resolve(outputDir, installerName)),
      copyFile(blockmapPath, resolve(outputDir, `${installerName}.blockmap`)),
      writeFile(resolve(outputDir, "latest.yml"), manifest, "utf8"),
    ]);

    return {
      version: manifestVersion,
      installerName,
      outputDir,
      manifestUrl: new URL("latest.yml", `${baseUrl}/`).href,
      installerUrl: absoluteInstallerUrl,
    };
  })();
}

async function main() {
  const rootPackage = JSON.parse(await readFile(resolve("package.json"), "utf8"));
  const result = await prepareUpdateFeed({
    artifactDir: readRequiredArg("--artifact-dir"),
    outputDir: readRequiredArg("--output-dir"),
    baseUrl: readRequiredArg("--base-url"),
    version: readArg("--version", rootPackage.version),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entry === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`[prepare-update-feed] ${error.message}\n`);
    process.exit(1);
  });
}
