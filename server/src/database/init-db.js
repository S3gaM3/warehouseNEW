const mysql = require('mysql2/promise');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Загружаем переменные окружения
const envPath = path.resolve(__dirname, '../../.env');
console.log('🔍 Ищем файл .env по пути:', envPath);

if (fs.existsSync(envPath)) {
    console.log('✅ Файл .env найден');
    dotenv.config({ path: envPath });
} else {
    console.error('❌ Файл .env не найден по пути:', envPath);
    process.exit(1);
}

// Проверяем наличие необходимых переменных окружения
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Отсутствуют необходимые переменные окружения:', missingEnvVars.join(', '));
    console.error('ℹ️ Убедитесь, что файл .env существует и содержит все необходимые переменные');
    console.log('📝 Текущие значения переменных окружения:');
    requiredEnvVars.forEach(varName => {
        console.log(`${varName}: ${process.env[varName] || 'не установлено'}`);
    });
    process.exit(1);
}

async function executeSqlFile(connection, filePath) {
    try {
        const sqlScript = await fsPromises.readFile(filePath, 'utf8');
        
        // Разбиваем скрипт на отдельные запросы
        const queries = [];
        let currentQuery = '';
        let delimiter = ';';
        let inDelimiterBlock = false;
        
        for (const line of sqlScript.split('\n')) {
            const trimmedLine = line.trim();
            
            // Проверяем изменение разделителя
            if (trimmedLine.startsWith('DELIMITER')) {
                if (!inDelimiterBlock) {
                    delimiter = trimmedLine.split(' ')[1];
                    inDelimiterBlock = true;
                } else {
                    delimiter = ';';
                    inDelimiterBlock = false;
                }
                continue;
            }
            
            // Добавляем строку к текущему запросу
            currentQuery += line + '\n';
            
            // Если строка заканчивается текущим разделителем
            if (currentQuery.trim().endsWith(delimiter)) {
                // Удаляем разделитель и добавляем запрос
                const query = currentQuery.trim().slice(0, -delimiter.length);
                if (query) {
                    queries.push(query);
                }
                currentQuery = '';
            }
        }
        
        // Добавляем последний запрос, если он есть
        if (currentQuery.trim()) {
            queries.push(currentQuery.trim());
        }

        // Выполняем запросы
        for (const query of queries) {
            if (query.trim()) {
                await connection.query(query);
            }
        }
        
        console.log(`✅ SQL-скрипт ${path.basename(filePath)} успешно выполнен`);
    } catch (error) {
        console.error(`❌ Ошибка при выполнении SQL-скрипта ${path.basename(filePath)}:`, error);
        throw error;
    }
}

async function dropDatabase(connection) {
    try {
        await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
        console.log(`🗑️ База данных ${process.env.DB_NAME} удалена`);
    } catch (error) {
        console.error('❌ Ошибка при удалении базы данных:', error);
        throw error;
    }
}

async function createDatabase(connection) {
    try {
        await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
        console.log(`📦 База данных ${process.env.DB_NAME} создана`);
    } catch (error) {
        console.error('❌ Ошибка при создании базы данных:', error);
        throw error;
    }
}

async function useDatabase(connection) {
    try {
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log(`🔌 Используем базу данных ${process.env.DB_NAME}`);
    } catch (error) {
        console.error('❌ Ошибка при выборе базы данных:', error);
        throw error;
    }
}

async function checkDatabaseExists(connection) {
    try {
        const [rows] = await connection.query(
            `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
            [process.env.DB_NAME]
        );
        return rows.length > 0;
    } catch (error) {
        console.error('❌ Ошибка при проверке существования базы данных:', error);
        throw error;
    }
}

async function checkTablesExist(connection) {
    try {
        const [rows] = await connection.query(
            `SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = ?`,
            [process.env.DB_NAME]
        );
        return rows[0].count > 0;
    } catch (error) {
        console.error('❌ Ошибка при проверке существования таблиц:', error);
        throw error;
    }
}

async function initializeDatabase() {
    let connection;

    try {
        // Создаем подключение к MySQL без указания базы данных
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        console.log(`🔌 Подключение к MySQL установлено (${process.env.DB_USER}@${process.env.DB_HOST})`);

        // Проверяем существование базы данных
        const dbExists = await checkDatabaseExists(connection);
        
        if (dbExists) {
            console.log(`ℹ️ База данных ${process.env.DB_NAME} уже существует`);
            
            // Используем базу данных
            await useDatabase(connection);
            
            // Проверяем существование таблиц
            const tablesExist = await checkTablesExist(connection);
            
            if (tablesExist) {
                console.log('ℹ️ Таблицы уже существуют');
                
                // Спрашиваем пользователя о пересоздании базы данных
                const readline = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                const answer = await new Promise(resolve => {
                    readline.question('База данных уже существует. Пересоздать? (y/n): ', resolve);
                });
                readline.close();

                if (answer.toLowerCase() === 'y') {
                    // Удаляем и пересоздаем базу данных
                    await dropDatabase(connection);
                    await createDatabase(connection);
                    await useDatabase(connection);
                    await executeSqlFile(connection, path.join(__dirname, 'init.sql'));
                    await executeSqlFile(connection, path.join(__dirname, 'seed.sql'));
                    console.log('✅ База данных успешно пересоздана и заполнена тестовыми данными');
                } else {
                    console.log('ℹ️ Оставляем существующую базу данных без изменений');
                }
            } else {
                // Если база существует, но таблиц нет
                await executeSqlFile(connection, path.join(__dirname, 'init.sql'));
                await executeSqlFile(connection, path.join(__dirname, 'seed.sql'));
                console.log('✅ Таблицы созданы и заполнены тестовыми данными');
            }
        } else {
            // Если база не существует
            await createDatabase(connection);
            await useDatabase(connection);
            await executeSqlFile(connection, path.join(__dirname, 'init.sql'));
            await executeSqlFile(connection, path.join(__dirname, 'seed.sql'));
            console.log('✅ База данных создана и заполнена тестовыми данными');
        }

    } catch (error) {
        console.error('❌ Ошибка при инициализации базы данных:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Соединение с базой данных закрыто');
        }
    }
}

// Запускаем инициализацию
console.log('🚀 Начинаем инициализацию базы данных...');
initializeDatabase()
    .then(() => {
        console.log('✅ Скрипт инициализации базы данных успешно завершен');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Ошибка при выполнении скрипта:', error);
        process.exit(1);
    }); 