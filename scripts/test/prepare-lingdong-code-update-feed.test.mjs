import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { prepareUpdateFeed } from "../prepare-lingdong-code-update-feed.mjs";

const dir = await mkdtemp(join(tmpdir(), "lingdong-update-feed-"));
after(() => rm(dir, { recursive: true, force: true }));

test("复制安装包与 blockmap，并把更新清单改为绝对 URL", async () => {
  const artifactDir = join(dir, "artifact");
  const outputDir = join(dir, "feed", "stable", "windows-x64");
  const installerName = "灵动Code-3.17.0-win-x64.exe";
  await mkdir(artifactDir, { recursive: true });
  await writeFile(join(artifactDir, installerName), "installer");
  await writeFile(join(artifactDir, `${installerName}.blockmap`), "blockmap");
  await writeFile(
    join(artifactDir, "latest.yml"),
    [
      "version: 3.17.0",
      "files:",
      `  - url: ${installerName}`,
      "    sha512: abc",
      "    size: 9",
      `path: ${installerName}`,
      "sha512: abc",
      "releaseDate: '2026-10-26T00:00:00.000Z'",
      "",
    ].join("\n"),
  );

  const result = await prepareUpdateFeed({
    artifactDir,
    outputDir,
    baseUrl: "https://www.aicyld.com.cn/updates/lingdong-code/stable/windows-x64/",
    version: "3.17.0",
  });

  const encodedName = encodeURIComponent(installerName);
  const manifest = await readFile(join(outputDir, "latest.yml"), "utf8");
  assert.match(
    manifest,
    new RegExp(
      `url: https://www\\.aicyld\\.com\\.cn/updates/lingdong-code/stable/windows-x64/${encodedName}`,
    ),
  );
  assert.match(
    manifest,
    new RegExp(
      `path: https://www\\.aicyld\\.com\\.cn/updates/lingdong-code/stable/windows-x64/${encodedName}`,
    ),
  );
  assert.equal(result.version, "3.17.0");
  assert.equal(result.installerName, installerName);
  assert.equal(await readFile(join(outputDir, installerName), "utf8"), "installer");
  assert.equal(await readFile(join(outputDir, `${installerName}.blockmap`), "utf8"), "blockmap");
});

test("版本不匹配时拒绝发布", async () => {
  const artifactDir = join(dir, "bad-artifact");
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    join(artifactDir, "latest.yml"),
    "version: 3.16.2\nfiles:\n  - url: app.exe\npath: app.exe\n",
  );
  await assert.rejects(
    prepareUpdateFeed({
      artifactDir,
      outputDir: join(dir, "bad-feed"),
      baseUrl: "https://www.aicyld.com.cn/updates/lingdong-code/stable/windows-x64/",
      version: "3.17.0",
    }),
    /version mismatch/,
  );
});
