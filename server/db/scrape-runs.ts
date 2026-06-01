import { getDatabase } from './connection.js';
import { ScrapeRun } from '../types/index.js';

export class ScrapeRunsService {
  /**
   * Create a new scrape run record
   */
  static createRun(id: string): ScrapeRun {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO scrape_runs (id, started_at, leads_found, errors)
      VALUES (?, ?, 0, NULL)
    `);
    
    stmt.run(id, now);
    
    return {
      id,
      started_at: now,
      completed_at: null,
      leads_found: 0,
      errors: null,
    };
  }

  /**
   * Update scrape run with completion info
   */
  static completeRun(id: string, leads_found: number, errors?: string): ScrapeRun | null {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE scrape_runs 
      SET completed_at = ?, leads_found = ?, errors = ?
      WHERE id = ?
    `);
    
    stmt.run(now, leads_found, errors || null, id);
    
    return this.getRun(id);
  }

  /**
   * Get scrape run by ID
   */
  static getRun(id: string): ScrapeRun | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scrape_runs WHERE id = ?');
    return (stmt.get(id) as ScrapeRun) || null;
  }

  /**
   * Get latest scrape run
   */
  static getLatestRun(): ScrapeRun | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scrape_runs
      ORDER BY started_at DESC
      LIMIT 1
    `);
    return (stmt.get() as ScrapeRun) || null;
  }

  /**
   * Get scrape runs for a date range
   */
  static getRuns(limit: number = 10, offset: number = 0): ScrapeRun[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scrape_runs
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as ScrapeRun[];
  }

  /**
   * Check if scrape is currently running
   */
  static isRunning(): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM scrape_runs
      WHERE completed_at IS NULL
    `);
    const { count } = stmt.get() as { count: number };
    return count > 0;
  }

  /**
   * Get current running scrape
   */
  static getCurrentRun(): ScrapeRun | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scrape_runs
      WHERE completed_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `);
    return (stmt.get() as ScrapeRun) || null;
  }
}
