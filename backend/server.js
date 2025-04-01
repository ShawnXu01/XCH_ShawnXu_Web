const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 创建数据库连接
const db = new sqlite3.Database('pico-pal.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// 初始化数据库表
function initDatabase() {
    db.serialize(() => {
        // 创建任务表
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            important BOOLEAN DEFAULT 0,
            listId TEXT DEFAULT 'default',
            dueDate TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // 创建列表表
        db.run(`CREATE TABLE IF NOT EXISTS lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

// API路由
// 任务相关路由
app.get('/api/tasks', (req, res) => {
    db.all('SELECT * FROM tasks ORDER BY createdAt DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ message: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/tasks', (req, res) => {
    const { text, completed, important, listId, dueDate } = req.body;
    db.run(
        'INSERT INTO tasks (text, completed, important, listId, dueDate) VALUES (?, ?, ?, ?, ?)',
        [text, completed || false, important || false, listId || 'default', dueDate],
        function(err) {
            if (err) {
                res.status(400).json({ message: err.message });
                return;
            }
            db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
                if (err) {
                    res.status(500).json({ message: err.message });
                    return;
                }
                res.status(201).json(row);
            });
        }
    );
});

app.put('/api/tasks/:id', (req, res) => {
    const { text, completed, important, listId, dueDate } = req.body;
    db.run(
        'UPDATE tasks SET text = ?, completed = ?, important = ?, listId = ?, dueDate = ? WHERE id = ?',
        [text, completed, important, listId, dueDate, req.params.id],
        function(err) {
            if (err) {
                res.status(400).json({ message: err.message });
                return;
            }
            db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
                if (err) {
                    res.status(500).json({ message: err.message });
                    return;
                }
                res.json(row);
            });
        }
    );
});

app.delete('/api/tasks/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(400).json({ message: err.message });
            return;
        }
        res.status(204).send();
    });
});

// 列表相关路由
app.get('/api/lists', (req, res) => {
    db.all('SELECT * FROM lists ORDER BY createdAt DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ message: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/lists', (req, res) => {
    const { name, color } = req.body;
    db.run(
        'INSERT INTO lists (name, color) VALUES (?, ?)',
        [name, color],
        function(err) {
            if (err) {
                res.status(400).json({ message: err.message });
                return;
            }
            db.get('SELECT * FROM lists WHERE id = ?', [this.lastID], (err, row) => {
                if (err) {
                    res.status(500).json({ message: err.message });
                    return;
                }
                res.status(201).json(row);
            });
        }
    );
});

app.delete('/api/lists/:id', (req, res) => {
    // 开始事务
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 将属于该列表的任务移动到默认列表
        db.run('UPDATE tasks SET listId = ? WHERE listId = ?', ['default', req.params.id]);

        // 删除列表
        db.run('DELETE FROM lists WHERE id = ?', [req.params.id], function(err) {
            if (err) {
                db.run('ROLLBACK');
                res.status(400).json({ message: err.message });
                return;
            }
            db.run('COMMIT');
            res.status(204).send();
        });
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 