const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('./auth');

// Вспомогательные функции
function getDateFilter(period) {
    const now = new Date();
    switch (period) {
        case 'week':
            return new Date(now.setDate(now.getDate() - 7));
        case 'month':
            return new Date(now.setMonth(now.getMonth() - 1));
        case 'quarter':
            return new Date(now.setMonth(now.getMonth() - 3));
        case 'year':
            return new Date(now.setFullYear(now.getFullYear() - 1));
        default:
            return new Date(now.setMonth(now.getMonth() - 1));
    }
}

function getGroupBy(period) {
    switch (period) {
        case 'week':
            return '%Y-%m-%d';
        case 'month':
            return '%Y-%m-%d';
        case 'quarter':
            return '%Y-%m';
        case 'year':
            return '%Y-%m';
        default:
            return '%Y-%m-%d';
    }
}

// Получение сводной информации
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const { period } = req.query;
        const dateFilter = getDateFilter(period);

        const [salesResult, ordersResult, lowStockResult] = await Promise.all([
            pool.query(`
                SELECT COALESCE(SUM(total_amount), 0) as total_sales
                FROM orders
                WHERE created_at >= ?
            `, [dateFilter]),
            pool.query(`
                SELECT COUNT(*) as total_orders,
                       COALESCE(AVG(total_amount), 0) as avg_order_value
                FROM orders
                WHERE created_at >= ?
            `, [dateFilter]),
            pool.query(`
                SELECT COUNT(*) as low_stock_items
                FROM inventory
                WHERE quantity <= min_quantity
            `)
        ]);

        res.json({
            totalSales: salesResult[0][0].total_sales,
            totalOrders: ordersResult[0][0].total_orders,
            averageOrderValue: ordersResult[0][0].avg_order_value,
            lowStockItems: lowStockResult[0][0].low_stock_items
        });
    } catch (error) {
        console.error('Ошибка при получении сводной информации:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении сводной информации' });
    }
});

// Получение данных о продажах
router.get('/sales', authenticateToken, async (req, res) => {
    try {
        const { period } = req.query;
        const dateFilter = getDateFilter(period);
        const groupBy = getGroupBy(period);

        const result = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, ?) as date,
                SUM(total_amount) as sales
            FROM orders
            WHERE created_at >= ?
            GROUP BY DATE_FORMAT(created_at, ?)
            ORDER BY date
        `, [groupBy, dateFilter, groupBy]);

        res.json(result[0]);
    } catch (error) {
        console.error('Ошибка при получении данных о продажах:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении данных о продажах' });
    }
});

// Получение распределения по категориям
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const { period } = req.query;
        const dateFilter = getDateFilter(period);

        const result = await pool.query(`
            SELECT 
                c.name,
                COUNT(oi.id) as value
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= ?
            GROUP BY c.id, c.name
            ORDER BY value DESC
        `, [dateFilter]);

        res.json(result[0]);
    } catch (error) {
        console.error('Ошибка при получении распределения по категориям:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении распределения по категориям' });
    }
});

// Получение топ продаваемых товаров
router.get('/top-products', authenticateToken, async (req, res) => {
    try {
        const { period } = req.query;
        const dateFilter = getDateFilter(period);

        const result = await pool.query(`
            SELECT 
                p.name,
                SUM(oi.quantity) as quantity,
                SUM(oi.quantity * oi.price) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= ?
            GROUP BY p.id, p.name
            ORDER BY quantity DESC
            LIMIT 10
        `, [dateFilter]);

        res.json(result[0]);
    } catch (error) {
        console.error('Ошибка при получении топ товаров:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении топ товаров' });
    }
});

// Получение отчета по движению товаров
router.get('/inventory-movement', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, product_id } = req.query;
        let query = `
            SELECT 
                p.name as product_name,
                c.name as category_name,
                sm.movement_type,
                sm.quantity,
                sm.movement_date,
                sm.reference_number,
                sm.notes
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            query += ' AND sm.movement_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND sm.movement_date <= ?';
            params.push(end_date);
        }
        if (product_id) {
            query += ' AND sm.product_id = ?';
            params.push(product_id);
        }

        query += ' ORDER BY sm.movement_date DESC';

        const [movements] = await pool.query(query, params);
        res.json(movements);
    } catch (error) {
        console.error('Ошибка при получении отчета по движению товаров:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении отчета' });
    }
});

// Получение отчета по остаткам
router.get('/inventory-balance', authenticateToken, async (req, res) => {
    try {
        const { category_id } = req.query;
        let query = `
            SELECT 
                p.id,
                p.name as product_name,
                c.name as category_name,
                i.quantity,
                i.min_quantity,
                i.max_quantity,
                i.location
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (category_id) {
            query += ' AND p.category_id = ?';
            params.push(category_id);
        }

        query += ' ORDER BY p.name';

        const [balance] = await pool.query(query, params);
        res.json(balance);
    } catch (error) {
        console.error('Ошибка при получении отчета по остаткам:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении отчета' });
    }
});

// Получение отчета по заказам
router.get('/orders', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, status } = req.query;
        let query = `
            SELECT 
                o.id,
                o.order_number,
                o.order_date,
                o.status,
                s.name as supplier_name,
                o.total_amount,
                o.notes
            FROM orders o
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            query += ' AND o.order_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND o.order_date <= ?';
            params.push(end_date);
        }
        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.order_date DESC';

        const [orders] = await pool.query(query, params);
        res.json(orders);
    } catch (error) {
        console.error('Ошибка при получении отчета по заказам:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении отчета' });
    }
});

// Получение отчета по поставщикам
router.get('/suppliers', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT 
                s.id,
                s.name,
                s.contact_person,
                s.email,
                s.phone,
                COUNT(DISTINCT o.id) as total_orders,
                SUM(o.total_amount) as total_amount
            FROM suppliers s
            LEFT JOIN orders o ON s.id = o.supplier_id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            query += ' AND o.order_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND o.order_date <= ?';
            params.push(end_date);
        }

        query += ' GROUP BY s.id ORDER BY s.name';

        const [suppliers] = await pool.query(query, params);
        res.json(suppliers);
    } catch (error) {
        console.error('Ошибка при получении отчета по поставщикам:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении отчета' });
    }
});

module.exports = router; 