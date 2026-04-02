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
    const updateStickyOffsets = () => {
        const freezeColCount = getState().config.freezeCol || 0;
        const headerCells = Array.from(elements.thead.querySelectorAll('th'));
        const bodyRows = Array.from(elements.tbody.querySelectorAll('tr'));

        if (freezeColCount <= 0 || headerCells.length === 0) {
            headerCells.forEach((cell) => {
                cell.style.left = '';
                cell.style.minWidth = '';
                cell.style.width = '';
                cell.style.maxWidth = '';
            });

            bodyRows.forEach((row) => {
                Array.from(row.children).forEach((cell) => {
                    cell.style.left = '';
                    cell.style.minWidth = '';
                    cell.style.width = '';
                    cell.style.maxWidth = '';
                });
            });
            return;
        }

        const columnWidths = [];

        for (let colIndex = 0; colIndex < freezeColCount; colIndex += 1) {
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
        for (let colIndex = 0; colIndex < freezeColCount; colIndex += 1) {
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

        headerCells.slice(0, freezeColCount).forEach((cell, colIndex) => {
            syncCellPosition(cell, colIndex);
        });

        bodyRows.forEach((row) => {
            for (let colIndex = 0; colIndex < freezeColCount; colIndex += 1) {
                syncCellPosition(row.children[colIndex], colIndex);
            }
        });
    };

    const renderTable = () => {
        const { processedData, pagination, config, compareItems } = getState();
        const { currentPage, pageSize } = pagination;
        const { freezeRow, freezeCol, searchQuery, displayMode } = config;

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
            th.className = `px-4 py-3 font-medium border-b border-border text-xs whitespace-nowrap ${idx < freezeCol ? 'sticky-col' : ''} ${idx < freezeCol ? 'z-30' : ''}`;
            if (freezeRow > 0) {
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
                td.className = `px-4 py-2 border-b border-border whitespace-nowrap truncate max-w-[300px] ${idx < freezeCol ? 'sticky-col' : ''}`;
                td.innerHTML = formatValueForDisplay(row[key], {
                    displayMode,
                    searchTerm: searchQuery,
                    highlight: true
                });
                rowTr.appendChild(td);
            });

            elements.tbody.appendChild(rowTr);
        });

        updateStickyOffsets();
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
