// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

const mysql = require('mysql2');

let connection;
let isConnecting = false;
let reconnectTimer = null;

function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

function scheduleReconnect(delayMs = 5000) {
  if (reconnectTimer || isConnecting) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    handleDisconnect();
  }, delayMs);
}

function handleDisconnect() {
  if (isConnecting) return;
  isConnecting = true;

  connection = createConnection();

  connection.connect((err) => {
    isConnecting = false;

    if (err) {
      console.error('Error al conectar a la base de datos:', err);
      scheduleReconnect();
      return;
    }

    console.log('Conectado a la base de datos.');
  });

  connection.on('error', (err) => {
    console.error('Error de MySQL:', err);

    const recoverableErrors = [
      'PROTOCOL_CONNECTION_LOST',
      'ECONNRESET',
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
      'PROTOCOL_ENQUEUE_AFTER_QUIT',
      'PROTOCOL_INCORRECT_PACKET_SEQUENCE',
    ];

    if (recoverableErrors.includes(err.code)) {
      console.log('Reconectando a MySQL...');
      scheduleReconnect(1000);
      return;
    }

    throw err;
  });
}

handleDisconnect();

module.exports = {
  query: (...args) => connection.query(...args),
  execute: (...args) => connection.execute(...args),
  end: (...args) => connection.end(...args),
  getConnection: () => connection,
};
