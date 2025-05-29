const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получение статистики склада
router.get('/stats', async (req, res) => {
  try {
    const [totalProducts] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM products
    `);

    const [lowStock] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE quantity <= min_quantity
    `);

    const [incomingOrders] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status = 'pending' AND type = 'incoming'
    `);

    const [outgoingOrders] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status = 'pending' AND type = 'outgoing'
    `);

    res.json({
      totalProducts: totalProducts[0].count,
      lowStock: lowStock[0].count,
      incomingOrders: incomingOrders[0].count,
      outgoingOrders: outgoingOrders[0].count
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение последних перемещений
router.get('/movements', async (req, res) => {
  try {
    const { start_date, end_date, search } = req.query;
    let query = `
      SELECT 
        sm.*,
        p.name as product_name,
        p.unit
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND sm.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND sm.created_at <= ?';
      params.push(end_date);
    }
    if (search) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY sm.created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Ошибка при получении перемещений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение текущего состояния склада
router.get('/inventory', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.*,
        CASE 
          WHEN p.quantity <= p.min_quantity THEN 'low'
          WHEN p.quantity = 0 THEN 'out'
          ELSE 'ok'
        END as stock_status
      FROM products p
      ORDER BY p.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Ошибка при получении инвентаря:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление количества товара
router.put('/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, location, notes } = req.body;

    // Проверяем существование товара
    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Получаем старое количество
    const oldQuantity = product[0].quantity;
    const quantityDiff = quantity - oldQuantity;

    // Обновляем количество
    await pool.query(
      'UPDATE products SET quantity = ?, location = ? WHERE id = ?',
      [quantity, location, id]
    );

    // Логируем движение
    if (quantityDiff !== 0) {
      await pool.query(
        `INSERT INTO stock_movements (
          product_id, quantity, movement_type, reference_type, reference_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          quantityDiff,
          quantityDiff > 0 ? 'incoming' : 'outgoing',
          'adjustment',
          id,
          notes || 'Корректировка количества'
        ]
      );
    }

    res.json({ message: 'Количество успешно обновлено' });
  } catch (error) {
    console.error('Ошибка при обновлении количества:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router; 