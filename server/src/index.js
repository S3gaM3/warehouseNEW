require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase, pool } = require('./db/init');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const productsRouter = require('./routes/products');
const warehouseRouter = require('./routes/warehouse');
const categoriesRouter = require('./routes/categories');
const suppliersRouter = require('./routes/suppliers');
const ordersRouter = require('./routes/orders');
const reportsRouter = require('./routes/reports');
const settingsRouter = require('./routes/settings');
const employeesRouter = require('./routes/employees');
const invoicesRouter = require('./routes/invoices');
const { router: authRouter } = require('./routes/auth');

app.use('/api/products', productsRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/auth', authRouter);

// Проверка подключения к базе данных
async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Успешное подключение к базе данных');
        connection.release();
    } catch (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
        process.exit(1);
    }
}

// Basic routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Сервер работает' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Ошибка:', err.stack);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

async function startServer() {
    try {
        // Инициализация базы данных
        await initializeDatabase();

        // Запуск сервера
        app.listen(port, async () => {
            console.log(`Сервер запущен на порту ${port}`);
            await testDatabaseConnection();
        });
    } catch (error) {
        console.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
}

startServer(); 