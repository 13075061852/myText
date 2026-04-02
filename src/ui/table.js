import {
    collectColumnKeys,
    formatValueForDisplay,
    isSameCompareItem
} from '../shared/data_utils.js';

export const createTableController = ({
    elements,
    getState,
    addToCompare,
    removeFromCompare
}) => {
    const FIXED_HEADER_ROWS = 1;
    const FIXED_LEADING_COLUMNS = 2;
    let lastRenderedDisplayMode = null;
    let renderTransitionTimeout = null;

    const updateStickyOffsets = () => {
        const headerCells = Array.from(elements.thead.querySelectorAll('th'));
        const bodyRows = Array.from(elements.tbody.querySelectorAll('tr'));

        if (FIXED_LEADING_COLUMNS <= 0 || headerCells.length === 0) {
            return;
        }

        const columnWidths = [];

        for (let colIndex = 0; colIndex < FIXED_LEADING_COLUMNS; colIndex += 1) {
            let maxWidth = headerCells[colIndex]?.offsetWidth || 0;

            bodyRows.forEach((row) => {
                const cell = row.children[colIndex];
                if (cell) {
                    maxWidth = Math.max(maxWidth, cell.offsetWidth);
                }
            });

            columnWidths[colIndex] = maxWidth;
        }

        const accumulatedLeft = [];
        let runningLeft = 0;
        for (let colIndex = 0; colIndex < FIXED_LEADING_COLUMNS; colIndex += 1) {
            accumulatedLeft[colIndex] = runningLeft;
            runningLeft += columnWidths[colIndex];
        }

        const syncCellPosition = (cell, colIndex) => {
            if (!cell) return;

            const width = `${columnWidths[colIndex]}px`;
            cell.style.left = `${accumulatedLeft[colIndex]}px`;
            cell.style.minWidth = width;
            cell.style.width = width;
            cell.style.maxWidth = width;
            cell.style.boxSizing = 'border-box';
        };

        headerCells.slice(0, FIXED_LEADING_COLUMNS).forEach((cell, colIndex) => {
            syncCellPosition(cell, colIndex);
        });

        bodyRows.forEach((row) => {
            for (let colIndex = 0; colIndex < FIXED_LEADING_COLUMNS; colIndex += 1) {
                syncCellPosition(row.children[colIndex], colIndex);
            }
        });
    };

    const buildTable = ({ animateValues = false } = {}) => {
        const { processedData, pagination, config, compareItems } = getState();
        const { currentPage, pageSize } = pagination;
        const { searchQuery, displayMode } = config;

        elements.thead.innerHTML = '';
        elements.tbody.innerHTML = '';

        if (processedData.length === 0) {
            elements.tbody.innerHTML = '<tr><td colspan="100" class="text-center py-8 text-muted-foreground">无匹配数据</td></tr>';
            return;
        }

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, processedData.length);
        const pageData = processedData.slice(startIndex, endIndex);
        const headerRow = collectColumnKeys(processedData);

        const headerTr = document.createElement('tr');
        headerRow.forEach((key, idx) => {
            const th = document.createElement('th');
            th.className = `px-4 py-3 font-medium border-b border-border text-xs whitespace-nowrap ${idx < FIXED_LEADING_COLUMNS ? 'sticky-col z-30' : ''}`;
            if (FIXED_HEADER_ROWS > 0) {
                th.classList.add('sticky-header');
            }
            th.textContent = key || '';
            headerTr.appendChild(th);
        });
        elements.thead.appendChild(headerTr);

        pageData.forEach((row) => {
            const rowTr = document.createElement('tr');
            rowTr.className = 'hover:bg-muted/30 transition-colors';

            const isInCompare = compareItems.some((item) => isSameCompareItem(item, row));
            if (isInCompare) {
                rowTr.classList.add('row-selected');
            }

            rowTr.addEventListener('click', (event) => {
                if (event.target.classList.contains('ignore-click') || event.target.closest('.ignore-click')) {
                    return;
                }

                if (isInCompare) {
                    removeFromCompare(row);
                } else {
                    addToCompare(row);
                }
            });

            headerRow.forEach((key, idx) => {
                const td = document.createElement('td');
                td.className = `px-4 py-2 border-b border-border whitespace-nowrap truncate max-w-[300px] ${idx < FIXED_LEADING_COLUMNS ? 'sticky-col' : ''}`;
                const renderedValue = formatValueForDisplay(row[key], {
                    displayMode,
                    searchTerm: searchQuery,
                    highlight: true
                });
                td.innerHTML = animateValues
                    ? `<span class="display-mode-text display-mode-text--in">${renderedValue}</span>`
                    : `<span class="display-mode-text">${renderedValue}</span>`;
                rowTr.appendChild(td);
            });

            elements.tbody.appendChild(rowTr);
        });

        updateStickyOffsets();
        lastRenderedDisplayMode = displayMode;
    };

    const renderTable = () => {
        const { config } = getState();
        const shouldAnimateDisplayModeChange =
            lastRenderedDisplayMode !== null &&
            lastRenderedDisplayMode !== config.displayMode;

        if (!shouldAnimateDisplayModeChange) {
            buildTable();
            return;
        }

        if (renderTransitionTimeout) {
            clearTimeout(renderTransitionTimeout);
        }

        elements.tbody
            .querySelectorAll('.display-mode-text')
            .forEach((node) => node.classList.add('display-mode-text--out'));

        renderTransitionTimeout = window.setTimeout(() => {
            buildTable({ animateValues: true });
            renderTransitionTimeout = null;
        }, 120);
    };

    const updatePaginationControls = () => {
        const { pagination } = getState();
        const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize) || 1;
        const start = (pagination.currentPage - 1) * pagination.pageSize + 1;
        const end = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems);
        elements.pageIndicator.textContent = `${pagination.currentPage} / ${totalPages}`;

        elements.prevBtn.disabled = pagination.currentPage <= 1;
        elements.nextBtn.disabled = pagination.currentPage >= totalPages;
        elements.paginationInfo.textContent = pagination.totalItems > 0
            ? `显示 ${start} - ${end} 条，共 ${pagination.totalItems} 条`
            : '无数据';
    };

    return {
        renderTable,
        updatePaginationControls
    };
};
