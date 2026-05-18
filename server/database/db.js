import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "isbl.sqlite");
const schemaPath = path.join(__dirname, "schema.sql");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export const runMigrations = () => {
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
};

// Ensure schema exists before any module prepares SQL statements.
runMigrations();

export default db;
