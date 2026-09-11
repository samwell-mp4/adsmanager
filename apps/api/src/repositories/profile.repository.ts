import { pool } from '../db/index.js';
import { BrowserProfile, ProfileStatus } from '../types/index.js';

export class ProfileRepository {
  async findAll(): Promise<BrowserProfile[]> {
    const { rows } = await pool.query(`
      SELECT 
        p.*,
        json_build_object(
          'id', px.id,
          'name', px.name,
          'host', px.host,
          'port', px.port,
          'type', px.type,
          'status', px.status,
          'last_ip', px.last_ip
        ) AS proxy
      FROM browser_profiles p
      LEFT JOIN browser_proxies px ON p.proxy_id = px.id
      ORDER BY p.id DESC
    `);

    return rows.map((r) => ({
      ...r,
      proxy: r.proxy?.id ? r.proxy : null,
    }));
  }

  async findById(id: number): Promise<BrowserProfile | null> {
    const { rows } = await pool.query(`
      SELECT 
        p.*,
        json_build_object(
          'id', px.id,
          'name', px.name,
          'host', px.host,
          'port', px.port,
          'username', px.username,
          'type', px.type,
          'status', px.status,
          'last_ip', px.last_ip
        ) AS proxy
      FROM browser_profiles p
      LEFT JOIN browser_proxies px ON p.proxy_id = px.id
      WHERE p.id = $1
    `, [id]);

    if (!rows[0]) return null;
    return {
      ...rows[0],
      proxy: rows[0].proxy?.id ? rows[0].proxy : null,
    };
  }

  async findByUuid(uuid: string): Promise<BrowserProfile | null> {
    const { rows } = await pool.query(`
      SELECT 
        p.*,
        json_build_object(
          'id', px.id,
          'name', px.name,
          'host', px.host,
          'port', px.port,
          'username', px.username,
          'type', px.type,
          'status', px.status,
          'last_ip', px.last_ip
        ) AS proxy
      FROM browser_profiles p
      LEFT JOIN browser_proxies px ON p.proxy_id = px.id
      WHERE p.uuid = $1
    `, [uuid]);

    if (!rows[0]) return null;
    return {
      ...rows[0],
      proxy: rows[0].proxy?.id ? rows[0].proxy : null,
    };
  }

  async create(data: {
    uuid: string;
    name: string;
    description?: string;
    group_name?: string;
    chrome_data_path: string;
    screen_width?: number;
    screen_height?: number;
    locale?: string;
    timezone?: string;
    proxy_id?: number | null;
  }): Promise<BrowserProfile> {
    const { rows } = await pool.query<BrowserProfile>(`
      INSERT INTO browser_profiles (
        uuid, name, description, group_name, chrome_data_path,
        screen_width, screen_height, locale, timezone, proxy_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'stopped')
      RETURNING *
    `, [
      data.uuid,
      data.name,
      data.description || null,
      data.group_name || 'Default',
      data.chrome_data_path,
      data.screen_width || 1920,
      data.screen_height || 1080,
      data.locale || 'pt-BR',
      data.timezone || 'America/Sao_Paulo',
      data.proxy_id || null,
    ]);

    return rows[0];
  }

  async update(id: number, data: Partial<BrowserProfile>): Promise<BrowserProfile | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowed = [
      'name', 'description', 'group_name', 'screen_width', 'screen_height',
      'locale', 'timezone', 'proxy_id'
    ];

    for (const key of allowed) {
      if ((data as any)[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push((data as any)[key]);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<BrowserProfile>(`
      UPDATE browser_profiles
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `, values);

    return rows[0] || null;
  }

  async updateRuntimeState(
    id: number,
    status: ProfileStatus,
    containerName: string | null = null,
    ports?: { novnc?: number | null; vnc?: number | null; cdp?: number | null }
  ): Promise<void> {
    const isStarting = status === 'starting' || status === 'running';
    const isStopped = status === 'stopped' || status === 'error';

    await pool.query(`
      UPDATE browser_profiles
      SET 
        status = $1,
        container_name = COALESCE($2, container_name),
        novnc_port = CASE WHEN $3::int IS NOT NULL THEN $3::int ELSE novnc_port END,
        vnc_port = CASE WHEN $4::int IS NOT NULL THEN $4::int ELSE vnc_port END,
        cdp_port = CASE WHEN $5::int IS NOT NULL THEN $5::int ELSE cdp_port END,
        last_started_at = CASE WHEN $6 = true THEN NOW() ELSE last_started_at END,
        last_stopped_at = CASE WHEN $7 = true THEN NOW() ELSE last_stopped_at END,
        updated_at = NOW()
      WHERE id = $8
    `, [
      status,
      containerName,
      ports?.novnc ?? null,
      ports?.vnc ?? null,
      ports?.cdp ?? null,
      isStarting,
      isStopped,
      id
    ]);
  }

  async updateProxy(id: number, proxyId: number | null): Promise<void> {
    await pool.query(`
      UPDATE browser_profiles
      SET proxy_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [proxyId, id]);
  }

  async delete(id: number): Promise<boolean> {
    const res = await pool.query('DELETE FROM browser_profiles WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const profileRepository = new ProfileRepository();
