// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

const mysql = require('mysql2');

// Crear un pool de conexiones a la base de datos usando las variables de entorno
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
  keepAliveInitialDelay: 0
});

// Validar la conexión inicial al arrancar
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack || err);
    return;
  }
  console.log('Conectado a la base de datos.');
  connection.release();
});

module.exports = pool;
