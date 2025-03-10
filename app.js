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

// 任务管理
const TaskManager = {
    tasks: [],
    currentList: 'all',
    selectedListForNewTask: null,

    init() {
        this.loadTasks();
        this.setupEventListeners();
        // 确保导航栏状态正确
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-list') === 'all') {
                item.classList.add('active');
            }
        });
        this.currentList = 'all';
        this.renderTasks();
    },

    loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        this.tasks = savedTasks ? JSON.parse(savedTasks) : [];
    },

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    },

    addTask(text) {
        const task = {
            id: Date.now(),
            text,
            completed: false,
            important: false,
            list: this.selectedListForNewTask || 'default',
            createdAt: new Date().toISOString()
        };
        this.tasks.push(task);
        this.saveTasks();
        
        // 如果在已完成列表视图中，则刷新整个任务列表
        if (this.currentList === 'completed') {
            this.renderTasks();
        } else {
            // 找到对应的列表容器
            const listContainer = document.querySelector(`.list-tasks-container[data-list-id="${task.list}"]`);
            if (listContainer) {
                const tasksContainer = listContainer.querySelector('.list-tasks');
                // 如果是空列表，清除空状态显示
                if (tasksContainer.querySelector('.empty-list')) {
                    tasksContainer.innerHTML = '';
                }
                // 创建并添加新任务元素
                this.renderTaskList([task], tasksContainer);
            } else {
                // 如果找不到对应的容器，刷新整个任务列表
                this.renderTasks();
            }
        }
        
        this.showStatusMessage('任务已添加');
    },

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.showStatusMessage(task.completed ? '任务已完成' : '任务已恢复');
        }
    },

    toggleTaskImportant(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.important = !task.important;
            this.saveTasks();
            this.renderTasks();
            this.showStatusMessage(task.important ? '已标记为重要' : '已取消重要标记');
        }
    },

    deleteTask(taskId) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            this.tasks.splice(index, 1);
            this.saveTasks();
            this.renderTasks();
            this.showStatusMessage('任务已删除');
        }
    },

    editTask(taskId, newText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.text = newText;
            this.saveTasks();
            this.renderTasks();
            this.showStatusMessage('任务已更新');
        }
    },

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
    },

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
        } else {
            // 自定义列表
            currentListInfo = listManager.lists.find(l => l.id === this.currentList);
            if (currentListInfo) {
                currentListInfo.icon = 'bi-list-ul';
                this.renderListTasks(currentListInfo, taskList);
            }
        }
    },

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
    },

    renderListTasks(list, container) {
        const listTasks = this.tasks.filter(t => t.list === list.id && !t.completed);
        
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
        `;
        
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
    },

    renderTaskList(tasks, container) {
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important' : ''}`;
            taskElement.setAttribute('data-task-id', task.id);
            taskElement.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <div class="task-actions">
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
    },

    setupEventListeners() {
        // 添加任务的输入框监听
        const taskInput = document.querySelector('.task-input input');
        const listSelectorPopup = document.querySelector('.list-selector-popup');
        const closeSelector = document.querySelector('.close-selector');

        taskInput.addEventListener('focus', () => {
            this.showListSelector();
        });

        closeSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideListSelector();
        });

        // 点击外部关闭列表选择器
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.task-input')) {
                this.hideListSelector();
            }
        });

        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && taskInput.value.trim()) {
                this.selectedListForNewTask = 'default';  // 设置为默认列表
                this.addTask(taskInput.value.trim());
                taskInput.value = '';
                this.hideListSelector();
                this.selectedListForNewTask = null;
            }
        });

        // 导航项点击监听
        document.querySelectorAll('.nav-item').forEach(item => {
            const listId = item.getAttribute('data-list');
            if (listId) {  // 只为有data-list属性的导航项添加点击事件
                item.addEventListener('click', () => {
                    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    this.currentList = listId;
                    this.renderTasks();
                });
            }
        });
    },

    showListSelector() {
        const listSelectorContent = document.querySelector('.list-selector-content');
        const popup = document.querySelector('.list-selector-popup');
        const taskInput = document.querySelector('.task-input input');
        
        // 清空现有内容
        listSelectorContent.innerHTML = '';
        
        // 添加默认列表选项
        const defaultOption = document.createElement('div');
        defaultOption.className = 'list-option';
        defaultOption.innerHTML = `
            <div class="list-icon" style="background-color: #0078D4"></div>
            <span class="list-name">To Do</span>
        `;
        
        defaultOption.addEventListener('click', (e) => {
            e.stopPropagation();
            if (taskInput.value.trim()) {
                this.selectedListForNewTask = 'default';
                this.addTask(taskInput.value.trim());
                taskInput.value = '';
                this.hideListSelector();
                this.selectedListForNewTask = null;
            }
        });
        
        listSelectorContent.appendChild(defaultOption);
        
        // 添加所有自定义列表
        listManager.lists.forEach(list => {
            const option = document.createElement('div');
            option.className = 'list-option';
            option.innerHTML = `
                <div class="list-icon" style="background-color: ${list.color}"></div>
                <span class="list-name">${list.name}</span>
            `;
            
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                if (taskInput.value.trim()) {
                    this.selectedListForNewTask = list.id;
                    this.addTask(taskInput.value.trim());
                    taskInput.value = '';
                    this.hideListSelector();
                    this.selectedListForNewTask = null;
                }
            });
            
            listSelectorContent.appendChild(option);
        });
        
        popup.classList.add('active');
    },

    hideListSelector() {
        const popup = document.querySelector('.list-selector-popup');
        popup.classList.remove('active');
    },

    showStatusMessage(message) {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.classList.add('show');
        
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }
};

// 列表管理
const listManager = {
    lists: [],
    selectedColor: null,

    init() {
        // 从localStorage加载列表
        const savedLists = localStorage.getItem('customLists');
        if (savedLists) {
            this.lists = JSON.parse(savedLists);
            this.renderLists();
        }

        // 初始化新建列表功能
        this.initNewListModal();
        
        // 初始化删除列表功能
        this.initDeleteListModal();
    },

    initNewListModal() {
        const newListBtn = document.querySelector('.btn-new-list');
        const modal = document.getElementById('newListModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelNewList');
        const form = document.getElementById('newListForm');
        const colorOptions = document.getElementById('colorOptions');

        // 打开模态框
        newListBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });

        // 关闭模态框
        const closeModal = () => {
            modal.classList.remove('active');
            form.reset();
            this.selectedColor = null;
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('selected');
            });
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // 颜色选择
        colorOptions.addEventListener('click', (e) => {
            const colorOption = e.target.closest('.color-option');
            if (!colorOption) return;

            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('selected');
            });
            colorOption.classList.add('selected');
            this.selectedColor = colorOption.dataset.color;
        });

        // 表单提交
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const listName = document.getElementById('listName').value.trim();
            
            if (!listName || !this.selectedColor) {
                alert('请输入列表名称并选择颜色！');
                return;
            }

            this.createNewList(listName, this.selectedColor);
            closeModal();
        });
    },

    initDeleteListModal() {
        const deleteListModal = document.getElementById('deleteListModal');
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');
        
        closeDeleteModal.addEventListener('click', () => this.hideDeleteConfirmation());
        cancelDelete.addEventListener('click', () => this.hideDeleteConfirmation());
        confirmDelete.addEventListener('click', () => this.deleteList());
    },

    createNewList(name, color) {
        const newList = {
            id: Date.now().toString(),
            name,
            color
        };

        this.lists.push(newList);
        this.saveLists();
        this.renderLists();
    },

    renderLists() {
        const customListsContainer = document.querySelector('.custom-lists');
        customListsContainer.innerHTML = '';
        
        this.lists.forEach(list => {
            const listItem = document.createElement('li');
            listItem.className = 'nav-item';
            listItem.setAttribute('data-list-id', list.id);
            if (TaskManager.currentList === list.id) {
                listItem.classList.add('active');
            }
            
            listItem.innerHTML = `
                <div class="list-content">
                    <i class="bi bi-list-ul" style="color: ${list.color}"></i>
                    <span>${list.name}</span>
                </div>
                <button class="btn-delete-list" data-list-id="${list.id}">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            
            // 为整个列表项添加点击事件
            listItem.addEventListener('click', (e) => {
                // 如果点击的是删除按钮，不触发列表选择
                if (!e.target.closest('.btn-delete-list')) {
                    this.selectList(list.id);
                }
            });
            
            // 为删除按钮添加点击事件
            listItem.querySelector('.btn-delete-list').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDeleteConfirmation(list);
            });
            
            customListsContainer.appendChild(listItem);
        });
    },

    selectList(listId) {
        TaskManager.currentList = listId;
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const listItem = document.querySelector(`.nav-item[data-list-id="${listId}"]`);
        if (listItem) {
            listItem.classList.add('active');
        }
        TaskManager.renderTasks();
    },

    showDeleteConfirmation(list) {
        this.currentListToDelete = list;
        document.getElementById('deleteListModal').classList.add('active');
    },

    hideDeleteConfirmation() {
        document.getElementById('deleteListModal').classList.remove('active');
        this.currentListToDelete = null;
    },

    deleteList() {
        if (!this.currentListToDelete) return;
        
        this.lists = this.lists.filter(list => list.id !== this.currentListToDelete.id);
        this.saveLists();
        
        // 如果删除的是当前选中的列表，切换到默认列表
        if (TaskManager.currentList === this.currentListToDelete.id) {
            TaskManager.currentList = 'default';
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('.nav-item:first-child').classList.add('active');
        }
        
        this.renderLists();
        this.hideDeleteConfirmation();
        TaskManager.renderTasks();
    },

    saveLists() {
        localStorage.setItem('customLists', JSON.stringify(this.lists));
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    TimeManager.init();
    WeatherManager.init();
    listManager.init();
    TaskManager.init();
}); 