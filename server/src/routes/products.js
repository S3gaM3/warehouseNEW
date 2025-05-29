const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все товары
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id'
        );
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении товаров:', err);
        res.status(500).json({ error: 'Ошибка при получении списка товаров' });
    }
});

// Получить товар по ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Неверный формат ID' });
        }

        const [rows] = await pool.query(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Ошибка при получении товара:', err);
        res.status(500).json({ error: 'Ошибка при получении товара' });
    }
});

// Создать новый товар
router.post('/', async (req, res) => {
    try {
        const { name, description, category_id, sku, unit, price, min_quantity } = req.body;

        // Валидация обязательных полей
        if (!name || !sku || !unit || !price || !min_quantity) {
            return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
        }

        // Проверка уникальности SKU
        const [existingProducts] = await pool.query('SELECT id FROM products WHERE sku = ?', [sku]);
        if (existingProducts.length > 0) {
            return res.status(400).json({ error: 'Товар с таким SKU уже существует' });
        }

        const [result] = await pool.query(
            'INSERT INTO products (name, description, category_id, sku, unit, price, min_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description, category_id, sku, unit, price, min_quantity]
        );

        const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        res.status(201).json(newProduct[0]);
    } catch (err) {
        console.error('Ошибка при создании товара:', err);
        res.status(500).json({ error: 'Ошибка при создании товара' });
    }
});

// Обновить товар
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Неверный формат ID' });
        }

        const { name, description, category_id, sku, unit, price, min_quantity } = req.body;

        // Валидация обязательных полей
        if (!name || !sku || !unit || !price || !min_quantity) {
            return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
        }

        // Проверка существования товара
        const [existingProduct] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        // Проверка уникальности SKU
        const [duplicateSku] = await pool.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, id]);
        if (duplicateSku.length > 0) {
            return res.status(400).json({ error: 'Товар с таким SKU уже существует' });
        }

        const [result] = await pool.query(
            'UPDATE products SET name = ?, description = ?, category_id = ?, sku = ?, unit = ?, price = ?, min_quantity = ? WHERE id = ?',
            [name, description, category_id, sku, unit, price, min_quantity, id]
        );

        const [updatedProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        res.json(updatedProduct[0]);
    } catch (err) {
        console.error('Ошибка при обновлении товара:', err);
        res.status(500).json({ error: 'Ошибка при обновлении товара' });
    }
});

// Удалить товар
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Неверный формат ID' });
        }

        // Проверка существования товара
        const [existingProduct] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        // Проверка наличия связанных записей
        const [inventory] = await pool.query('SELECT id FROM inventory WHERE product_id = ?', [id]);
        const [orderItems] = await pool.query('SELECT id FROM order_items WHERE product_id = ?', [id]);
        const [stockMovements] = await pool.query('SELECT id FROM stock_movements WHERE product_id = ?', [id]);

        if (inventory.length > 0 || orderItems.length > 0 || stockMovements.length > 0) {
            return res.status(400).json({ 
                error: 'Невозможно удалить товар, так как он используется в других таблицах' 
            });
        }

        await pool.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Товар успешно удален' });
    } catch (err) {
        console.error('Ошибка при удалении товара:', err);
        res.status(500).json({ error: 'Ошибка при удалении товара' });
    }
});

module.exports = router; 