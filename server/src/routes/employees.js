const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('./auth');

// Получение списка сотрудников
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, full_name, position, email, phone, hire_date, salary, status
            FROM employees
            ORDER BY full_name
        `);
        res.json(result[0]);
    } catch (error) {
        console.error('Ошибка при получении списка сотрудников:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении списка сотрудников' });
    }
});

// Получение сотрудника по ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [employee] = await pool.query(`
            SELECT id, full_name, position, email, phone, hire_date, salary, status
            FROM employees
            WHERE id = ?
        `, [req.params.id]);

        if (!employee) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Ошибка при получении сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении сотрудника' });
    }
});

// Создание нового сотрудника
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { full_name, position, email, phone, hire_date, salary, status } = req.body;
        
        const result = await pool.query(`
            INSERT INTO employees (full_name, position, email, phone, hire_date, salary, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [full_name, position, email, phone, hire_date, salary, status]);

        res.status(201).json({ id: result[0].insertId });
    } catch (error) {
        console.error('Ошибка при создании сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании сотрудника' });
    }
});

// Обновление сотрудника
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { full_name, position, email, phone, hire_date, salary, status } = req.body;
        
        const result = await pool.query(`
            UPDATE employees
            SET full_name = ?, position = ?, email = ?, phone = ?, hire_date = ?, salary = ?, status = ?
            WHERE id = ?
        `, [full_name, position, email, phone, hire_date, salary, status, req.params.id]);

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        res.json({ message: 'Сотрудник успешно обновлен' });
    } catch (error) {
        console.error('Ошибка при обновлении сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера при обновлении сотрудника' });
    }
});

// Удаление сотрудника
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
        
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        res.json({ message: 'Сотрудник успешно удален' });
    } catch (error) {
        console.error('Ошибка при удалении сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера при удалении сотрудника' });
    }
});

module.exports = router; 