import { initTheme } from '../core/theme.js';
import { getState, resetState, setState } from '../core/state_manager.js';
import { handleFileUpload, loadDefaultTestFile, processActiveSheet } from '../services/excel_service.js';
import { initUI, showToast } from '../ui/ui_controller.js';
import { UI_TEXT } from '../ui/ui_strings.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initUI();

    // Try to load the bundled sample workbook shortly after boot.
    window.setTimeout(() => {
        loadDefaultTestFile();
    }, 500);

    const fileInput = document.getElementById('file-upload');
    const searchInput = document.getElementById('search-input');
    const freezeRowInput = document.getElementById('freeze-row');
    const freezeColInput = document.getElementById('freeze-col');
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

    freezeRowInput.addEventListener('change', (event) => {
        setState({ config: { freezeRow: Number.parseInt(event.target.value, 10) || 0 } });
    });

    freezeColInput.addEventListener('change', (event) => {
        setState({ config: { freezeCol: Number.parseInt(event.target.value, 10) || 0 } });
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
        const { processedData, activeSheetName } = getState();
        if (!processedData || processedData.length === 0) {
            showToast(UI_TEXT.file.noExportData, 'error');
            return;
        }

        const dataString = JSON.stringify(processedData, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `${activeSheetName}_export.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(UI_TEXT.file.exportSuccess);
    });

    lucide.createIcons();
});
