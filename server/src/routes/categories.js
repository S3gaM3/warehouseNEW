const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все категории
router.get('/', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(categories);
    } catch (err) {
        console.error('Ошибка при получении категорий:', err);
        res.status(500).json({ error: 'Ошибка при получении категорий' });
    }
});

// Получить категорию по ID
router.get('/:id', async (req, res) => {
    try {
        const [category] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        if (category.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        res.json(category[0]);
    } catch (err) {
        console.error('Ошибка при получении категории:', err);
        res.status(500).json({ error: 'Ошибка при получении категории' });
    }
});

// Создать новую категорию
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description]
        );
        res.status(201).json({
            id: result.insertId,
            name,
            description
        });
    } catch (err) {
        console.error('Ошибка при создании категории:', err);
        res.status(500).json({ error: 'Ошибка при создании категории' });
    }
});

// Обновить категорию
router.put('/:id', async (req, res) => {
    const { name, description } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        res.json({ id: req.params.id, name, description });
    } catch (err) {
        console.error('Ошибка при обновлении категории:', err);
        res.status(500).json({ error: 'Ошибка при обновлении категории' });
    }
});

// Удалить категорию
router.delete('/:id', async (req, res) => {
    try {
        // Проверяем, есть ли товары в этой категории
        const [products] = await pool.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
        if (products[0].count > 0) {
            return res.status(400).json({ error: 'Невозможно удалить категорию, содержащую товары' });
        }

        const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        res.json({ message: 'Категория успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении категории:', err);
        res.status(500).json({ error: 'Ошибка при удалении категории' });
    }
});

module.exports = router; 