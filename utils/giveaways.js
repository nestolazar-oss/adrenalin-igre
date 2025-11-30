import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "giveaways.json");

// Kreiraj ako ne postoji
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(
    filePath,
    JSON.stringify({}, null, 2)
  );
}

export async function getGiveaways() {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Greška čitanja giveaways.json:", e);
    return {};
  }
}

export async function saveGiveaways(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error("Greška snimanja giveaways.json:", e);
    return false;
  }
}
