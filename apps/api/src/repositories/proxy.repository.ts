import { pool } from '../db/index.js';
import { BrowserProxy, CreateProxyDTO, ProxyStatus, UpdateProxyDTO } from '../types/index.js';

export class ProxyRepository {
  async findAll(): Promise<BrowserProxy[]> {
    const { rows } = await pool.query<BrowserProxy>(`
      SELECT id, name, host, port, username, type, country, state, city,
             last_ip, last_tested_at, latency_ms, status, created_at, updated_at
      FROM browser_proxies
      ORDER BY id DESC
    `);
    return rows;
  }

  async findById(id: number): Promise<BrowserProxy | null> {
    const { rows } = await pool.query<BrowserProxy>(`
      SELECT * FROM browser_proxies WHERE id = $1
    `, [id]);
    return rows[0] || null;
  }

  async create(data: CreateProxyDTO): Promise<BrowserProxy> {
    const { rows } = await pool.query<BrowserProxy>(`
      INSERT INTO browser_proxies (name, host, port, username, password, type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      data.name,
      data.host,
      data.port,
      data.username || null,
      data.password || null,
      data.type || 'http'
    ]);
    return rows[0];
  }

  async update(id: number, data: UpdateProxyDTO): Promise<BrowserProxy | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.host !== undefined) {
      fields.push(`host = $${idx++}`);
      values.push(data.host);
    }
    if (data.port !== undefined) {
      fields.push(`port = $${idx++}`);
      values.push(data.port);
    }
    if (data.username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(data.username);
    }
    if (data.password !== undefined) {
      fields.push(`password = $${idx++}`);
      values.push(data.password);
    }
    if (data.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(data.type);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<BrowserProxy>(`
      UPDATE browser_proxies
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `, values);

    return rows[0] || null;
  }

  async updateTestResult(id: number, result: { status: ProxyStatus; latency_ms?: number; last_ip?: string }): Promise<void> {
    await pool.query(`
      UPDATE browser_proxies
      SET status = $1, latency_ms = $2, last_ip = $3, last_tested_at = NOW(), updated_at = NOW()
      WHERE id = $4
    `, [result.status, result.latency_ms || null, result.last_ip || null, id]);
  }

  async delete(id: number): Promise<boolean> {
    const res = await pool.query('DELETE FROM browser_proxies WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const proxyRepository = new ProxyRepository();
