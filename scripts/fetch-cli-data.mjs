import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const owner = process.env.TAKI_CLI_OWNER ?? "kwiruu";
const repo = process.env.TAKI_CLI_REPO ?? "taki-cli";
const packageName = process.env.TAKI_CLI_PACKAGE ?? "@kwiruu/taki-cli";

const githubRepoUrl = `https://api.github.com/repos/${owner}/${repo}`;
const githubReleasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`;
const npmRegistryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

const generatedDir = path.join(projectRoot, "src", "data", "generated");
const snapshotJsonPath = path.join(generatedDir, "cli-data.snapshot.json");
const snapshotTsPath = path.join(generatedDir, "cli-data.ts");

const defaultSnapshot = {
  generatedAt: new Date(0).toISOString(),
  stale: true,
  source: {
    repository: `${owner}/${repo}`,
    packageName,
  },
  stats: {
    stars: null,
    forks: null,
    openIssues: null,
  },
  release: {
    tagName: null,
    name: null,
    publishedAt: null,
    url: `https://github.com/${owner}/${repo}/releases`,
    notes: null,
  },
  releases: [],
  npm: {
    version: null,
    publishedAt: null,
    url: `https://www.npmjs.com/package/${packageName}`,
  },
  links: {
    issuesUrl: `https://github.com/${owner}/${repo}/issues`,
    featureRequestUrl: `https://github.com/${owner}/${repo}/issues/new?labels=enhancement&template=feature_request.md`,
    releasesUrl: `https://github.com/${owner}/${repo}/releases`,
  },
};

const toNullableNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toNullableString = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "taki-docs-build-data-fetch",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function loadPreviousSnapshot() {
  try {
    const raw = await fs.readFile(snapshotJsonPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchJson(url, options = {}) {
  const { optionalNotFound = false, headers = {} } = options;
  const response = await fetch(url, {
    headers,
  });

  if (optionalNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${url} failed with status ${response.status}`);
  }

  return response.json();
}

function normalizeReleaseEntry(item) {
  return {
    tagName: toNullableString(item?.tagName),
    name: toNullableString(item?.name),
    publishedAt: toNullableString(item?.publishedAt),
    url: toNullableString(item?.url),
    notes: toNullableString(item?.notes),
    isPrerelease: Boolean(item?.isPrerelease),
    actorLogin: toNullableString(item?.actorLogin),
    actorAvatarUrl: toNullableString(item?.actorAvatarUrl),
    commitSha: toNullableString(item?.commitSha),
  };
}

async function resolveTagCommitSha(tagName) {
  const encodedTag = encodeURIComponent(tagName);
  const refData = await fetchJson(
    `${githubRepoUrl}/git/ref/tags/${encodedTag}`,
    {
      headers: githubHeaders,
      optionalNotFound: true,
    },
  );

  if (!refData?.object?.sha || !refData?.object?.type) {
    return null;
  }

  let currentType = refData.object.type;
  let currentSha = refData.object.sha;

  for (let depth = 0; depth < 4 && currentType === "tag"; depth += 1) {
    const tagData = await fetchJson(`${githubRepoUrl}/git/tags/${currentSha}`, {
      headers: githubHeaders,
      optionalNotFound: true,
    });

    if (!tagData?.object?.sha || !tagData?.object?.type) {
      return null;
    }

    currentType = tagData.object.type;
    currentSha = tagData.object.sha;
  }

  return currentType === "commit" ? currentSha : null;
}

async function resolveCommitActor(commitSha) {
  if (!commitSha) {
    return {
      actorLogin: null,
      actorAvatarUrl: null,
    };
  }

  const commitData = await fetchJson(`${githubRepoUrl}/commits/${commitSha}`, {
    headers: githubHeaders,
    optionalNotFound: true,
  });

  return {
    actorLogin:
      toNullableString(commitData?.author?.login) ??
      toNullableString(commitData?.committer?.login),
    actorAvatarUrl:
      toNullableString(commitData?.author?.avatar_url) ??
      toNullableString(commitData?.committer?.avatar_url),
  };
}

async function enrichReleaseEntries(releaseData) {
  if (!Array.isArray(releaseData)) {
    return [];
  }

  const baseEntries = releaseData
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      tagName: toNullableString(item.tag_name),
      name: toNullableString(item.name),
      publishedAt: toNullableString(item.published_at),
      url: toNullableString(item.html_url),
      notes: toNullableString(item.body),
      isPrerelease: Boolean(item.prerelease),
      actorLogin: toNullableString(item.author?.login),
      actorAvatarUrl: toNullableString(item.author?.avatar_url),
      commitSha: toNullableString(item.target_commitish),
    }))
    .filter((item) => item.tagName)
    .slice(0, 20);

  return Promise.all(
    baseEntries.map(async (entry) => {
      let commitSha = entry.commitSha;

      try {
        commitSha = (await resolveTagCommitSha(entry.tagName)) ?? commitSha;
      } catch {
        // Keep existing commitSha fallback when tag resolution fails.
      }

      let actorLogin = entry.actorLogin;
      let actorAvatarUrl = entry.actorAvatarUrl;

      try {
        const actor = await resolveCommitActor(commitSha);
        actorLogin = actor.actorLogin ?? actorLogin;
        actorAvatarUrl = actor.actorAvatarUrl ?? actorAvatarUrl;
      } catch {
        // Keep release-author fallback when commit actor lookup fails.
      }

      return {
        ...entry,
        commitSha,
        actorLogin,
        actorAvatarUrl,
      };
    }),
  );
}

function toSnapshot({ repoData, releasesData, npmData, previousSnapshot }) {
  const previousReleases = Array.isArray(previousSnapshot?.releases)
    ? previousSnapshot.releases
        .map((item) => normalizeReleaseEntry(item))
        .filter((item) => item.tagName)
    : [];
  const fetchedReleases = Array.isArray(releasesData)
    ? releasesData
        .map((item) => normalizeReleaseEntry(item))
        .filter((item) => item.tagName)
    : [];
  const releases =
    fetchedReleases.length > 0 ? fetchedReleases : previousReleases;
  const latestRelease = releases[0] ?? null;
  const latestVersion = toNullableString(npmData?.["dist-tags"]?.latest);

  return {
    generatedAt: new Date().toISOString(),
    stale: false,
    source: {
      repository: `${owner}/${repo}`,
      packageName,
    },
    stats: {
      stars:
        toNullableNumber(repoData?.stargazers_count) ??
        toNullableNumber(previousSnapshot?.stats?.stars),
      forks:
        toNullableNumber(repoData?.forks_count) ??
        toNullableNumber(previousSnapshot?.stats?.forks),
      openIssues:
        toNullableNumber(repoData?.open_issues_count) ??
        toNullableNumber(previousSnapshot?.stats?.openIssues),
    },
    release: {
      tagName:
        toNullableString(latestRelease?.tagName) ??
        toNullableString(previousSnapshot?.release?.tagName),
      name:
        toNullableString(latestRelease?.name) ??
        toNullableString(previousSnapshot?.release?.name),
      publishedAt:
        toNullableString(latestRelease?.publishedAt) ??
        toNullableString(previousSnapshot?.release?.publishedAt),
      url:
        toNullableString(latestRelease?.url) ??
        toNullableString(previousSnapshot?.release?.url) ??
        defaultSnapshot.release.url,
      notes:
        toNullableString(latestRelease?.notes) ??
        toNullableString(previousSnapshot?.release?.notes),
    },
    releases,
    npm: {
      version:
        latestVersion ?? toNullableString(previousSnapshot?.npm?.version),
      publishedAt:
        toNullableString(npmData?.time?.[latestVersion]) ??
        toNullableString(previousSnapshot?.npm?.publishedAt),
      url:
        toNullableString(previousSnapshot?.npm?.url) ?? defaultSnapshot.npm.url,
    },
    links: {
      issuesUrl: defaultSnapshot.links.issuesUrl,
      featureRequestUrl: defaultSnapshot.links.featureRequestUrl,
      releasesUrl: defaultSnapshot.links.releasesUrl,
    },
  };
}

function toTsFileContent(snapshot) {
  return `/* Auto-generated by scripts/fetch-cli-data.mjs. Do not edit manually. */\nexport const cliData = ${JSON.stringify(snapshot, null, 2)} as const;\n\nexport type CliData = typeof cliData;\n`;
}

async function writeSnapshot(snapshot) {
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(
    snapshotJsonPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(snapshotTsPath, toTsFileContent(snapshot), "utf8");
}

async function run() {
  const previousSnapshot = (await loadPreviousSnapshot()) ?? defaultSnapshot;

  const [repoResult, releaseResult, npmResult] = await Promise.allSettled([
    fetchJson(githubRepoUrl, { headers: githubHeaders }),
    fetchJson(githubReleasesUrl, {
      headers: githubHeaders,
      optionalNotFound: true,
    }),
    fetchJson(npmRegistryUrl),
  ]);

  const repoData = repoResult.status === "fulfilled" ? repoResult.value : null;
  const releaseData =
    releaseResult.status === "fulfilled" ? releaseResult.value : null;
  const npmData = npmResult.status === "fulfilled" ? npmResult.value : null;
  const releasesData = await enrichReleaseEntries(releaseData);

  const snapshot = toSnapshot({
    repoData,
    releasesData,
    npmData,
    previousSnapshot,
  });

  if (
    repoResult.status === "rejected" ||
    releaseResult.status === "rejected" ||
    npmResult.status === "rejected"
  ) {
    snapshot.stale = true;
    console.warn(
      "Using partial/fallback snapshot because one or more API calls failed.",
    );
  }

  await writeSnapshot(snapshot);

  console.log("Generated CLI data snapshot:");
  console.log(`- Repo: ${snapshot.source.repository}`);
  console.log(`- Stars: ${snapshot.stats.stars ?? "n/a"}`);
  console.log(`- Latest release: ${snapshot.release.tagName ?? "n/a"}`);
  console.log(`- Release entries: ${snapshot.releases.length}`);
  console.log(`- npm version: ${snapshot.npm.version ?? "n/a"}`);
}

run().catch(async (error) => {
  console.error("Failed to refresh CLI data snapshot:", error);
  const previousSnapshot = (await loadPreviousSnapshot()) ?? defaultSnapshot;
  const fallbackSnapshot = {
    ...previousSnapshot,
    generatedAt: new Date().toISOString(),
    stale: true,
  };

  await writeSnapshot(fallbackSnapshot);
  process.exitCode = 0;
});
