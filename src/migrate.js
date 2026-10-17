import { createPool, migrate } from './db.js';

const pool = createPool();
try {
  await migrate(pool);
  console.log('Database migration complete.');
} finally {
  await pool.end();
}
