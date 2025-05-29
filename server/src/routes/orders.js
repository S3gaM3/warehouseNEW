const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все заказы
router.get('/', async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, s.name as supplier_name
            FROM orders o
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            ORDER BY o.created_at DESC
        `);
        res.json(orders);
    } catch (err) {
        console.error('Ошибка при получении заказов:', err);
        res.status(500).json({ error: 'Ошибка при получении заказов' });
    }
});

// Получить заказ по ID
router.get('/:id', async (req, res) => {
    try {
        const [order] = await pool.query(`
            SELECT o.*, s.name as supplier_name
            FROM orders o
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            WHERE o.id = ?
        `, [req.params.id]);

        if (order.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const [items] = await pool.query(`
            SELECT oi.*, p.name as product_name, p.unit
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);

        res.json({
            ...order[0],
            items
        });
    } catch (err) {
        console.error('Ошибка при получении заказа:', err);
        res.status(500).json({ error: 'Ошибка при получении заказа' });
    }
});

// Создать новый заказ
router.post('/', async (req, res) => {
    const { order_number, supplier_id, order_type, status, expected_date, notes, items } = req.body;
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Создаем заказ
        const [orderResult] = await connection.query(
            'INSERT INTO orders (order_number, supplier_id, order_type, status, expected_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [order_number, supplier_id, order_type, status, expected_date, notes]
        );

        const orderId = orderResult.insertId;

        // Добавляем товары в заказ
        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        await connection.commit();

        // Получаем созданный заказ с товарами
        const [order] = await connection.query(`
            SELECT o.*, s.name as supplier_name
            FROM orders o
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            WHERE o.id = ?
        `, [orderId]);

        const [orderItems] = await connection.query(`
            SELECT oi.*, p.name as product_name, p.unit
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        res.status(201).json({
            ...order[0],
            items: orderItems
        });
    } catch (err) {
        await connection.rollback();
        console.error('Ошибка при создании заказа:', err);
        res.status(500).json({ error: 'Ошибка при создании заказа' });
    } finally {
        connection.release();
    }
});

// Обновить заказ
router.put('/:id', async (req, res) => {
    const { order_number, supplier_id, order_type, status, expected_date, notes, items } = req.body;
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Обновляем заказ
        const [orderResult] = await connection.query(
            'UPDATE orders SET order_number = ?, supplier_id = ?, order_type = ?, status = ?, expected_date = ?, notes = ? WHERE id = ?',
            [order_number, supplier_id, order_type, status, expected_date, notes, req.params.id]
        );

        if (orderResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        // Удаляем старые товары
        await connection.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

        // Добавляем новые товары
        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [req.params.id, item.product_id, item.quantity, item.price]
            );
        }

        await connection.commit();

        // Получаем обновленный заказ с товарами
        const [order] = await connection.query(`
            SELECT o.*, s.name as supplier_name
            FROM orders o
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            WHERE o.id = ?
        `, [req.params.id]);

        const [orderItems] = await connection.query(`
            SELECT oi.*, p.name as product_name, p.unit
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);

        res.json({
            ...order[0],
            items: orderItems
        });
    } catch (err) {
        await connection.rollback();
        console.error('Ошибка при обновлении заказа:', err);
        res.status(500).json({ error: 'Ошибка при обновлении заказа' });
    } finally {
        connection.release();
    }
});

// Удалить заказ
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Удаляем товары заказа
        await connection.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

        // Удаляем заказ
        const [result] = await connection.query('DELETE FROM orders WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        await connection.commit();
        res.json({ message: 'Заказ успешно удален' });
    } catch (err) {
        await connection.rollback();
        console.error('Ошибка при удалении заказа:', err);
        res.status(500).json({ error: 'Ошибка при удалении заказа' });
    } finally {
        connection.release();
    }
});

module.exports = router; 