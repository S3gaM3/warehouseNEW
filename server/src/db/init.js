const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'warehouse_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initializeDatabase() {
    try {
        // Читаем схему базы данных
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        // Разбиваем схему на отдельные запросы
        const queries = schema
            .split(';')
            .filter(query => query.trim())
            .map(query => query + ';');

        // Выполняем каждый запрос
        for (const query of queries) {
            await pool.query(query);
        }

        console.log('База данных успешно инициализирована');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        throw error;
    }
}

module.exports = {
    pool,
    initializeDatabase
}; 