const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('./auth');

// Получение списка накладных
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.*, s.name as supplier_name
            FROM invoices i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.created_at DESC
        `);
        res.json(result[0]);
    } catch (error) {
        console.error('Ошибка при получении списка накладных:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении списка накладных' });
    }
});

// Получение накладной по ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [invoice] = await pool.query(`
            SELECT i.*, s.name as supplier_name
            FROM invoices i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.id = ?
        `, [req.params.id]);

        if (!invoice) {
            return res.status(404).json({ error: 'Накладная не найдена' });
        }

        res.json(invoice);
    } catch (error) {
        console.error('Ошибка при получении накладной:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении накладной' });
    }
});

// Создание новой накладной
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { supplier_id, invoice_number, invoice_date, amount, tax_amount, total_amount, status } = req.body;
        
        const result = await pool.query(`
            INSERT INTO invoices (supplier_id, invoice_number, invoice_date, amount, tax_amount, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [supplier_id, invoice_number, invoice_date, amount, tax_amount, total_amount, status]);

        res.status(201).json({ id: result[0].insertId });
    } catch (error) {
        console.error('Ошибка при создании накладной:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании накладной' });
    }
});

// Обновление накладной
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { supplier_id, invoice_number, invoice_date, amount, tax_amount, total_amount, status } = req.body;
        
        const result = await pool.query(`
            UPDATE invoices
            SET supplier_id = ?, invoice_number = ?, invoice_date = ?, amount = ?, tax_amount = ?, total_amount = ?, status = ?
            WHERE id = ?
        `, [supplier_id, invoice_number, invoice_date, amount, tax_amount, total_amount, status, req.params.id]);

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Накладная не найдена' });
        }

        res.json({ message: 'Накладная успешно обновлена' });
    } catch (error) {
        console.error('Ошибка при обновлении накладной:', error);
        res.status(500).json({ error: 'Ошибка сервера при обновлении накладной' });
    }
});

// Удаление накладной
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
        
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Накладная не найдена' });
        }

        res.json({ message: 'Накладная успешно удалена' });
    } catch (error) {
        console.error('Ошибка при удалении накладной:', error);
        res.status(500).json({ error: 'Ошибка сервера при удалении накладной' });
    }
});

// Печать накладной
router.get('/:id/print', authenticateToken, async (req, res) => {
    try {
        const [invoice] = await pool.query(`
            SELECT i.*, s.name as supplier_name, s.address as supplier_address
            FROM invoices i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.id = ?
        `, [req.params.id]);

        if (!invoice) {
            return res.status(404).json({ error: 'Накладная не найдена' });
        }

        // TODO: Реализовать генерацию PDF
        res.json({ message: 'Функция печати будет реализована позже', invoice });
    } catch (error) {
        console.error('Ошибка при подготовке накладной к печати:', error);
        res.status(500).json({ error: 'Ошибка сервера при подготовке накладной к печати' });
    }
});

module.exports = router;