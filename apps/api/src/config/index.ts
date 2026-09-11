import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local dir
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgres://adsmanager:Samuca03146555%40@adsmanager_adsmanager:5432/adsmanager?sslmode=disable',
  profilesDataDir: process.env.PROFILES_DATA_DIR || '/data/browser-profiles',
  extensionsDataDir: process.env.EXTENSIONS_DATA_DIR || path.join(process.env.PROFILES_DATA_DIR || '/data/browser-profiles', 'global_extensions'),
  browserImage: process.env.BROWSER_IMAGE || 'browser-profile:v1.2',
  dockerSocket: process.env.DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'),
  ports: {
    novnc: {
      start: parseInt(process.env.NOVNC_PORT_START || '6100', 10),
      end: parseInt(process.env.NOVNC_PORT_END || '6999', 10),
    },
    cdp: {
      start: parseInt(process.env.CDP_PORT_START || '9200', 10),
      end: parseInt(process.env.CDP_PORT_END || '9999', 10),
    },
    vnc: {
      start: parseInt(process.env.VNC_PORT_START || '5901', 10),
      end: parseInt(process.env.VNC_PORT_END || '6099', 10),
    },
  },
  resources: {
    memoryMb: parseInt(process.env.PROFILE_MEMORY_MB || '2048', 10),
    cpuLimit: parseFloat(process.env.PROFILE_CPU_LIMIT || '2.0'),
  },
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3001',
};
