require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: 'local'
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message || err);
    return;
  }
  console.log('Conectado a la base de datos.');
  connection.release();
});

module.exports = pool;
