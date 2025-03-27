const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pico-pal', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// 定义任务模型
const TaskSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    important: { type: Boolean, default: false },
    listId: { type: String, default: 'default' },
    dueDate: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', TaskSchema);

// 定义列表模型
const ListSchema = new mongoose.Schema({
    name: { type: String, required: true },
    color: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const List = mongoose.model('List', ListSchema);

// API路由
// 获取所有任务
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 创建新任务
app.post('/api/tasks', async (req, res) => {
    try {
        const task = new Task(req.body);
        const newTask = await task.save();
        res.status(201).json(newTask);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 更新任务
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 获取所有列表
app.get('/api/lists', async (req, res) => {
    try {
        const lists = await List.find().sort({ createdAt: -1 });
        res.json(lists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 创建新列表
app.post('/api/lists', async (req, res) => {
    try {
        const list = new List(req.body);
        const newList = await list.save();
        res.status(201).json(newList);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 删除列表
app.delete('/api/lists/:id', async (req, res) => {
    try {
        await List.findByIdAndDelete(req.params.id);
        // 将列表中的任务移动到默认列表
        await Task.updateMany(
            { listId: req.params.id },
            { listId: 'default' }
        );
        res.json({ message: 'List deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 