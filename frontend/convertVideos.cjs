// convertVideos.cjs
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const excelPath = path.join(__dirname, "Video Database.xlsx");
const outDir = path.join(__dirname, "src", "data");
const outPath = path.join(outDir, "videos.json");

function extractYouTubeId(link) {
  if (!link) return null;
  const s = String(link).trim();

  // youtu.be/<id>
  const m1 = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m1) return m1[1];

  // youtube.com/watch?v=<id>
  const m2 = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m2) return m2[1];

  // youtube.com/embed/<id>
  const m3 = s.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  if (m3) return m3[1];

  return null;
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const workbook = XLSX.readFile(excelPath);

let videos = [];

workbook.SheetNames.forEach((sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  rows.forEach((row) => {
    // Support both schemas:
    const title = row["Video Title"] || row["Recipe Title"];
    const link = row["Video Link"] || row["Recipe Link"];
    const source = row["Video Source"] || "";

    if (!title || !link) return;

    const youtubeId = extractYouTubeId(link);
    if (!youtubeId) return;

    const category = sheetName.toLowerCase().includes("recipe")
      ? "Recipe"
      : "Education";

    videos.push({
      id: `${slugify(source)}-${slugify(title)}-${youtubeId}`,
      title: String(title).trim(),
      source: String(source).trim(),
      program: sheetName, // keep sheet name for filtering later
      category,
      youtubeId,
      youtubeEmbedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      youtubeLink: String(link).trim(),
    });
  });
});

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

// Write file
fs.writeFileSync(outPath, JSON.stringify(videos, null, 2), "utf8");

console.log(`Created videos.json with ${videos.length} videos`);