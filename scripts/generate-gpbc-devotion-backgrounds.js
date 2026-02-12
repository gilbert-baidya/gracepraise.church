#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const OUTPUT_DIR = path.join(process.cwd(), "daily-devotion", "images", "backgrounds");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "background-manifest.json");
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const PREFERRED_SIZE = process.env.GPBC_IMAGE_SIZE || "1536x1536";
const FALLBACK_SIZE = "1024x1024";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const MASTER_PROMPT_BASE =
  "calm sacred nature landscape, cinematic lighting, soft natural color grading, inspirational, peaceful, God's creation, ultra realistic photography, professional landscape photography, high dynamic range, no text, no watermark, no logo, no people close up";

const FRUIT_SET = [
  {
    key: "fruit-love",
    count: 4,
    modifier: "warm sunrise horizon over ocean, golden light reflection on water"
  },
  {
    key: "fruit-joy",
    count: 4,
    modifier: "golden wheat field sunlight wind motion warm sky"
  },
  {
    key: "fruit-peace",
    count: 4,
    modifier: "perfectly still lake mirror reflection morning mist"
  },
  {
    key: "fruit-patience",
    count: 4,
    modifier: "slow flowing river long exposure silky water effect"
  },
  {
    key: "fruit-kindness",
    count: 4,
    modifier: "forest sunlight rays through trees soft glow particles"
  },
  {
    key: "fruit-goodness",
    count: 4,
    modifier: "mountain sunrise above clouds clean fresh air feeling"
  },
  {
    key: "fruit-faithfulness",
    count: 4,
    modifier: "night sky full stars over hill sacred quiet night"
  },
  {
    key: "fruit-gentleness",
    count: 4,
    modifier: "soft fog valley pastel sunrise sky delicate atmosphere"
  },
  {
    key: "fruit-self-control",
    count: 4,
    modifier: "desert sunset minimal landscape clean horizon silence"
  }
];

const CALM_SET = [
  {
    key: "calm-ocean",
    count: 3,
    modifier: "calm ocean horizon sunrise"
  },
  {
    key: "calm-mountain-lake",
    count: 3,
    modifier: "mountain lake reflection sunrise"
  },
  {
    key: "calm-stars",
    count: 3,
    modifier: "star night sky with Milky Way"
  },
  {
    key: "calm-aurora",
    count: 2,
    modifier: "aurora borealis calm landscape"
  },
  {
    key: "calm-forest-mist",
    count: 3,
    modifier: "forest morning mist light rays"
  },
  {
    key: "calm-cloudscape",
    count: 2,
    modifier: "cloudscape heaven light rays"
  },
  {
    key: "calm-hills",
    count: 3,
    modifier: "rolling green hills sunrise"
  },
  {
    key: "calm-river-valley",
    count: 3,
    modifier: "calm river valley sunrise"
  }
];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeErrorMessage(error) {
  if (!error) return "Unknown error";
  if (typeof error.message === "string" && error.message.trim()) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildPrompt(modifier) {
  return `${MASTER_PROMPT_BASE}, ${modifier}, sacred, calm, spiritually reflective, premium ministry publishing quality, timeless visual style`;
}

function buildJobList() {
  const jobs = [];
  const groups = [...FRUIT_SET, ...CALM_SET];

  groups.forEach((group) => {
    for (let i = 1; i <= group.count; i += 1) {
      jobs.push({
        key: group.key,
        index: i,
        fileName: `${group.key}-${pad2(i)}.png`,
        prompt: buildPrompt(group.modifier)
      });
    }
  });

  return jobs;
}

async function callImageApi(client, prompt, size) {
  const result = await client.images.generate({
    model: MODEL,
    prompt,
    size
  });

  const b64 = result && result.data && result.data[0] && result.data[0].b64_json;
  if (!b64) {
    throw new Error("Image API returned no b64 payload.");
  }

  return Buffer.from(b64, "base64");
}

async function generateWithRetry(client, prompt) {
  let attempt = 0;
  let usedFallbackSize = false;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    const tryLabel = `attempt ${attempt + 1}/${MAX_RETRIES + 1}`;
    const size = usedFallbackSize ? FALLBACK_SIZE : PREFERRED_SIZE;

    try {
      const imageBuffer = await callImageApi(client, prompt, size);
      return { imageBuffer, sizeUsed: size, usedFallbackSize };
    } catch (error) {
      lastError = error;
      const msg = normalizeErrorMessage(error);

      const likelySizeError =
        !usedFallbackSize &&
        size !== FALLBACK_SIZE &&
        /size|dimension|invalid.*size/i.test(msg);

      if (likelySizeError) {
        console.warn(`  ! ${tryLabel}: size issue detected, retrying with ${FALLBACK_SIZE}`);
        usedFallbackSize = true;
        continue;
      }

      if (attempt < MAX_RETRIES) {
        const backoff = RETRY_DELAY_MS * (attempt + 1);
        console.warn(`  ! ${tryLabel}: ${msg}`);
        console.warn(`  ! waiting ${backoff}ms before retry...`);
        await sleep(backoff);
      }
    }

    attempt += 1;
  }

  throw lastError || new Error("Generation failed after retries.");
}

async function writeManifest(manifest) {
  const sortedManifest = Object.keys(manifest)
    .sort()
    .reduce((acc, key) => {
      acc[key] = manifest[key].slice().sort();
      return acc;
    }, {});

  await fs.promises.writeFile(MANIFEST_PATH, `${JSON.stringify(sortedManifest, null, 2)}\n`, "utf8");
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }

  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const jobs = buildJobList();
  const total = jobs.length;

  const summary = {
    total,
    generated: 0,
    skipped: 0,
    failed: 0
  };

  const failures = [];
  const manifest = {};

  console.log("--------------------------------------------------");
  console.log("GPBC Sacred Devotion Background Generation Started");
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Preferred Size: ${PREFERRED_SIZE}`);
  console.log(`Total Planned Images: ${total}`);
  console.log("--------------------------------------------------");

  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const filePath = path.join(OUTPUT_DIR, job.fileName);
    manifest[job.key] = manifest[job.key] || [];
    manifest[job.key].push(job.fileName);

    const progressLabel = `[${i + 1}/${total}] ${job.fileName}`;

    if (fs.existsSync(filePath)) {
      summary.skipped += 1;
      console.log(`${progressLabel} -> skipped (already exists)`);
      continue;
    }

    console.log(`${progressLabel} -> generating...`);

    try {
      const { imageBuffer, sizeUsed, usedFallbackSize } = await generateWithRetry(client, job.prompt);
      await fs.promises.writeFile(filePath, imageBuffer);
      summary.generated += 1;
      const note = usedFallbackSize ? ` (fallback size ${sizeUsed})` : ` (${sizeUsed})`;
      console.log(`${progressLabel} -> saved${note}`);
    } catch (error) {
      summary.failed += 1;
      const reason = normalizeErrorMessage(error);
      failures.push({ fileName: job.fileName, reason });
      console.error(`${progressLabel} -> failed: ${reason}`);
    }
  }

  await writeManifest(manifest);

  console.log("--------------------------------------------------");
  console.log("Generation Summary");
  console.log(`Total: ${summary.total}`);
  console.log(`Generated: ${summary.generated}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  if (failures.length > 0) {
    console.log("Failed Files:");
    failures.forEach((item) => {
      console.log(`- ${item.fileName}: ${item.reason}`);
    });
  }
  console.log("--------------------------------------------------");

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", normalizeErrorMessage(error));
  process.exit(1);
});
