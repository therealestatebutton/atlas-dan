import { getDatabase } from './connection.js';
import { Settings } from '../types/index.js';

export class SettingsService {
  /**
   * Get all settings
   */
  static getAll(): Settings {
    const db = getDatabase();
    const stmt = db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    
    const settings: Settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return settings;
  }

  /**
   * Get a single setting
   */
  static get(key: string): string | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value || null;
  }

  /**
   * Set a setting
   */
  static set(key: string, value: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const result = stmt.run(key, value);
    return result.changes > 0;
  }

  /**
   * Set multiple settings
   */
  static setMultiple(settings: Record<string, string>): number {
    const db = getDatabase();
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    let updated = 0;
    for (const [key, value] of Object.entries(settings)) {
      const result = stmt.run(key, value);
      if (result.changes > 0) updated++;
    }
    
    return updated;
  }

  /**
   * Delete a setting
   */
  static delete(key: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
  }

  /**
   * Get settings with masked secrets
   */
  static getAllMasked(): Settings {
    const all = this.getAll();
    const masked = { ...all };
    
    // Mask sensitive fields
    const secretFields = ['smtp_pass', 'skip_trace_key', 'scraper_api_key', 'bright_data_pass'];
    secretFields.forEach(field => {
      if (masked[field]) {
        masked[field] = '***';
      }
    });
    
    return masked;
  }
}
