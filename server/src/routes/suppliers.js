const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить всех поставщиков
router.get('/', async (req, res) => {
    try {
        const [suppliers] = await pool.query('SELECT * FROM suppliers ORDER BY name');
        res.json(suppliers);
    } catch (err) {
        console.error('Ошибка при получении поставщиков:', err);
        res.status(500).json({ error: 'Ошибка при получении поставщиков' });
    }
});

// Получить поставщика по ID
router.get('/:id', async (req, res) => {
    try {
        const [supplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (supplier.length === 0) {
            return res.status(404).json({ error: 'Поставщик не найден' });
        }
        res.json(supplier[0]);
    } catch (err) {
        console.error('Ошибка при получении поставщика:', err);
        res.status(500).json({ error: 'Ошибка при получении поставщика' });
    }
});

// Создать нового поставщика
router.post('/', async (req, res) => {
    const { name, contact_person, phone, email, address, notes } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO suppliers (name, contact_person, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [name, contact_person, phone, email, address, notes]
        );
        res.status(201).json({
            id: result.insertId,
            name,
            contact_person,
            phone,
            email,
            address,
            notes
        });
    } catch (err) {
        console.error('Ошибка при создании поставщика:', err);
        res.status(500).json({ error: 'Ошибка при создании поставщика' });
    }
});

// Обновить поставщика
router.put('/:id', async (req, res) => {
    const { name, contact_person, phone, email, address, notes } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
            [name, contact_person, phone, email, address, notes, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Поставщик не найден' });
        }
        res.json({
            id: req.params.id,
            name,
            contact_person,
            phone,
            email,
            address,
            notes
        });
    } catch (err) {
        console.error('Ошибка при обновлении поставщика:', err);
        res.status(500).json({ error: 'Ошибка при обновлении поставщика' });
    }
});

// Удалить поставщика
router.delete('/:id', async (req, res) => {
    try {
        // Проверяем, есть ли заказы у этого поставщика
        const [orders] = await pool.query('SELECT COUNT(*) as count FROM orders WHERE supplier_id = ?', [req.params.id]);
        if (orders[0].count > 0) {
            return res.status(400).json({ error: 'Невозможно удалить поставщика, у которого есть заказы' });
        }

        const [result] = await pool.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Поставщик не найден' });
        }
        res.json({ message: 'Поставщик успешно удален' });
    } catch (err) {
        console.error('Ошибка при удалении поставщика:', err);
        res.status(500).json({ error: 'Ошибка при удалении поставщика' });
    }
});

module.exports = router; 