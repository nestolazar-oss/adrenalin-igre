// handlers/reportsHandler.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_FILE = path.join(__dirname, '../data/reports.json');

async function ensureReportsFile() {
  try {
    await fs.mkdir(path.dirname(REPORTS_FILE), { recursive: true });
    try {
      await fs.access(REPORTS_FILE);
    } catch {
      await fs.writeFile(REPORTS_FILE, JSON.stringify({}, null, 2));
    }
  } catch (e) {
    console.error('Reports file error:', e);
  }
}

async function readAll() {
  await ensureReportsFile();
  try {
    const data = await fs.readFile(REPORTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Read reports error:', e.message);
    return {};
  }
}

async function writeAll(json) {
  try {
    await fs.writeFile(REPORTS_FILE, JSON.stringify(json, null, 2));
    return true;
  } catch (e) {
    console.error('Write reports error:', e.message);
    return false;
  }
}

export async function addReport(report) {
  const json = await readAll();
  json[report.id] = report;
  await writeAll(json);
  return report;
}

export async function findReport(reportId) {
  const json = await readAll();
  return json[reportId] || null;
}

/**
 * updateReportStatus(reportId, newStatus, moderatorTag)
 * -> menja samo status/moderatedBy/moderatedAt
 */
export async function updateReportStatus(reportId, newStatus, moderatorTag = null) {
  const json = await readAll();
  if (!json[reportId]) return false;
  json[reportId].status = newStatus;
  json[reportId].moderatedBy = moderatorTag;
  json[reportId].moderatedAt = new Date().toISOString();
  await writeAll(json);
  return true;
}

/**
 * patchReport(reportId, patchObject)
 * -> merge polja u postojeću prijavu (koristimo za sprema messageId, channelId, ili dodatna polja)
 */
export async function patchReport(reportId, patch = {}) {
  const json = await readAll();
  if (!json[reportId]) return false;
  json[reportId] = { ...json[reportId], ...patch };
  await writeAll(json);
  return true;
}

export async function getAllReports() {
  return await readAll();
}

export default {
  addReport,
  findReport,
  updateReportStatus,
  patchReport,
  getAllReports
};
