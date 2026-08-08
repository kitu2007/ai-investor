import fs from "fs";
import path from "path";
import { Company } from "./types";

const DATA_FILE = path.join(process.cwd(), "data", "portfolio.json");

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

export function readPortfolio(): Company[] {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Company[];
}

export function writePortfolio(companies: Company[]): void {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(companies, null, 2));
}

export function upsertCompany(company: Company): void {
  const companies = readPortfolio();
  const idx = companies.findIndex((c) => c.id === company.id);
  if (idx >= 0) {
    companies[idx] = company;
  } else {
    companies.push(company);
  }
  writePortfolio(companies);
}

export function deleteCompany(id: string): void {
  const companies = readPortfolio().filter((c) => c.id !== id);
  writePortfolio(companies);
}
