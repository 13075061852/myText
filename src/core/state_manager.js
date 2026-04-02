import { isSameCompareItem } from '../shared/data_utils.js';

/**
 * Centralized application state built on top of a small pub/sub layer.
 */
const state = {
    file: null,
    workbook: null,
    sheetNames: [],
    activeSheetName: null,
    data: {},
    processedData: [],
    originalMergedData: {},
    compareItems: [],
    isComparePanelOpen: false,
    pagination: {
        currentPage: 1,
        pageSize: 50,
        totalItems: 0
    },
    config: {
        freezeRow: 1,
        freezeCol: 2,
        searchQuery: '',
        isPreciseSearch: false,
        displayMode: 'all'
    }
};

const listeners = new Set();

export const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const notify = (event, payload) => {
    listeners.forEach((listener) => listener(event, payload, state));
};

export const setState = (updates) => {
    let hasChanges = false;
    const events = [];

    for (const [key, value] of Object.entries(updates)) {
        if (state[key] !== value) {
            if (key === 'config' && typeof value === 'object') {
                state.config = { ...state.config, ...value };
                events.push('config:updated');
            } else if (key === 'pagination' && typeof value === 'object') {
                state.pagination = { ...state.pagination, ...value };
                events.push('pagination:updated');
            } else {
                state[key] = value;
                events.push(`${key}:updated`);
            }

            hasChanges = true;
        }
    }

    if (hasChanges) {
        events.forEach((event) => notify(event, null));
    }
};

export const getState = () => state;

export const resetState = () => {
    state.file = null;
    state.workbook = null;
    state.sheetNames = [];
    state.activeSheetName = null;
    state.data = {};
    state.processedData = [];
    state.originalMergedData = {};
    state.compareItems = [];
    state.isComparePanelOpen = false;
    state.pagination = { currentPage: 1, pageSize: 50, totalItems: 0 };
    state.config.searchQuery = '';
    state.config.isPreciseSearch = false;
    state.config.displayMode = 'all';
    state.config.freezeRow = 1;
    state.config.freezeCol = 2;
    notify('state:reset');
};

export const addToCompare = (item) => {
    const existingIndex = state.compareItems.findIndex((compareItem) =>
        isSameCompareItem(compareItem, item)
    );

    if (existingIndex === -1) {
        setState({ compareItems: [...state.compareItems, item] });
    }
};

export const removeFromCompare = (item) => {
    const filteredItems = state.compareItems.filter((compareItem) =>
        !isSameCompareItem(compareItem, item)
    );
    setState({ compareItems: filteredItems });
};

export const clearCompareItems = () => {
    setState({ compareItems: [] });
};

export const toggleComparePanel = () => {
    setState({ isComparePanelOpen: !state.isComparePanelOpen });
};
