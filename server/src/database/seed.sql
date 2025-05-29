-- seed.sql
-- Отключаем проверку внешних ключей
SET FOREIGN_KEY_CHECKS = 0;

-- Удаление данных в правильном порядке
DELETE FROM stock_movements;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM inventory;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM suppliers;
DELETE FROM invoices;
DELETE FROM settings;
DELETE FROM users;

-- Включаем проверку внешних ключей
SET FOREIGN_KEY_CHECKS = 1;

-- Сброс автоинкремента
ALTER TABLE stock_movements AUTO_INCREMENT = 1;
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE inventory AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE categories AUTO_INCREMENT = 1;
ALTER TABLE suppliers AUTO_INCREMENT = 1;
ALTER TABLE invoices AUTO_INCREMENT = 1;
ALTER TABLE settings AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

-- Добавление тестового пользователя
INSERT INTO users (username, password, full_name, role) VALUES
('admin', '$2a$10$y6JMLHNzo86vwLIEFw6sOeeNzNtL62URnbYbOjVCCw1X9gFxq5Roa', 'Администратор', 'admin');

-- Добавление тестовых категорий
INSERT INTO categories (name, description) VALUES
('Электроника', 'Электронные устройства и компоненты'),
('Мебель', 'Офисная и складская мебель'),
('Канцелярия', 'Канцелярские принадлежности'),
('Хозяйственные товары', 'Товары для уборки и обслуживания');

-- Добавление тестовых поставщиков
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('ООО "ТехноСнаб"', 'Иванов Иван', '+7 (999) 123-45-67', 'info@technosnab.ru', 'г. Москва, ул. Техническая, 1'),
('ИП Петров', 'Петров Петр', '+7 (999) 765-43-21', 'petrov@mail.ru', 'г. Санкт-Петербург, пр. Невский, 100'),
('ООО "КанцОпт"', 'Сидорова Анна', '+7 (999) 111-22-33', 'kancopt@mail.ru', 'г. Москва, ул. Канцелярская, 5');

-- Добавление тестовых товаров
INSERT INTO products (name, description, category_id, supplier_id, sku, barcode, unit, price) VALUES
('Ноутбук Dell XPS 13', 'Мощный ноутбук для работы', 1, 1, 'NB-DELL-XPS13', '4601234567890', 'шт', 89999.99),
('Стол офисный', 'Стол для офиса с ящиками', 2, 2, 'FURN-TABLE-001', '4602345678901', 'шт', 12999.99),
('Ручка шариковая', 'Синяя шариковая ручка', 3, 3, 'PEN-BALL-001', '4603456789012', 'шт', 29.99),
('Моющее средство', 'Универсальное моющее средство', 4, 1, 'CLEAN-001', '4604567890123', 'л', 299.99);

-- Добавление тестовых записей инвентаря
INSERT INTO inventory (product_id, quantity, min_quantity, max_quantity, location) VALUES
(1, 10, 2, 20, 'Склад А'),
(2, 5, 1, 10, 'Склад Б'),
(3, 100, 20, 200, 'Склад В'),
(4, 50, 10, 100, 'Склад А');

-- Добавление тестовых настроек
INSERT INTO settings (key_name, value, description) VALUES
('company_name', 'ООО "Склад+"', 'Название компании'),
('company_address', 'г. Москва, ул. Складская, 1', 'Адрес компании'),
('company_phone', '+7 (999) 999-99-99', 'Телефон компании'),
('company_email', 'info@sklad.ru', 'Email компании'),
('currency', 'RUB', 'Валюта по умолчанию'),
('low_stock_threshold', '10', 'Порог низкого остатка'),
('enable_notifications', 'true', 'Включить уведомления'),
('enable_auto_orders', 'false', 'Включить автоматические заказы');

-- Добавление тестовых заказов
INSERT INTO orders (order_number, order_date, supplier_id, status, total_amount, created_by) VALUES
('ORD-2023-001', '2023-03-01', 1, 'received', 180000.00, 1),
('ORD-2023-002', '2023-03-15', 2, 'pending', 12000.00, 1);

-- Добавление элементов заказов
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 2, 89999.99, 179999.98),
(1, 3, 50, 25.99, 1299.50),
(2, 2, 2, 5999.99, 11999.98),
(2, 4, 100, 89.99, 8999.00);

-- Добавление движений товаров
INSERT INTO stock_movements (product_id, movement_type, quantity, movement_date, reference_number, created_by) VALUES
(1, 'in', 5, '2023-03-02', 'INIT-001', 1),
(2, 'in', 10, '2023-03-02', 'INIT-002', 1),
(3, 'in', 200, '2023-03-02', 'INIT-003', 1),
(4, 'in', 150, '2023-03-02', 'INIT-004', 1);

-- Добавление тестовых счетов
INSERT INTO invoices (invoice_number, supplier_id, invoice_date, due_date, amount, tax_amount, total_amount, status, created_by) VALUES
('INV-2023-001', 1, '2023-03-01', '2023-03-31', 152542.36, 27457.62, 180000.00, 'paid', 1),
('INV-2023-002', 2, '2023-03-15', '2023-04-14', 10169.47, 1830.51, 12000.00, 'pending', 1);