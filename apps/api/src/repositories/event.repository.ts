import { pool } from '../db/index.js';
import { BrowserEvent } from '../types/index.js';

export class EventRepository {
  async create(
    profileId: number,
    type: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<BrowserEvent> {
    const { rows } = await pool.query<BrowserEvent>(`
      INSERT INTO browser_events (profile_id, type, message, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [profileId, type, message, JSON.stringify(metadata)]);

    return rows[0];
  }

  async findByProfileId(profileId: number, limit: number = 50): Promise<BrowserEvent[]> {
    const { rows } = await pool.query<BrowserEvent>(`
      SELECT id, profile_id, type, message, metadata, created_at
      FROM browser_events
      WHERE profile_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [profileId, limit]);

    return rows;
  }
}

export const eventRepository = new EventRepository();
