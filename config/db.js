// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

const mysql = require('mysql2');

// Pool de conexiones para mayor estabilidad en Railway
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack || err);
    return;
  }
  console.log('Conectado a la base de datos.');
  connection.release();
});

module.exports = pool;
