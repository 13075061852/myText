import { getState, subscribe, setState, addToCompare, removeFromCompare, clearCompareItems } from '../core/state_manager.js';
import { processActiveSheet } from '../services/excel_service.js';
import { getCompareItemKey } from '../shared/data_utils.js';
import { swapTextWithSlide } from '../shared/animation_utils.js';
import { createTableController } from './table.js';
import { createCompareDialogController } from './compare-dialog.js';
import { createSidebarController } from './sidebar.js';
import { UI_TEXT } from './ui_strings.js';

const EMPTY_SHEET_LIST_HTML = `<div class="text-xs text-muted-foreground text-center mt-10">${UI_TEXT.common.emptySheetList}</div>`;
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
    mobileSelectionBar: document.getElementById('mobile-selection-bar'),
    mobileSelectionSummary: document.getElementById('mobile-selection-summary'),
    mobileFooterSelectionCount: document.getElementById('mobile-footer-selection-count'),
    mobileSelectAllBtn: document.getElementById('mobile-select-all-btn'),
    mobileOpenCompareBtn: document.getElementById('mobile-open-compare-btn'),
    mobileToggleModeBtn: document.getElementById('mobile-toggle-mode-btn'),
    mobileClearSelectionBtn: document.getElementById('mobile-clear-selection-btn'),
    compareSection: document.getElementById('compare-section'),
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

const setDisplayMode = (displayMode) => {
    setState({
        config: {
            ...getState().config,
            displayMode
        }
    });
};

export const initUI = () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
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

    // Enable swipe gestures for the mobile sidebar.
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    // Capture the initial touch point.
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

        // Open the sidebar when swiping in from the left edge.
        if (swipeDistance > minSwipeDistance && touchStartX < 30 && !isSidebarOpen) {
            sidebar.classList.remove('-translate-x-full');
            sidebarBackdrop.classList.remove('hidden');
        }

        // Close the sidebar when swiping left inside it.
        if (swipeDistance < -minSwipeDistance && isSidebarOpen) {
            sidebar.classList.add('-translate-x-full');
            sidebarBackdrop.classList.add('hidden');
        }
    };
    lucide.createIcons();
    
    const searchModeBtn = document.getElementById('search-mode-btn');
    if (searchModeBtn) {
        searchModeBtn.addEventListener('click', toggleSearchMode);
    }

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
    
    const modeAverageButton = document.getElementById('mode-average');
    if (modeAverageButton) {
        modeAverageButton.addEventListener('click', () => {
            setDisplayMode('average');
        });
    }

    const modeAllButton = document.getElementById('mode-all');
    if (modeAllButton) {
        modeAllButton.addEventListener('click', () => {
            setDisplayMode('all');
        });
    }

    const compareToggleButton = document.getElementById('compare-toggle');
    if (compareToggleButton) {
        compareToggleButton.addEventListener('click', () => {
            compareDialogController.showCompareDialog();
        });
    }

    const selectAllButton = document.getElementById('select-all-btn');
    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            selectAllFilteredItems();
        });
    }

    const clearSelectionButton = document.getElementById('clear-selection-btn');
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', () => {
            clearAllSelections();
        });
    }
    
    let previousConfig = { ...getState().config };

    const renderPrimaryView = () => {
        tableController.renderTable();
        tableController.updatePaginationControls();
        updateModeButtons();
        updateSearchModeButton();
        updateMobileSelectionSummary();
    };

    const sidebarController = createSidebarController({
        elements,
        getState,
        setState,
        removeFromCompare,
        closeMobileSidebar,
        onOverviewChange: updateMobileSelectionSummary
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
                updateMobileSelectionSummary();
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
    
    // Keep desktop and mobile freeze controls in sync.
    const freezeRowInput = document.getElementById('freeze-row');
    const freezeColInput = document.getElementById('freeze-col');
    const freezeRowMobileInput = document.getElementById('freeze-row-mobile');
    const freezeColMobileInput = document.getElementById('freeze-col-mobile');

    const syncFreezeValues = () => {
        const { config } = getState();
        freezeRowInput.value = config.freezeRow;
        freezeColInput.value = config.freezeCol;
        if (freezeRowMobileInput) {
            freezeRowMobileInput.value = config.freezeRow;
        }
        if (freezeColMobileInput) {
            freezeColMobileInput.value = config.freezeCol;
        }
    };

    const updateFreezeState = (key, value) => {
        setState({ config: { ...getState().config, [key]: value } });
        syncFreezeValues();
    };

    freezeRowInput.addEventListener('change', (e) => updateFreezeState('freezeRow', Number.parseInt(e.target.value, 10) || 0));
    freezeColInput.addEventListener('change', (e) => updateFreezeState('freezeCol', Number.parseInt(e.target.value, 10) || 0));
    if (freezeRowMobileInput) {
        freezeRowMobileInput.addEventListener('change', (e) => updateFreezeState('freezeRow', Number.parseInt(e.target.value, 10) || 0));
    }
    if (freezeColMobileInput) {
        freezeColMobileInput.addEventListener('change', (e) => updateFreezeState('freezeCol', Number.parseInt(e.target.value, 10) || 0));
    }

    syncFreezeValues();
    updateModeButtons();
    updateSearchModeButton();
    updateMobileSelectionSummary();
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
    
    // Re-process the active sheet when a search term is present.
    if (config.searchQuery) {
        processActiveSheet();
    }
};

const updateSearchModeButton = () => {
    const { isPreciseSearch } = getState().config;
    const searchModeBtn = document.getElementById('search-mode-btn');
    
    if (isPreciseSearch) {
        searchModeBtn.innerHTML = `<i data-lucide="target" class="w-4 h-4 mr-1"></i>${UI_TEXT.search.precise}`;
    } else {
        searchModeBtn.innerHTML = `<i data-lucide="search" class="w-4 h-4 mr-1"></i>${UI_TEXT.search.fuzzy}`;
    }
    
    lucide.createIcons();
};

const updateMobileSelectionSummary = () => {
    const { activeSheetName, processedData, compareItems, file } = getState();
    const currentSheetLabel = activeSheetName || (file ? UI_TEXT.sheet.selectPrompt : UI_TEXT.sheet.noSelection);

    if (elements.mobileTopTitle) {
        elements.mobileTopTitle.textContent = currentSheetLabel;
    }

    if (elements.mobileSelectionSummary) {
        elements.mobileSelectionSummary.textContent = UI_TEXT.selection.summary(compareItems.length);
    }

    if (elements.mobileFooterSelectionCount) {
        elements.mobileFooterSelectionCount.textContent = UI_TEXT.selection.summary(compareItems.length);
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

    const mobileToggleModeBtn = elements.mobileToggleModeBtn;
    if (mobileToggleModeBtn) {
        const isAverage = displayMode === 'average';
        swapTextWithSlide(
            mobileToggleModeBtn.querySelector('span'),
            isAverage ? UI_TEXT.displayMode.average : UI_TEXT.displayMode.all
        );
        const icon = mobileToggleModeBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isAverage ? 'toggle-right' : 'toggle-left');
        }
        mobileToggleModeBtn.classList.toggle('mobile-selection-btn--primary', !isAverage);
    }

    lucide.createIcons();
};

const renderReset = () => {
    elements.sheetList.innerHTML = EMPTY_SHEET_LIST_HTML;
    elements.thead.innerHTML = '';
    elements.tbody.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    elements.table.classList.add('hidden');
    elements.fileName.textContent = UI_TEXT.common.noSelectedFile;
    elements.resetBtn.classList.add('hidden');
    elements.paginationInfo.textContent = UI_TEXT.common.emptyPaginationInfo;
    elements.pageIndicator.textContent = UI_TEXT.common.emptyPageIndicator;

    if (elements.compareItemsContainer && elements.compareItemsPlaceholder) {
        elements.compareItemsContainer.innerHTML = '';
        elements.compareItemsContainer.appendChild(elements.compareItemsPlaceholder);
        elements.compareItemsPlaceholder.style.display = 'block';
    }

    if (elements.compareSection) {
        elements.compareSection.classList.add('hidden');
    }

    if (elements.compareCount) {
        elements.compareCount.textContent = UI_TEXT.common.emptyCompareCount;
        elements.compareCount.classList.add('hidden');
    }

    document.getElementById('freeze-row').value = 1;
    document.getElementById('freeze-col').value = 2;

    updateSearchModeButton();
    updateMobileSelectionSummary();
};


// Add every currently filtered row into the compare list.
const selectAllFilteredItems = () => {
    const { processedData, compareItems } = getState();
    
    // Only add items that are not already present in the compare list.
    const existingCompareKeys = new Set(compareItems.map(getCompareItemKey));
    const unselectedItems = processedData.filter(item =>
        !existingCompareKeys.has(getCompareItemKey(item))
    );
    
    if (unselectedItems.length === 0) {
        showToast(UI_TEXT.selection.nothingToAdd);
        return;
    }
    
    const newCompareItems = [...compareItems, ...unselectedItems];
    setState({ compareItems: newCompareItems });
    
    showToast(UI_TEXT.selection.addedToCompare(unselectedItems.length));
};

// Clear every selected compare item.
const clearAllSelections = () => {
    const { compareItems } = getState();
    
    if (compareItems.length === 0) {
        showToast(UI_TEXT.selection.nothingSelected);
        return;
    }
    
    const count = compareItems.length;
    
    clearCompareItems();
    showToast(UI_TEXT.selection.clearedCompare(count));
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
