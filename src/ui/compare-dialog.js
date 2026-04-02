import {
    BATCH_KEY,
    MODEL_KEY,
    collectColumnKeys,
    formatValueForDisplay
} from '../shared/data_utils.js';

export const createCompareDialogController = ({
    getState,
    showToast
}) => {
    const compareDialogState = {
        currentPage: 1,
        displayMode: 'average'
    };

    const syncCompareModeButton = () => {
        const compareModeTextSpan = document.getElementById('compare-mode-text');
        if (compareModeTextSpan) {
            compareModeTextSpan.textContent = compareDialogState.displayMode === 'average' ? '平均值' : '参数';
        }
    };

    const bindCompareDialogPagination = () => {
        const prevBtn = document.getElementById('prev-page-compare');
        const nextBtn = document.getElementById('next-page-compare');

        if (prevBtn) {
            prevBtn.onclick = (event) => {
                event.preventDefault();
                compareDialogState.currentPage = Math.max(compareDialogState.currentPage - 1, 1);
                renderCompareDialogContent();
            };
        }

        if (nextBtn) {
            nextBtn.onclick = (event) => {
                event.preventDefault();
                compareDialogState.currentPage += 1;
                renderCompareDialogContent();
            };
        }
    };

    const renderCompareDialogContent = () => {
        const content = document.getElementById('compare-dialog-content');
        const { compareItems } = getState();

        let resultHTML = '';

        if (compareItems.length === 0) {
            resultHTML = '<p class="text-muted-foreground">请先选择要对比的数据项！</p>';
        } else if (compareItems.length < 2) {
            resultHTML = '<p class="text-muted-foreground">请至少选择两个数据项进行对比！</p>';
        } else {
            const rowsPerPage = 7;
            const filteredKeys = collectColumnKeys(compareItems)
                .filter((key) =>
                    key !== MODEL_KEY &&
                    key !== BATCH_KEY &&
                    !String(key).startsWith('__EMPTY')
                );
            const totalPages = Math.ceil(filteredKeys.length / rowsPerPage);
            const currentPage = Math.min(Math.max(compareDialogState.currentPage, 1), totalPages);

            compareDialogState.currentPage = currentPage;

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, filteredKeys.length);
            const currentKeys = filteredKeys.slice(startIndex, endIndex);

            resultHTML += '<div class="compare-table-container">';
            resultHTML += '<table>';
            resultHTML += '<thead><tr><th class="sticky-first-col">参数</th>';

            compareItems.forEach((item) => {
                resultHTML += `<th>${item[MODEL_KEY] || '未知'}<br/><span class="text-xs text-muted-foreground">${item[BATCH_KEY] || '未知'}</span></th>`;
            });

            resultHTML += '</tr></thead><tbody>';

            currentKeys.forEach((key) => {
                resultHTML += `<tr><td class="font-medium sticky-first-col">${key}</td>`;

                compareItems.forEach((item) => {
                    resultHTML += `<td>${formatValueForDisplay(item[key], {
                        displayMode: compareDialogState.displayMode
                    })}</td>`;
                });

                resultHTML += '</tr>';
            });

            resultHTML += '</tbody></table>';
            resultHTML += '</div>';

            if (totalPages > 1) {
                resultHTML += '<div class="compare-pagination pagination-controls flex items-center justify-center gap-4 mt-4">';
                resultHTML += `<button id="prev-page-compare" class="p-2 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${currentPage <= 1 ? 'opacity-30 cursor-not-allowed' : ''}" ${currentPage <= 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>`;
                resultHTML += `<span class="compare-pagination-info text-sm font-medium min-w-[3rem] text-center">${currentPage} / ${totalPages}</span>`;
                resultHTML += `<button id="next-page-compare" class="p-2 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${currentPage >= totalPages ? 'opacity-30 cursor-not-allowed' : ''}" ${currentPage >= totalPages ? 'disabled' : ''}>
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>`;
                resultHTML += '</div>';
            }
        }

        content.innerHTML = resultHTML;
        bindCompareDialogPagination();
        lucide.createIcons();
    };

    const showCompareDialog = () => {
        const { compareItems } = getState();

        if (!compareItems || compareItems.length === 0) {
            showToast('请先选择要对比的数据项');
            return;
        }

        const dialog = document.getElementById('compare-dialog');
        const compareModeToggleBtn = document.getElementById('compare-mode-toggle');

        compareDialogState.currentPage = 1;
        syncCompareModeButton();
        renderCompareDialogContent();

        dialog.classList.remove('hidden');
        dialog.classList.add('flex');

        const closeDialog = () => {
            dialog.classList.add('hidden');
            dialog.classList.remove('flex');
        };

        dialog.onclick = (event) => {
            if (event.target === dialog) {
                closeDialog();
            }
        };

        if (compareModeToggleBtn) {
            compareModeToggleBtn.onclick = () => {
                compareDialogState.displayMode = compareDialogState.displayMode === 'average' ? 'all' : 'average';
                syncCompareModeButton();
                renderCompareDialogContent();
            };
        }

        lucide.createIcons();
    };

    return {
        renderCompareDialogContent,
        showCompareDialog
    };
};
