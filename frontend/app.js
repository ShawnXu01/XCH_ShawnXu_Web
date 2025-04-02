// API配置
const API_BASE_URL = 'http://localhost:3000/api';

// 任务管理类
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentList = 'all';
        this.selectedListForNewTask = null;
        this.selectedDueDate = null;
    }

    async init() {
        await this.loadTasks();
        this.setupEventListeners();
        this.renderTasks();
    }

    async loadTasks() {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks`);
            this.tasks = await response.json();
            return this.tasks;
        } catch (error) {
            console.error('Error loading tasks:', error);
            return [];
        }
    }

    async addTask(text) {
        try {
            const taskData = {
                text,
                completed: false,
                important: false,
                listId: this.selectedListForNewTask || 'default',
                dueDate: this.selectedDueDate || null,
                createdAt: new Date().toISOString()
            };

            const response = await fetch(`${API_BASE_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
            const newTask = await response.json();
            this.tasks.push(newTask);
            
            // 如果在已完成列表视图中，则刷新整个任务列表
            if (this.currentList === 'completed') {
                this.renderTasks();
            } else {
                // 找到对应的列表容器
                const listContainer = document.querySelector(`.list-tasks-container[data-list-id="${newTask.listId}"]`);
                if (listContainer) {
                    const tasksContainer = listContainer.querySelector('.list-tasks');
                    // 如果是空列表，清除空状态显示
                    if (tasksContainer.querySelector('.empty-list')) {
                        tasksContainer.innerHTML = '';
                    }
                    // 创建并添加新任务元素
                    this.renderTaskList([newTask], tasksContainer);
                } else {
                    // 如果找不到对应的容器，刷新整个任务列表
                    this.renderTasks();
                }
            }
            
            this.showStatusMessage('任务已添加');
            this.selectedDueDate = null;  // 重置选择的截止时间
            return newTask;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    }

    async toggleTaskComplete(taskId) {
        try {
            const task = this.tasks.find(t => t._id === taskId);
            if (task) {
                const updates = { completed: !task.completed };
                const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates)
                });
                const updatedTask = await response.json();
                const index = this.tasks.findIndex(t => t._id === taskId);
                if (index !== -1) {
                    this.tasks[index] = updatedTask;
                }
                this.renderTasks();
                this.showStatusMessage(updatedTask.completed ? '任务已完成' : '任务已恢复');
                return updatedTask;
            }
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async toggleTaskImportant(taskId) {
        try {
            const task = this.tasks.find(t => t._id === taskId);
            if (task) {
                const updates = { important: !task.important };
                const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates)
                });
                const updatedTask = await response.json();
                const index = this.tasks.findIndex(t => t._id === taskId);
                if (index !== -1) {
                    this.tasks[index] = updatedTask;
                }
                this.renderTasks();
                this.showStatusMessage(updatedTask.important ? '已标记为重要' : '已取消重要标记');
                return updatedTask;
            }
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                method: 'DELETE'
            });
            this.tasks = this.tasks.filter(t => t._id !== taskId);
            this.renderTasks();
            this.showStatusMessage('任务已删除');
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async editTask(taskId, newText) {
        try {
            const updates = { text: newText };
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            });
            const updatedTask = await response.json();
            const index = this.tasks.findIndex(t => t._id === taskId);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
            }
            this.renderTasks();
            this.showStatusMessage('任务已更新');
            return updatedTask;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    filterTasks() {
        let filteredTasks = [...this.tasks];

        // 根据当前列表过滤
        if (this.currentList === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (this.currentList !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.listId === this.currentList);
        }

        // 按重要性和截止日期排序
        filteredTasks.sort((a, b) => {
            // 首先按重要性排序
            if (a.important !== b.important) {
                return b.important - a.important;
            }
            // 然后按截止日期排序
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

        return filteredTasks;
    }

    renderTasks() {
        const container = document.querySelector('.lists-container');
        container.innerHTML = '';

        if (this.currentList === 'completed') {
            this.renderCompletedTasks(container);
            return;
        }

        // 获取所有列表
        const lists = this.getLists();
        
        // 渲染每个列表
        lists.forEach(list => {
            const listTasks = this.tasks.filter(task => task.listId === list.id);
            this.renderListTasks(list, listTasks);
        });
    }

    renderCompletedTasks(container) {
        const completedTasks = this.tasks.filter(task => task.completed);
        if (completedTasks.length === 0) {
            container.innerHTML = '<div class="empty-list">没有已完成的任务</div>';
            return;
        }

        const listContainer = document.createElement('div');
        listContainer.className = 'list-tasks-container';
        listContainer.setAttribute('data-list-id', 'completed');

        const listHeader = document.createElement('div');
        listHeader.className = 'list-header';
        listHeader.innerHTML = `
            <div class="list-title">已完成的任务</div>
        `;
        listContainer.appendChild(listHeader);

        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'list-tasks';
        this.renderTaskList(completedTasks, tasksContainer);
        listContainer.appendChild(tasksContainer);

        container.appendChild(listContainer);
    }

    renderListTasks(list, tasks) {
        const container = document.querySelector('.lists-container');
        const listContainer = document.createElement('div');
        listContainer.className = 'list-tasks-container';
        listContainer.setAttribute('data-list-id', list.id);

        const listHeader = document.createElement('div');
        listHeader.className = 'list-header';
        listHeader.innerHTML = `
            <div class="list-title">${list.name}</div>
            ${list.id !== 'default' ? `<button class="btn-delete-list">🗑️</button>` : ''}
        `;
        listContainer.appendChild(listHeader);

        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'list-tasks';
        if (tasks.length === 0) {
            tasksContainer.innerHTML = '<div class="empty-list">没有任务</div>';
        } else {
            this.renderTaskList(tasks, tasksContainer);
        }
        listContainer.appendChild(tasksContainer);

        container.appendChild(listContainer);
    }

    renderTaskList(tasks, container) {
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                ${task.important ? '<span class="task-important">⭐</span>' : ''}
                ${task.dueDate ? `<span class="task-due-date">截止: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
            `;

            // 添加事件监听器
            const checkbox = taskElement.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => this.toggleTaskComplete(task._id));

            const text = taskElement.querySelector('.task-text');
            text.addEventListener('click', () => {
                const newText = prompt('编辑任务:', task.text);
                if (newText && newText !== task.text) {
                    this.editTask(task._id, newText);
                }
            });

            container.appendChild(taskElement);
        });
    }

    setupEventListeners() {
        // 添加任务
        const taskInput = document.getElementById('taskInput');
        const addTaskBtn = document.getElementById('addTaskBtn');

        addTaskBtn.addEventListener('click', () => {
            const text = taskInput.value.trim();
            if (text) {
                this.addTask(text);
                taskInput.value = '';
            }
        });

        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = taskInput.value.trim();
                if (text) {
                    this.addTask(text);
                    taskInput.value = '';
                }
            }
        });

        // 新建列表
        const newListBtn = document.getElementById('newListBtn');
        const newListModal = document.getElementById('newListModal');
        const cancelNewList = document.getElementById('cancelNewList');
        const confirmNewList = document.getElementById('confirmNewList');
        const listNameInput = document.getElementById('listNameInput');
        const colorOptions = document.querySelectorAll('.color-option');

        newListBtn.addEventListener('click', () => {
            newListModal.classList.add('active');
        });

        cancelNewList.addEventListener('click', () => {
            newListModal.classList.remove('active');
            listNameInput.value = '';
            colorOptions.forEach(option => option.classList.remove('selected'));
        });

        colorOptions.forEach(option => {
            option.style.backgroundColor = option.dataset.color;
            option.addEventListener('click', () => {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        confirmNewList.addEventListener('click', () => {
            const name = listNameInput.value.trim();
            const selectedColor = document.querySelector('.color-option.selected')?.dataset.color;
            
            if (name && selectedColor) {
                this.createNewList(name, selectedColor);
                newListModal.classList.remove('active');
                listNameInput.value = '';
                colorOptions.forEach(option => option.classList.remove('selected'));
            }
        });

        // 已完成任务
        const completedBtn = document.getElementById('completedBtn');
        completedBtn.addEventListener('click', () => {
            this.currentList = this.currentList === 'completed' ? 'all' : 'completed';
            this.renderTasks();
        });
    }

    showStatusMessage(message) {
        const statusElement = document.createElement('div');
        statusElement.className = 'status-message';
        statusElement.textContent = message;
        document.body.appendChild(statusElement);

        setTimeout(() => {
            statusElement.classList.add('show');
        }, 100);

        setTimeout(() => {
            statusElement.classList.remove('show');
            setTimeout(() => {
                statusElement.remove();
            }, 300);
        }, 3000);
    }

    getLists() {
        // 返回默认列表和自定义列表
        return [
            { id: 'default', name: '待办', color: '#4CAF50' },
            ...this.lists
        ];
    }
}

// 列表管理类
class ListManager {
    constructor() {
        this.lists = [];
        this.selectedColor = null;
    }

    async init() {
        await this.loadLists();
        this.initNewListModal();
        this.initDeleteListModal();
    }

    async loadLists() {
        try {
            const response = await fetch(`${API_BASE_URL}/lists`);
            this.lists = await response.json();
            return this.lists;
        } catch (error) {
            console.error('Error loading lists:', error);
            return [];
        }
    }

    async addList(name, color) {
        try {
            const listData = { name, color };
            const response = await fetch(`${API_BASE_URL}/lists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(listData)
            });
            const newList = await response.json();
            this.lists.push(newList);
            this.renderLists();
            return newList;
        } catch (error) {
            console.error('Error adding list:', error);
            throw error;
        }
    }

    async deleteList(listId) {
        try {
            await fetch(`${API_BASE_URL}/lists/${listId}`, {
                method: 'DELETE'
            });
            this.lists = this.lists.filter(l => l._id !== listId);
            this.renderLists();
        } catch (error) {
            console.error('Error deleting list:', error);
            throw error;
        }
    }

    renderLists() {
        const customListsContainer = document.querySelector('.custom-lists');
        customListsContainer.innerHTML = '';
        
        // 不再渲染导航栏中的自定义列表，但保留列表管理功能
        // 如果当前选中的是自定义列表，切换到默认列表
        if (this.lists.some(list => list.id === TaskManager.currentList)) {
            TaskManager.currentList = 'default';
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            const defaultItem = document.querySelector('.nav-item[data-list="default"]');
            if (defaultItem) {
                defaultItem.classList.add('active');
            }
            TaskManager.renderTasks();
        }
    }

    selectList(listId) {
        TaskManager.currentList = listId;
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const listItem = document.querySelector(`.nav-item[data-list-id="${listId}"]`);
        if (listItem) {
            listItem.classList.add('active');
        }
        TaskManager.renderTasks();
    }

    initNewListModal() {
        const newListModal = document.getElementById('newListModal');
        const newListBtn = document.getElementById('newListBtn');
        const cancelNewList = document.getElementById('cancelNewList');
        const confirmNewList = document.getElementById('confirmNewList');
        const listNameInput = document.getElementById('listNameInput');
        const colorOptions = document.querySelectorAll('.color-option');

        newListBtn.addEventListener('click', () => {
            newListModal.classList.add('active');
        });

        cancelNewList.addEventListener('click', () => {
            newListModal.classList.remove('active');
            listNameInput.value = '';
            colorOptions.forEach(option => option.classList.remove('selected'));
        });

        colorOptions.forEach(option => {
            option.style.backgroundColor = option.dataset.color;
            option.addEventListener('click', () => {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        confirmNewList.addEventListener('click', () => {
            const name = listNameInput.value.trim();
            const selectedColor = document.querySelector('.color-option.selected')?.dataset.color;
            
            if (name && selectedColor) {
                this.createNewList(name, selectedColor);
                newListModal.classList.remove('active');
                listNameInput.value = '';
                colorOptions.forEach(option => option.classList.remove('selected'));
            }
        });
    }

    initDeleteListModal() {
        const deleteListModal = document.getElementById('deleteListModal');
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');

        cancelDelete.addEventListener('click', () => this.hideDeleteConfirmation());
        confirmDelete.addEventListener('click', () => this.deleteList());
    }

    createNewList(name, color) {
        this.addList(name, color);
        this.saveLists();
        this.renderLists();
    }

    saveLists() {
        localStorage.setItem('customLists', JSON.stringify(this.lists));
    }

    hideDeleteConfirmation() {
        document.getElementById('deleteListModal').classList.remove('active');
        this.currentListToDelete = null;
    }

    deleteList() {
        if (this.currentListToDelete) {
            this.deleteList(this.currentListToDelete.id);
            this.hideDeleteConfirmation();
            TaskManager.renderTasks();
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 创建实例
    window.taskManager = new TaskManager();
    window.listManager = new ListManager();
    
    // 初始化
    window.taskManager.init();
    window.listManager.init();
}); 