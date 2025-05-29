const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('./auth');

// Получение настроек
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [settings] = await pool.query('SELECT * FROM settings LIMIT 1');
        
        if (!settings) {
            return res.status(404).json({ error: 'Настройки не найдены' });
        }

        res.json(settings);
    } catch (error) {
        console.error('Ошибка при получении настроек:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении настроек' });
    }
});

// Обновление настроек
router.put('/', authenticateToken, async (req, res) => {
    try {
        const {
            company_name,
            company_address,
            company_phone,
            company_email,
            tax_rate,
            currency,
            language,
            notifications_enabled,
            email_notifications,
            sms_notifications
        } = req.body;

        const result = await pool.query(`
            UPDATE settings SET
                company_name = ?,
                company_address = ?,
                company_phone = ?,
                company_email = ?,
                tax_rate = ?,
                currency = ?,
                language = ?,
                notifications_enabled = ?,
                email_notifications = ?,
                sms_notifications = ?
            WHERE id = 1
        `, [
            company_name,
            company_address,
            company_phone,
            company_email,
            tax_rate,
            currency,
            language,
            notifications_enabled,
            email_notifications,
            sms_notifications
        ]);

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Настройки не найдены' });
        }

        res.json({ message: 'Настройки успешно обновлены' });
    } catch (error) {
        console.error('Ошибка при обновлении настроек:', error);
        res.status(500).json({ error: 'Ошибка сервера при обновлении настроек' });
    }
});

module.exports = router; 