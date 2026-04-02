import {
    BATCH_KEY,
    MODEL_KEY,
    getCompareItemKey,
    isSameCompareItem,
    matchesModelQuery
} from '../shared/data_utils.js';

export const createSidebarController = ({
    elements,
    getState,
    setState,
    removeFromCompare,
    closeMobileSidebar,
    onOverviewChange
}) => {
    const renderSidebar = (sheets, active) => {
        elements.sheetList.innerHTML = '';

        if (sheets.length === 0) {
            elements.sheetList.innerHTML = '<div class="text-xs text-muted-foreground text-center mt-10">暂无数据<br>请上传文件</div>';
            return;
        }

        const { originalMergedData, config, compareItems } = getState();
        const searchQuery = config.searchQuery;
        const isPreciseSearch = config.isPreciseSearch;

        sheets.forEach((sheet) => {
            let count = 0;
            let compareCount = 0;

            if (originalMergedData && originalMergedData[sheet]) {
                count = searchQuery
                    ? originalMergedData[sheet].filter((row) => matchesModelQuery(row, searchQuery, isPreciseSearch)).length
                    : originalMergedData[sheet].length;

                compareCount = compareItems.filter((item) =>
                    originalMergedData[sheet].some((row) => isSameCompareItem(row, item))
                ).length;
            }

            const div = document.createElement('div');
            div.className = `sheet-item px-3 py-2 rounded-md text-sm cursor-pointer flex items-center justify-between gap-2 ${sheet === active ? 'active' : 'text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground'}`;
            div.innerHTML = `
            <div class="flex items-center gap-2">
                <i data-lucide="table-2" class="w-4 h-4"></i>
                <span class="truncate">${sheet}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="sheet-count-badge">${count}</span>
                ${compareCount > 0 ? `<span class="sheet-count-badge sheet-count-badge--active">${compareCount}</span>` : ''}
            </div>
        `;
            div.onclick = () => {
                setState({ activeSheetName: sheet });
                closeMobileSidebar();
            };
            elements.sheetList.appendChild(div);
        });

        onOverviewChange();
        lucide.createIcons();
    };

    const renderCompareItems = () => {
        const { compareItems } = getState();

        if (!elements.compareItemsContainer || !elements.compareItemsPlaceholder) return;

        if (elements.compareSection) {
            elements.compareSection.classList.toggle('hidden', compareItems.length === 0);
        }

        if (elements.compareCount) {
            elements.compareCount.textContent = compareItems.length;
            elements.compareCount.classList.toggle('hidden', compareItems.length === 0);
        }

        elements.compareItemsContainer.innerHTML = '';

        if (compareItems.length === 0) {
            elements.compareItemsContainer.appendChild(elements.compareItemsPlaceholder);
            elements.compareItemsPlaceholder.style.display = 'block';
            return;
        }

        elements.compareItemsPlaceholder.style.display = 'none';

        compareItems.forEach((item) => {
            const compareItemKey = getCompareItemKey(item);
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-2 rounded text-xs bg-secondary/50 hover:bg-secondary';
            div.innerHTML = `
            <div class="truncate">
                <div class="font-medium truncate">${item[MODEL_KEY] || '未知型号'}</div>
                <div class="text-muted-foreground truncate">批次: ${item[BATCH_KEY] || '未知批次'}</div>
            </div>
            <button class="remove-compare-item p-1 rounded hover:bg-accent" data-compare-key="${compareItemKey}">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
            elements.compareItemsContainer.appendChild(div);
        });

        document.querySelectorAll('.remove-compare-item').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const compareKey = button.getAttribute('data-compare-key');
                const itemToRemove = compareItems.find((item) => getCompareItemKey(item) === compareKey);
                if (itemToRemove) {
                    removeFromCompare(itemToRemove);
                }
            });
        });

        lucide.createIcons();
    };

    return {
        renderCompareItems,
        renderSidebar
    };
};
