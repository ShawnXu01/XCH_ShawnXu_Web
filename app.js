// 主题管理
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        // 监听用户系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            this.setTheme(e.matches ? 'dark' : 'light');
        });
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
};

// 时间显示管理
const TimeManager = {
    init() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    },

    updateDateTime() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        document.getElementById('datetime').textContent = now.toLocaleString('zh-CN', options);
    }
};

// 天气管理
const WeatherManager = {
    API_KEY: '05d15c56dc34403e876c4c326cf72ada',
    defaultCity: {
        id: '101210101',
        name: '杭州'
    },
    cityId: localStorage.getItem('cityId') || '101210101', // 默认杭州

    async init() {
        try {
            // 尝试获取地理位置
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        // 成功获取位置后，查询最近的城市
                        const locationSuccess = await this.searchCityByLocation(position.coords.latitude, position.coords.longitude);
                        if (!locationSuccess) {
                            // 如果根据位置获取城市失败，使用默认城市
                            this.resetToDefaultCity();
                        }
                    },
                    (error) => {
                        console.error('获取位置失败:', error);
                        // 如果获取位置失败，使用默认城市
                        this.resetToDefaultCity();
                    }
                );
            } else {
                // 如果不支持地理定位，使用默认城市
                this.resetToDefaultCity();
            }
        } catch (error) {
            console.error('获取天气信息失败:', error);
            this.setDefaultWeather();
        }

        // 每15分钟更新一次天气
        setInterval(() => this.init(), 15 * 60 * 1000);
    },

    resetToDefaultCity() {
        localStorage.setItem('cityName', this.defaultCity.name);
        localStorage.setItem('cityId', this.defaultCity.id);
        this.updateWeatherById(this.defaultCity.id);
    },

    async searchCityByLocation(latitude, longitude) {
        try {
            const response = await fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${longitude},${latitude}&key=${this.API_KEY}`);
            const data = await response.json();
            
            if (data.code === '200' && data.location && data.location.length > 0) {
                const city = data.location[0];
                localStorage.setItem('cityName', city.name);
                localStorage.setItem('cityId', city.id);
                await this.updateWeatherById(city.id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('根据位置搜索城市失败:', error);
            return false;
        }
    },

    async updateWeatherById(cityId) {
        try {
            // 获取实时天气
            const weatherResponse = await fetch(`https://devapi.qweather.com/v7/weather/now?location=${cityId}&key=${this.API_KEY}`);
            const weatherData = await weatherResponse.json();

            // 获取当天预报（最高温和最低温）
            const forecastResponse = await fetch(`https://devapi.qweather.com/v7/weather/3d?location=${cityId}&key=${this.API_KEY}`);
            const forecastData = await forecastResponse.json();

            if (weatherData.code === '200' && forecastData.code === '200') {
                const weatherElement = document.getElementById('weather');
                const cityElem = weatherElement.querySelector('.city');
                const tempElem = weatherElement.querySelector('.temp');
                const tempRangeElem = weatherElement.querySelector('.temp-range');
                const conditionElem = weatherElement.querySelector('.condition');
                const iconElement = weatherElement.querySelector('.weather-icon i');

                // 更新城市名（从localStorage获取，如果没有则显示默认值）
                cityElem.textContent = localStorage.getItem('cityName') || '杭州';
                
                // 更新当前温度
                tempElem.textContent = `${Math.round(weatherData.now.temp)}°C`;
                
                // 更新温度范围
                const todayForecast = forecastData.daily[0];
                tempRangeElem.textContent = `↑${todayForecast.tempMax}°C ↓${todayForecast.tempMin}°C`;
                
                // 更新天气状况
                conditionElem.textContent = weatherData.now.text;
                
                // 更新天气图标
                iconElement.className = 'fas';
                iconElement.classList.add(this.getWeatherIconClass(weatherData.now.icon));

                // 保存城市ID
                this.cityId = cityId;
                localStorage.setItem('cityId', cityId);
            } else {
                throw new Error('天气数据获取失败');
            }
        } catch (error) {
            console.error('获取天气数据失败:', error);
            this.setDefaultWeather();
        }
    },

    async searchCity(keyword) {
        try {
            const response = await fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(keyword)}&key=${this.API_KEY}`);
            const data = await response.json();
            
            if (data.code === '200' && data.location && data.location.length > 0) {
                const city = data.location[0];
                localStorage.setItem('cityName', city.name);
                await this.updateWeatherById(city.id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('搜索城市失败:', error);
            return false;
        }
    },

    setDefaultWeather() {
        const weatherElement = document.getElementById('weather');
        weatherElement.querySelector('.city').textContent = '未知';
        weatherElement.querySelector('.temp').textContent = '--°C';
        weatherElement.querySelector('.temp-range').textContent = '↑--°C ↓--°C';
        weatherElement.querySelector('.condition').textContent = '获取失败';
        weatherElement.querySelector('.weather-icon i').className = 'fas fa-question';
    },

    getWeatherIconClass(iconCode) {
        // 和风天气图标代码映射到Font Awesome图标
        const iconMap = {
            '100': 'fa-sun',           // 晴
            '101': 'fa-cloud-sun',     // 多云
            '102': 'fa-cloud-sun',     // 少云
            '103': 'fa-cloud',         // 晴间多云
            '104': 'fa-cloud',         // 阴
            '150': 'fa-moon',          // 晴（夜间）
            '151': 'fa-cloud-moon',    // 多云（夜间）
            '152': 'fa-cloud-moon',    // 少云（夜间）
            '153': 'fa-cloud-moon',    // 晴间多云（夜间）
            '300': 'fa-cloud-rain',    // 阵雨
            '301': 'fa-cloud-showers-heavy', // 强阵雨
            '302': 'fa-bolt',          // 雷阵雨
            '303': 'fa-bolt',          // 强雷阵雨
            '304': 'fa-cloud-meatball',// 雷阵雨伴有冰雹
            '305': 'fa-cloud-rain',    // 小雨
            '306': 'fa-cloud-rain',    // 中雨
            '307': 'fa-cloud-showers-heavy', // 大雨
            '308': 'fa-cloud-showers-heavy', // 极端降雨
            '309': 'fa-cloud-rain',    // 毛毛雨
            '310': 'fa-cloud-rain',    // 暴雨
            '311': 'fa-cloud-showers-heavy', // 大暴雨
            '312': 'fa-cloud-showers-heavy', // 特大暴雨
            '313': 'fa-cloud-rain',    // 冻雨
            '314': 'fa-cloud-rain',    // 小到中雨
            '315': 'fa-cloud-showers-heavy', // 中到大雨
            '316': 'fa-cloud-showers-heavy', // 大到暴雨
            '317': 'fa-cloud-showers-heavy', // 暴雨到大暴雨
            '318': 'fa-cloud-showers-heavy', // 大暴雨到特大暴雨
            '399': 'fa-cloud-rain',    // 雨
            '400': 'fa-snowflake',     // 小雪
            '401': 'fa-snowflake',     // 中雪
            '402': 'fa-snowflake',     // 大雪
            '403': 'fa-snowflake',     // 暴雪
            '404': 'fa-cloud-rain',    // 雨夹雪
            '405': 'fa-snowflake',     // 雨雪天气
            '406': 'fa-snowflake',     // 阵雨夹雪
            '407': 'fa-snowflake',     // 阵雪
            '408': 'fa-snowflake',     // 小到中雪
            '409': 'fa-snowflake',     // 中到大雪
            '410': 'fa-snowflake',     // 大到暴雪
            '499': 'fa-snowflake',     // 雪
            '500': 'fa-smog',          // 薄雾
            '501': 'fa-smog',          // 雾
            '502': 'fa-smog',          // 霾
            '503': 'fa-smog',          // 扬沙
            '504': 'fa-smog',          // 浮尘
            '507': 'fa-smog',          // 沙尘暴
            '508': 'fa-smog',          // 强沙尘暴
            '509': 'fa-smog',          // 浓雾
            '510': 'fa-smog',          // 强浓雾
            '511': 'fa-smog',          // 中度霾
            '512': 'fa-smog',          // 重度霾
            '513': 'fa-smog',          // 严重霾
            '514': 'fa-smog',          // 大雾
            '515': 'fa-smog',          // 特强浓雾
            '900': 'fa-temperature-high', // 热
            '901': 'fa-temperature-low',  // 冷
            '999': 'fa-question'       // 未知
        };
        
        return iconMap[iconCode] || 'fa-question';
    }
};

// API配置
const API_BASE_URL = 'http://10.106.208.46/api';

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

    async updateTask(taskId, updates) {
        try {
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
            return updatedTask;
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
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    getTasks() {
        return this.tasks;
    }

    getCompletedTasks() {
        return this.tasks.filter(task => task.completed);
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

    renderTasks() {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        // 获取当前列表信息
        let currentListInfo;
        if (this.currentList === 'all') {
            // 如果是"全部"视图，显示所有列表
            const allLists = [
                { id: 'default', name: 'To Do', color: '#0078D4', icon: 'bi-list-ul' },
                ...listManager.lists.map(list => ({...list, icon: 'bi-list-ul'}))
            ];
            allLists.forEach(list => this.renderListTasks(list, taskList));
        } else if (this.currentList === 'completed') {
            // 已完成列表
            currentListInfo = { id: 'completed', name: '已完成', color: '#28a745', icon: 'bi-check-circle-fill' };
            this.renderCompletedTasks(taskList);
        } else if (this.currentList === 'default') {
            // 默认列表
            currentListInfo = { id: 'default', name: 'To Do', color: '#0078D4', icon: 'bi-list-ul' };
            this.renderListTasks(currentListInfo, taskList);
        }
    }

    renderCompletedTasks(container) {
        const completedTasks = this.tasks.filter(t => t.completed);
        
        // 创建已完成任务的容器
        const listContainer = document.createElement('div');
        listContainer.className = 'list-tasks-container';
        listContainer.setAttribute('data-list-id', 'completed');
        
        // 创建列表头部
        const listHeader = document.createElement('div');
        listHeader.className = 'list-header';
        listHeader.style.borderColor = '#28a745';
        listHeader.innerHTML = `
            <div class="list-title">
                <i class="bi bi-check-circle-fill" style="color: #28a745"></i>
                <h3>已完成</h3>
            </div>
        `;
        
        // 创建任务列表区域
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'list-tasks';
        
        if (completedTasks.length === 0) {
            tasksContainer.innerHTML = '<div class="empty-list">🌙</div>';
        } else {
            this.renderTaskList(completedTasks, tasksContainer);
        }
        
        listContainer.appendChild(listHeader);
        listContainer.appendChild(tasksContainer);
        container.appendChild(listContainer);
    }

    renderListTasks(list, container) {
        // 获取当前列表的任务并过滤未完成的任务
        let listTasks = this.tasks.filter(t => t.list === list.id && !t.completed);
        
        // 对任务进行排序
        listTasks.sort((a, b) => {
            // 1. 首先按重要程度排序（有星号的排在前面）
            if (a.important !== b.important) {
                return b.important - a.important;
            }
            
            // 2. 然后按截止日期排序
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            
            // 3. 如果只有一个任务有截止日期，有截止日期的排在前面
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            
            // 4. 如果都没有截止日期，保持原有顺序
            return 0;
        });
        
        // 创建列表容器
        const listContainer = document.createElement('div');
        listContainer.className = 'list-tasks-container';
        listContainer.setAttribute('data-list-id', list.id);
        
        // 创建列表头部
        const listHeader = document.createElement('div');
        listHeader.className = 'list-header';
        listHeader.style.borderColor = list.color;
        listHeader.innerHTML = `
            <div class="list-title">
                <i class="bi ${list.icon}" style="color: ${list.color}"></i>
                <h3>${list.name}</h3>
            </div>
            ${list.id !== 'default' ? '<button class="btn-delete-list"><i class="bi bi-trash"></i></button>' : ''}
        `;
        
        // 添加删除按钮事件监听
        const deleteBtn = listHeader.querySelector('.btn-delete-list');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.showDeleteListConfirmation(list);
            });
        }
        
        // 创建任务列表区域
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'list-tasks';
        
        if (listTasks.length === 0) {
            tasksContainer.innerHTML = '<div class="empty-list">🌙</div>';
        } else {
            this.renderTaskList(listTasks, tasksContainer);
        }
        
        listContainer.appendChild(listHeader);
        listContainer.appendChild(tasksContainer);
        container.appendChild(listContainer);
    }

    renderTaskList(tasks, container) {
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important' : ''}`;
            taskElement.setAttribute('data-task-id', task.id);
            
            // 格式化截止时间
            let dueDateText = '';
            if (task.dueDate) {
                const date = new Date(task.dueDate);
                dueDateText = `${date.getMonth() + 1}月${date.getDate()}日`;
            }
            
            taskElement.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <div class="task-actions">
                    ${dueDateText ? `<span class="due-date">${dueDateText}</span>` : ''}
                    <button class="btn-star ${task.important ? 'active' : ''}">
                        <i class="bi bi-star${task.important ? '-fill' : ''}"></i>
                    </button>
                    <button class="btn-delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;

            // 添加事件监听器
            taskElement.querySelector('input[type="checkbox"]').addEventListener('change', () => {
                this.toggleTaskComplete(task.id);
            });

            taskElement.querySelector('.btn-star').addEventListener('click', () => {
                this.toggleTaskImportant(task.id);
            });

            taskElement.querySelector('.btn-delete').addEventListener('click', () => {
                this.deleteTask(task.id);
            });

            taskElement.querySelector('.task-text').addEventListener('dblclick', (e) => {
                const span = e.target;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = task.text;
                input.className = 'task-edit-input';

                span.replaceWith(input);
                input.focus();

                input.addEventListener('blur', () => {
                    this.editTask(task.id, input.value);
                });

                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        input.blur();
                    }
                });
            });

            container.appendChild(taskElement);
        });
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.showStatusMessage(task.completed ? '任务已完成' : '任务已恢复');
        }
    }

    toggleTaskImportant(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.important = !task.important;
            this.saveTasks();
            this.renderTasks();
            this.showStatusMessage(task.important ? '已标记为重要' : '已取消重要标记');
        }
    }

    editTask(taskId, newText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.text = newText;
            this.saveTasks();
            this.renderTasks();
            this.showStatusMessage('任务已更新');
        }
    }

    filterTasks() {
        let filteredTasks = this.tasks;
        
        switch (this.currentList) {
            case 'completed':
                filteredTasks = this.tasks.filter(t => t.completed);
                break;
            case 'all':
                filteredTasks = this.tasks.filter(t => !t.completed);
                break;
            case 'default':
                filteredTasks = this.tasks.filter(t => t.list === 'default' && !t.completed);
                break;
            default:
                filteredTasks = this.tasks.filter(t => t.list === this.currentList && !t.completed);
                break;
        }

        return filteredTasks;
    }

    showStatusMessage(message) {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.classList.add('show');
        
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }

    showDeleteListConfirmation(list) {
        const modal = document.createElement('div');
        modal.className = 'modal delete-list-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>删除列表</h3>
                <p>确定要删除"${list.name}"列表吗？列表中的所有任务将被移动到"To Do"列表中。</p>
                <div class="modal-buttons">
                    <button class="btn-cancel">取消</button>
                    <button class="btn-confirm">确认删除</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加事件监听
        modal.querySelector('.btn-cancel').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.btn-confirm').addEventListener('click', () => {
            this.deleteList(list);
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    deleteList(list) {
        // 将列表中的所有任务移动到默认列表
        this.tasks.forEach(task => {
            if (task.list === list.id) {
                task.list = 'default';
            }
        });
        
        // 从自定义列表中删除
        listManager.lists = listManager.lists.filter(l => l.id !== list.id);
        
        // 保存更改
        this.saveTasks();
        listManager.saveLists();
        
        // 刷新显示
        this.renderTasks();
        
        // 关闭确认模态框
        document.querySelector('.delete-list-modal').remove();
        
        // 显示成功消息
        this.showStatusMessage('列表已删除');
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    createNewList(name, color) {
        // Implementation needed
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

    initNewListModal() {
        // Implementation needed
    }

    initDeleteListModal() {
        // Implementation needed
    }

    renderLists() {
        // Implementation needed
    }

    selectList(listId) {
        // Implementation needed
    }

    showDeleteConfirmation(list) {
        // Implementation needed
    }

    hideDeleteConfirmation() {
        // Implementation needed
    }

    deleteList() {
        // Implementation needed
    }

    saveLists() {
        localStorage.setItem('customLists', JSON.stringify(this.lists));
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