import { initTheme } from '../core/theme.js';
import { getState, resetState, setState } from '../core/state_manager.js';
import { handleFileUpload, loadDefaultProjectData, processActiveSheet } from '../services/excel_service.js';
import { refreshIcons } from '../shared/vendor_loader.js';
import { initUI, showToast } from '../ui/ui_controller.js';
import { UI_TEXT } from '../ui/ui_strings.js';

const scheduleDefaultWorkbookLoad = () => {
    const loadWhenIdle = () => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                loadDefaultProjectData();
            }, { timeout: 2500 });
            return;
        }

        window.setTimeout(() => {
            loadDefaultProjectData();
        }, 1800);
    };

    if (document.readyState === 'complete') {
        loadWhenIdle();
        return;
    }

    window.addEventListener('load', loadWhenIdle, { once: true });
};

const buildProjectExportPayload = () => {
    const {
        file,
        sheetNames,
        activeSheetName,
        data,
        originalMergedData,
        processedData,
        compareItems,
        pagination,
        config
    } = getState();

    return {
        project: {
            file,
            sheetNames,
            activeSheetName,
            exportedAt: new Date().toISOString()
        },
        sheets: {
            raw: originalMergedData,
            merged: originalMergedData
        },
        currentView: {
            processedData,
            compareItems,
            pagination,
            config
        }
    };
};

const getProjectExportFileName = () => {
    const { file, activeSheetName } = getState();
    const baseName = file?.name
        ? file.name.replace(/\.[^.]+$/, '')
        : (activeSheetName || 'excel-project');

    return `${baseName}.json`;
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initUI();

    // Defer demo workbook parsing until after the first paint and an idle window.
    scheduleDefaultWorkbookLoad();

    const fileInput = document.getElementById('file-upload');
    const searchInput = document.getElementById('search-input');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const exportBtn = document.getElementById('export-json');
    const resetBtn = document.getElementById('reset-btn');

    fileInput.addEventListener('change', (event) => {
        handleFileUpload(event.target.files[0]);
    });

    window.addEventListener('dragover', (event) => {
        event.preventDefault();
        document.body.classList.add('drag-over');
    });

    window.addEventListener('dragleave', (event) => {
        if (event.clientX === 0 && event.clientY === 0) {
            document.body.classList.remove('drag-over');
        }
    });

    window.addEventListener('drop', (event) => {
        event.preventDefault();
        document.body.classList.remove('drag-over');

        if (event.dataTransfer.files.length) {
            handleFileUpload(event.dataTransfer.files[0]);
        }
    });

    searchInput.addEventListener('input', (event) => {
        setState({
            config: {
                ...getState().config,
                searchQuery: event.target.value
            }
        });
        processActiveSheet();
    });

    prevBtn.addEventListener('click', () => {
        const currentPage = getState().pagination.currentPage;
        if (currentPage > 1) {
            setState({ pagination: { currentPage: currentPage - 1 } });
        }
    });

    nextBtn.addEventListener('click', () => {
        const { currentPage, totalItems, pageSize } = getState().pagination;
        if (currentPage * pageSize < totalItems) {
            setState({ pagination: { currentPage: currentPage + 1 } });
        }
    });

    resetBtn.addEventListener('click', () => {
        if (confirm(UI_TEXT.file.confirmReset)) {
            resetState();
            fileInput.value = '';
        }
    });

    exportBtn.addEventListener('click', () => {
        const { file, sheetNames, data, originalMergedData } = getState();
        const hasProjectData = Boolean(file) || sheetNames.length > 0 ||
            Object.keys(data || {}).length > 0 ||
            Object.keys(originalMergedData || {}).length > 0;

        if (!hasProjectData) {
            showToast(UI_TEXT.file.noExportData, 'error');
            return;
        }

        const exportPayload = buildProjectExportPayload();
        const dataString = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = getProjectExportFileName();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(UI_TEXT.file.exportSuccess);
    });

    refreshIcons();
});
