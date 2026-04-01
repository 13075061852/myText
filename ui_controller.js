import { getState, subscribe, setState, addToCompare, removeFromCompare, clearCompareItems } from './state_manager.js';
import { processActiveSheet } from './excel_service.js';
import {
    getCompareItemKey
} from './data_utils.js';
import { createTableController } from './table.js';
import { createCompareDialogController } from './compare-dialog.js';
import { createSidebarController } from './sidebar.js';

const elements = {
    sheetList: document.getElementById('sheet-list'),
    table: document.getElementById('data-table'),
    thead: document.querySelector('#data-table thead'),
    tbody: document.querySelector('#data-table tbody'),
    emptyState: document.getElementById('empty-state'),
    paginationInfo: document.getElementById('pagination-info'),
    pageIndicator: document.getElementById('page-indicator'),
    prevBtn: document.getElementById('prev-page'),
    nextBtn: document.getElementById('next-page'),
    fileName: document.getElementById('file-name-display'),
    resetBtn: document.getElementById('reset-btn'),
    container: document.getElementById('table-container'),
    searchInput: document.getElementById('search-input'),
    mobileTopTitle: document.getElementById('mobile-top-title'),
    mobileActiveSheet: document.getElementById('mobile-active-sheet'),
    mobileResultCount: document.getElementById('mobile-result-count'),
    mobileCompareTotal: document.getElementById('mobile-compare-total'),
    mobileSearchMode: document.getElementById('mobile-search-mode'),
    mobileSelectionBar: document.getElementById('mobile-selection-bar'),
    mobileSelectionSummary: document.getElementById('mobile-selection-summary'),
    mobileFooterSelectionCount: document.getElementById('mobile-footer-selection-count'),
    mobileSelectAllBtn: document.getElementById('mobile-select-all-btn'),
    mobileOpenCompareBtn: document.getElementById('mobile-open-compare-btn'),
    mobileToggleModeBtn: document.getElementById('mobile-toggle-mode-btn'),
    mobileClearSelectionBtn: document.getElementById('mobile-clear-selection-btn'),
    // 对比项显示元素
    compareItemsContainer: document.getElementById('compare-items-container'),
    compareItemsPlaceholder: document.getElementById('compare-items-placeholder'),
    compareCount: document.getElementById('compare-count')
};

const closeMobileSidebar = () => {
    if (window.innerWidth >= 1024) return;

    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    if (sidebar && sidebarBackdrop) {
        sidebar.classList.add('-translate-x-full');
        sidebarBackdrop.classList.add('hidden');
    }
};

export const initUI = () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const actionsMenuToggle = document.getElementById('actions-menu-toggle');
    const actionsMenu = document.getElementById('actions-menu');
    const actionsDrawerBackdrop = document.getElementById('actions-drawer-backdrop');
    const fileInput = document.getElementById('file-upload');
    const tableController = createTableController({
        elements,
        getState,
        addToCompare,
        removeFromCompare
    });

    const toggleSidebar = () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarBackdrop.classList.toggle('hidden');
    };

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', toggleSidebar);
    }

    // 移动端侧边栏滑动手势支持
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    // 从左侧边缘滑动打开侧边栏
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    const handleSwipe = () => {
        const swipeDistance = touchEndX - touchStartX;
        const sidebar = document.getElementById('sidebar');
        const isSidebarOpen = !sidebar.classList.contains('-translate-x-full');
        const isActionsDrawerOpen = actionsMenu && !actionsMenu.classList.contains('hidden');

        // 从左侧边缘向右滑动打开侧边栏（只在侧边栏关闭时）
        if (swipeDistance > minSwipeDistance && touchStartX < 30 && !isSidebarOpen) {
            sidebar.classList.remove('-translate-x-full');
            sidebarBackdrop.classList.remove('hidden');
        }

        // 从侧边栏内向左滑动关闭侧边栏
        if (swipeDistance < -minSwipeDistance && isSidebarOpen) {
            sidebar.classList.add('-translate-x-full');
            sidebarBackdrop.classList.add('hidden');
        }

        if (swipeDistance < -minSwipeDistance && touchStartX > window.innerWidth - 30 && !isActionsDrawerOpen) {
            openActionsDrawer();
        }

        if (swipeDistance > minSwipeDistance && isActionsDrawerOpen) {
            closeActionsDrawer();
        }
    };

    const openActionsDrawer = () => {
        if (!actionsMenu || !actionsDrawerBackdrop) return;

        actionsDrawerBackdrop.classList.remove('hidden');
        actionsMenu.classList.remove('hidden');

        requestAnimationFrame(() => {
            actionsDrawerBackdrop.classList.add('is-open');
            actionsMenu.classList.add('is-open');
        });
    };

    const closeActionsDrawer = () => {
        if (!actionsMenu || !actionsDrawerBackdrop || actionsMenu.classList.contains('hidden')) return;

        actionsDrawerBackdrop.classList.remove('is-open');
        actionsMenu.classList.remove('is-open');

        window.setTimeout(() => {
            if (!actionsMenu.classList.contains('is-open')) {
                actionsDrawerBackdrop.classList.add('hidden');
                actionsMenu.classList.add('hidden');
            }
        }, 280);
    };

    // Mobile actions drawer logic

    if (actionsMenuToggle && actionsMenu) {
        const actions = [
            { id: 'select-all-btn', icon: 'check-square', label: '全选' },
            { id: 'clear-selection-btn', icon: 'square', label: '清空' },
            { id: 'compare-toggle', icon: 'bar-chart-3', label: '对比' },
            { id: 'export-json', icon: 'download', label: '导出JSON' }
        ];

        const actionsHTML = `
            <div class="quick-actions-grid">
                ${actions.map(action => `
                    <button data-action-id="${action.id}" class="quick-action-tile text-sm text-foreground">
                        <i data-lucide="${action.icon}" class="w-4 h-4 text-muted-foreground"></i>
                        <span>${action.label}</span>
                    </button>
                `).join('')}
            </div>
        `;

        actionsMenu.innerHTML = `
            <div class="flex h-full flex-col">
                <div class="drawer-body">
                    <section class="drawer-section">
                        <div class="drawer-section__header">
                            <div class="drawer-section__title">快捷操作</div>
                        </div>
                        ${actionsHTML}
                    </section>
                    <section class="drawer-section">
                        <div class="drawer-section__header">
                            <div class="drawer-section__title">显示设置</div>
                        </div>
                        <div class="drawer-mode-card">
                            <div class="drawer-mode-card__label">表格显示方式</div>
                            <div class="drawer-segmented-control">
                                <span class="drawer-segmented-control__slider" aria-hidden="true"></span>
                                <button id="mode-average-mobile" class="drawer-segmented-control__item transition-colors">平均值</button>
                                <button id="mode-all-mobile" class="drawer-segmented-control__item transition-colors">参数</button>
                            </div>
                        </div>
                    </section>
                    <section class="drawer-section">
                        <div class="drawer-section__header">
                            <div class="drawer-section__title">表格冻结</div>
                        </div>
                        <div class="drawer-settings-card">
                            <label for="freeze-row-mobile" class="drawer-setting-row">
                                <span class="drawer-setting-row__text">
                                    <span class="drawer-setting-row__title">冻结行</span>
                                    <span class="drawer-setting-row__desc">表头保持在顶部</span>
                                </span>
                                <span class="drawer-setting-row__control">
                                    <i data-lucide="snowflake" class="w-4 h-4"></i>
                                    <input type="number" id="freeze-row-mobile" min="0" max="10" class="drawer-number-input">
                                </span>
                            </label>
                            <label for="freeze-col-mobile" class="drawer-setting-row">
                                <span class="drawer-setting-row__text">
                                    <span class="drawer-setting-row__title">冻结列</span>
                                    <span class="drawer-setting-row__desc">左侧关键列始终可见</span>
                                </span>
                                <span class="drawer-setting-row__control">
                                    <i data-lucide="snowflake" class="w-4 h-4"></i>
                                    <input type="number" id="freeze-col-mobile" min="0" max="5" class="drawer-number-input">
                                </span>
                            </label>
                        </div>
                    </section>
                </div>
            </div>
        `;

        actionsMenu.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.id === 'actions-drawer-close') {
                closeActionsDrawer();
                return;
            }

            // Handle main actions with data-action-id
            if (button.dataset.actionId) {
                const originalButton = document.getElementById(button.dataset.actionId);
                if (originalButton) {
                    originalButton.click();
                }
                closeActionsDrawer();
                return;
            }

            // Handle display mode buttons
            if (e.target.id === 'mode-average-mobile') {
                setState({ config: { ...getState().config, displayMode: 'average' } });
                closeActionsDrawer();
            }
            if (e.target.id === 'mode-all-mobile') {
                setState({ config: { ...getState().config, displayMode: 'all' } });
                closeActionsDrawer();
            }
        });

        actionsMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (actionsMenu.classList.contains('hidden')) {
                openActionsDrawer();
            } else {
                closeActionsDrawer();
            }
        });

        if (actionsDrawerBackdrop) {
            actionsDrawerBackdrop.addEventListener('click', closeActionsDrawer);
        }

        // Close drawer when clicking outside
        window.addEventListener('click', (e) => {
            if (!actionsMenu.classList.contains('hidden') && !actionsMenu.contains(e.target) && !actionsMenuToggle.contains(e.target)) {
                closeActionsDrawer();
            }
        });
    }
    lucide.createIcons();
    
    const searchModeBtn = document.getElementById('search-mode-btn');
    

    
    // 注意：对比按钮已在HTML中定义，不需要再动态创建
    
    // 绑定事件
    searchModeBtn.addEventListener('click', toggleSearchMode);

    if (elements.mobileSelectAllBtn) {
        elements.mobileSelectAllBtn.addEventListener('click', () => {
            selectAllFilteredItems();
        });
    }

    if (elements.mobileOpenCompareBtn) {
        elements.mobileOpenCompareBtn.addEventListener('click', () => {
            compareDialogController.showCompareDialog();
        });
    }

    if (elements.mobileToggleModeBtn) {
        elements.mobileToggleModeBtn.addEventListener('click', () => {
            const { config } = getState();
            const nextMode = config.displayMode === 'average' ? 'all' : 'average';
            setState({ config: { ...config, displayMode: nextMode } });
        });
    }

    if (elements.mobileClearSelectionBtn) {
        elements.mobileClearSelectionBtn.addEventListener('click', () => {
            clearAllSelections();
        });
    }
    
    document.getElementById('mode-average').addEventListener('click', () => {
        setState({ config: { ...getState().config, displayMode: 'average' } });
    });
    
    document.getElementById('mode-all').addEventListener('click', () => {
        setState({ config: { ...getState().config, displayMode: 'all' } });
    });
    
    // 绑定数据对比功能事件（使用HTML中定义的按钮）
    document.getElementById('compare-toggle').addEventListener('click', () => {
        compareDialogController.showCompareDialog();
    });
    
    // 绑定一键操作按钮事件
    document.getElementById('select-all-btn').addEventListener('click', () => {
        selectAllFilteredItems();
    });
    
    document.getElementById('clear-selection-btn').addEventListener('click', () => {
        clearAllSelections();
    });
    
    let previousConfig = { ...getState().config };

    const renderPrimaryView = () => {
        tableController.renderTable();
        tableController.updatePaginationControls();
        updateModeButtons();
        updateSearchModeButton();
        updateMobileOverview();
    };

    const sidebarController = createSidebarController({
        elements,
        getState,
        setState,
        removeFromCompare,
        closeMobileSidebar,
        onOverviewChange: updateMobileOverview
    });

    const compareDialogController = createCompareDialogController({
        getState,
        showToast
    });

    subscribe((event, payload, state) => {
        if (event === 'state:reset') renderReset();
        if (event === 'sheetNames:updated') sidebarController.renderSidebar(state.sheetNames, state.activeSheetName);
        if (event === 'activeSheetName:updated') {
            processActiveSheet();
            sidebarController.renderSidebar(state.sheetNames, state.activeSheetName);
        }
        if (event === 'config:updated') {
            const changedConfigKeys = Object.keys(state.config).filter(
                (key) => state.config[key] !== previousConfig[key]
            );
            previousConfig = { ...state.config };

            const isSearchOnlyUpdate = changedConfigKeys.length > 0 &&
                changedConfigKeys.every((key) => key === 'searchQuery' || key === 'isPreciseSearch');

            if (isSearchOnlyUpdate) {
                updateSearchModeButton();
                updateMobileOverview();
            } else {
                renderPrimaryView();
            }

            sidebarController.renderSidebar(state.sheetNames, state.activeSheetName);
        }
        if (event === 'processedData:updated' || event === 'pagination:updated') {
            renderPrimaryView();
            sidebarController.renderSidebar(state.sheetNames, state.activeSheetName);
        }
        if (event === 'file:updated') {
            elements.fileName.textContent = state.file.name;
            elements.resetBtn.classList.remove('hidden');
            elements.emptyState.classList.add('hidden');
            elements.table.classList.remove('hidden');
        }
        if (event === 'originalMergedData:updated') {
            sidebarController.renderSidebar(state.sheetNames, state.activeSheetName);
        }
        if (event === 'compareItems:updated') {
            tableController.renderTable();
            sidebarController.renderCompareItems();
            sidebarController.renderSidebar(state.sheetNames, state.activeSheetName);
            if (!document.getElementById('compare-dialog').classList.contains('hidden')) {
                compareDialogController.renderCompareDialogContent();
            }
        }
    });
    
    // Freeze controls synchronization
    const freezeRowInput = document.getElementById('freeze-row');
    const freezeColInput = document.getElementById('freeze-col');
    const freezeRowMobileInput = document.getElementById('freeze-row-mobile');
    const freezeColMobileInput = document.getElementById('freeze-col-mobile');

    const syncFreezeValues = () => {
        const { config } = getState();
        freezeRowInput.value = config.freezeRow;
        freezeColInput.value = config.freezeCol;
        freezeRowMobileInput.value = config.freezeRow;
        freezeColMobileInput.value = config.freezeCol;
    };

    const updateFreezeState = (key, value) => {
        setState({ config: { ...getState().config, [key]: value } });
        syncFreezeValues();
    };

    freezeRowInput.addEventListener('change', (e) => updateFreezeState('freezeRow', parseInt(e.target.value) || 0));
    freezeColInput.addEventListener('change', (e) => updateFreezeState('freezeCol', parseInt(e.target.value) || 0));
    freezeRowMobileInput.addEventListener('change', (e) => updateFreezeState('freezeRow', parseInt(e.target.value) || 0));
    freezeColMobileInput.addEventListener('change', (e) => updateFreezeState('freezeCol', parseInt(e.target.value) || 0));

    // Initial sync
    syncFreezeValues();
    
    // 初始化显示模式按钮状态
    updateModeButtons();
    
    // 初始化搜索模式按钮状态
    updateSearchModeButton();
    updateMobileOverview();
    
    // 初始化Lucide图标
    lucide.createIcons();
};

const toggleSearchMode = () => {
    const { config } = getState();
    const newIsPreciseSearch = !config.isPreciseSearch;
    
    setState({ 
        config: { 
            ...config, 
            isPreciseSearch: newIsPreciseSearch
        } 
    });
    
    // 如果有搜索词，则重新处理数据
    if (config.searchQuery) {
        processActiveSheet();
    }
};

const updateSearchModeButton = () => {
    const { isPreciseSearch } = getState().config;
    const searchModeBtn = document.getElementById('search-mode-btn');
    
    if (isPreciseSearch) {
        searchModeBtn.innerHTML = '<i data-lucide="target" class="w-4 h-4 mr-1"></i>精准查询';
    } else {
        searchModeBtn.innerHTML = '<i data-lucide="search" class="w-4 h-4 mr-1"></i>模糊查询';
    }
    
    lucide.createIcons();
};

const updateMobileOverview = () => {
    const { activeSheetName, processedData, compareItems, config, file } = getState();
    const currentSheetLabel = activeSheetName || (file ? '请选择工作表' : '未选择数据');
    const resultCount = String(processedData.length || 0);
    const compareCount = String(compareItems.length || 0);
    const searchModeLabel = config.isPreciseSearch ? '精确' : '模糊';

    if (elements.mobileActiveSheet) {
        elements.mobileActiveSheet.textContent = currentSheetLabel;
    }

    if (elements.mobileTopTitle) {
        elements.mobileTopTitle.textContent = currentSheetLabel;
    }

    if (elements.mobileResultCount) {
        elements.mobileResultCount.textContent = resultCount;
    }

    if (elements.mobileCompareTotal) {
        elements.mobileCompareTotal.textContent = compareCount;
    }

    if (elements.mobileSearchMode) {
        elements.mobileSearchMode.textContent = searchModeLabel;
    }

    if (elements.mobileSelectionSummary) {
        elements.mobileSelectionSummary.textContent = `已选 ${compareItems.length} 项`;
    }

    if (elements.mobileFooterSelectionCount) {
        elements.mobileFooterSelectionCount.textContent = `已选 ${compareItems.length} 项`;
    }

    if (elements.mobileSelectionBar) {
        const shouldShowBar = Boolean(file) || processedData.length > 0 || compareItems.length > 0;
        elements.mobileSelectionBar.classList.toggle('hidden', !shouldShowBar);
    }
};

const updateModeButtons = () => {
    const { displayMode } = getState().config;
    const activeClass = 'relative z-10 rounded-xl border border-transparent bg-transparent text-primary-foreground';
    const inactiveClass = 'relative z-10 rounded-xl border border-transparent bg-transparent text-foreground/78 hover:text-foreground';

    // Desktop buttons
    const modeAverageDesktop = document.getElementById('mode-average');
    const modeAllDesktop = document.getElementById('mode-all');
    if(modeAverageDesktop && modeAllDesktop) {
        modeAverageDesktop.className = `px-2 py-1 transition-colors ${displayMode === 'average' ? activeClass : inactiveClass}`;
        modeAllDesktop.className = `px-2 py-1 transition-colors ${displayMode === 'all' ? activeClass : inactiveClass}`;
        const desktopGroup = modeAverageDesktop.parentElement;
        if (desktopGroup) {
            desktopGroup.dataset.activeMode = displayMode;
        }
    }

    // Mobile buttons
    const modeAverageMobile = document.getElementById('mode-average-mobile');
    const modeAllMobile = document.getElementById('mode-all-mobile');
    if(modeAverageMobile && modeAllMobile) {
        modeAverageMobile.className = `drawer-segmented-control__item transition-colors ${displayMode === 'average' ? activeClass : inactiveClass}`;
        modeAllMobile.className = `drawer-segmented-control__item transition-colors ${displayMode === 'all' ? activeClass : inactiveClass}`;
        const mobileGroup = modeAverageMobile.parentElement;
        if (mobileGroup) {
            mobileGroup.dataset.activeMode = displayMode;
        }
    }

    const mobileToggleModeBtn = elements.mobileToggleModeBtn;
    if (mobileToggleModeBtn) {
        const isAverage = displayMode === 'average';
        mobileToggleModeBtn.querySelector('span').textContent = isAverage ? '平均值' : '参数';
        const icon = mobileToggleModeBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isAverage ? 'toggle-right' : 'toggle-left');
        }
        mobileToggleModeBtn.classList.toggle('mobile-selection-btn--primary', !isAverage);
    }

    lucide.createIcons();
};

const renderReset = () => {
    elements.sheetList.innerHTML = '<div class="text-xs text-muted-foreground text-center mt-10">暂无数据<br>请上传文件</div>';
    elements.thead.innerHTML = '';
    elements.tbody.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    elements.table.classList.add('hidden');
    elements.fileName.textContent = '未选择文件';
    elements.resetBtn.classList.add('hidden');
    elements.paginationInfo.textContent = '显示 0 - 0 条，共 0 条';
    elements.pageIndicator.textContent = '1 / 1';
    if (elements.compareItemsContainer && elements.compareItemsPlaceholder) {
        elements.compareItemsContainer.innerHTML = '';
        elements.compareItemsContainer.appendChild(elements.compareItemsPlaceholder);
        elements.compareItemsPlaceholder.style.display = 'block';
    }
    if (elements.compareCount) {
        elements.compareCount.textContent = '0';
    }
    
    // 重置侧边栏
    elements.sheetList.innerHTML = '<div class="text-xs text-muted-foreground text-center mt-10">暂无数据<br>请上传文件</div>';
    
    // 重置冻结行和冻结列的值
    document.getElementById('freeze-row').value = 1;
    document.getElementById('freeze-col').value = 2;
    
    // 重置搜索模式按钮
    updateSearchModeButton();
    updateMobileOverview();
};


// 一键选择所有筛选结果
const selectAllFilteredItems = () => {
    const { processedData, compareItems } = getState();
    
    // 获取当前未被选择的项目
    const existingCompareKeys = new Set(compareItems.map(getCompareItemKey));
    const unselectedItems = processedData.filter(item =>
        !existingCompareKeys.has(getCompareItemKey(item))
    );
    
    if (unselectedItems.length === 0) {
        showToast('当前没有可添加的项目');
        return;
    }
    
    // 批量添加所有未被选择的项目到对比项中
    const newCompareItems = [...compareItems, ...unselectedItems];
    setState({ compareItems: newCompareItems });
    
    showToast(`已添加 ${unselectedItems.length} 个项目到对比项`);
};

// 一键清空所有选择
const clearAllSelections = () => {
    const { compareItems } = getState();
    
    if (compareItems.length === 0) {
        showToast('当前没有选中的项目');
        return;
    }
    
    // 保存当前对比项的数量用于提示
    const count = compareItems.length;
    
    // 清空所有对比项
    clearCompareItems();
    showToast(`已清空 ${count} 个对比项`);
};

export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const existingToast = container.querySelector(`.toast[data-message="${CSS.escape(message)}"][data-type="${CSS.escape(type)}"]:not(.exiting)`);

    if (existingToast) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${type === 'error' ? 'bg-destructive text-white border-destructive' : 'bg-foreground text-background border-border'}`;
    toast.dataset.message = message;
    toast.dataset.type = type;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('exiting');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
};
