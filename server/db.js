const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5433,
      database: 'connectingservices',
      user: process.env.USER || 'clayarnold',
    });

module.exports = pool;
