// Cargar variables de entorno
require('dotenv').config();

const mysql = require('mysql2');

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,   // puedes subirlo si hay muchos usuarios
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Verificar conexión inicial (solo log)
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos (pool).');
  connection.release();
});

// Exportar pool (compatible con db.query)
module.exports = pool;