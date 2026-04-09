import {
    BATCH_KEY,
    MODEL_KEY,
    collectColumnKeys,
    formatValueForDisplay
} from '../shared/data_utils.js';
import { swapTextWithSlide } from '../shared/animation_utils.js';
import { refreshIcons } from '../shared/vendor_loader.js';

export const createCompareDialogController = ({
    getState,
    showToast
}) => {
    const MOBILE_COMPARE_BREAKPOINT = 768;
    let compareRenderTransitionTimeout = null;
    const compareDialogState = {
        currentPage: 1,
        displayMode: 'average',
        isTransposed: true
    };

    const syncCompareModeButton = () => {
        const compareModeTextSpan = document.getElementById('compare-mode-text');
        if (compareModeTextSpan) {
            swapTextWithSlide(
                compareModeTextSpan,
                compareDialogState.displayMode === 'average' ? '平均值' : '参数'
            );
        }
    };

    const syncCompareTransposeButton = () => {
        const compareTransposeTextSpan = document.getElementById('compare-transpose-text');
        if (compareTransposeTextSpan) {
            compareTransposeTextSpan.textContent = '翻转';
        }
    };

    const renderCompareItemLabel = (item) =>
        `<span class="compare-column-title">${item[MODEL_KEY] || '未知'}</span><br/><span class="compare-column-meta text-muted-foreground">${item[BATCH_KEY] || '未知'}</span>`;

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

    const buildCompareDialogContent = ({ animateValues = false } = {}) => {
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
            const totalPages = Math.max(1, Math.ceil(filteredKeys.length / rowsPerPage));
            const currentPage = Math.min(Math.max(compareDialogState.currentPage, 1), totalPages);

            compareDialogState.currentPage = currentPage;

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, filteredKeys.length);
            const currentKeys = filteredKeys.slice(startIndex, endIndex);

            resultHTML += '<div class="compare-table-container">';
            resultHTML += '<table>';
            if (compareDialogState.isTransposed) {
                resultHTML += '<thead><tr><th class="sticky-first-col">型号 / 批次</th>';

                currentKeys.forEach((key) => {
                    resultHTML += `<th>${key}</th>`;
                });

                resultHTML += '</tr></thead><tbody>';

                compareItems.forEach((item) => {
                    resultHTML += `<tr><td class="font-medium sticky-first-col">${renderCompareItemLabel(item)}</td>`;

                    currentKeys.forEach((key) => {
                        const renderedValue = formatValueForDisplay(item[key], {
                            displayMode: compareDialogState.displayMode
                        });
                        resultHTML += `<td><span class="display-mode-text${animateValues ? ' display-mode-text--in' : ''}">${renderedValue}</span></td>`;
                    });

                    resultHTML += '</tr>';
                });
            } else {
                resultHTML += '<thead><tr><th class="sticky-first-col">参数</th>';

                compareItems.forEach((item) => {
                    resultHTML += `<th>${renderCompareItemLabel(item)}</th>`;
                });

                resultHTML += '</tr></thead><tbody>';

                currentKeys.forEach((key) => {
                    resultHTML += `<tr><td class="font-medium sticky-first-col">${key}</td>`;

                    compareItems.forEach((item) => {
                        const renderedValue = formatValueForDisplay(item[key], {
                            displayMode: compareDialogState.displayMode
                        });
                        resultHTML += `<td><span class="display-mode-text${animateValues ? ' display-mode-text--in' : ''}">${renderedValue}</span></td>`;
                    });

                    resultHTML += '</tr>';
                });
            }

            resultHTML += '</tbody></table>';
            resultHTML += '</div>';

            resultHTML += '<div class="compare-pagination pagination-controls">';
            resultHTML += `<button id="prev-page-compare" class="p-2 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${currentPage <= 1 ? 'opacity-30 cursor-not-allowed' : ''}" ${currentPage <= 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>`;
            resultHTML += `<span class="compare-pagination-info text-sm font-medium min-w-[3rem] text-center">${currentPage} / ${totalPages}</span>`;
            resultHTML += `<button id="next-page-compare" class="p-2 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${currentPage >= totalPages ? 'opacity-30 cursor-not-allowed' : ''}" ${currentPage >= totalPages ? 'disabled' : ''}>
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>`;
            resultHTML += '</div>';
        }

        content.innerHTML = resultHTML;
        bindCompareDialogPagination();
        refreshIcons();
    };

    const renderCompareDialogContent = ({ animateDisplayModeChange = false } = {}) => {
        const content = document.getElementById('compare-dialog-content');

        if (!animateDisplayModeChange || !content) {
            buildCompareDialogContent();
            return;
        }

        if (compareRenderTransitionTimeout) {
            clearTimeout(compareRenderTransitionTimeout);
        }

        content
            .querySelectorAll('.display-mode-text')
            .forEach((node) => node.classList.add('display-mode-text--out'));

        compareRenderTransitionTimeout = window.setTimeout(() => {
            buildCompareDialogContent({ animateValues: true });
            compareRenderTransitionTimeout = null;
        }, 120);
    };

    const showCompareDialog = () => {
        const { compareItems } = getState();

        if (!compareItems || compareItems.length === 0) {
            showToast('请先选择要对比的数据项');
            return;
        }

        if (compareItems.length < 2) {
            showToast('请至少选择两个数据项进行对比');
            return;
        }

        const dialog = document.getElementById('compare-dialog');
        const compareModeToggleBtn = document.getElementById('compare-mode-toggle');
        const compareTransposeToggleBtn = document.getElementById('compare-transpose-toggle');

        compareDialogState.currentPage = 1;
        compareDialogState.isTransposed = window.innerWidth > MOBILE_COMPARE_BREAKPOINT;
        syncCompareModeButton();
        syncCompareTransposeButton();
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
                renderCompareDialogContent({ animateDisplayModeChange: true });
            };
        }

        if (compareTransposeToggleBtn) {
            compareTransposeToggleBtn.onclick = () => {
                compareDialogState.isTransposed = !compareDialogState.isTransposed;
                syncCompareTransposeButton();
                renderCompareDialogContent();
            };
        }

        refreshIcons();
    };

    return {
        renderCompareDialogContent,
        showCompareDialog
    };
};
