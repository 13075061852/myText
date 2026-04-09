export const MODEL_KEY = '\u578B\u53F7';
export const BATCH_KEY = '\u6279\u6B21';

export const DEFAULT_TEST_FILE_NAME = '\u6D4B\u8BD5\u6570\u636E.xlsx';
export const DEFAULT_TEST_FILE_PATH = `./${DEFAULT_TEST_FILE_NAME}`;
export const DEFAULT_TEST_JSON_NAME = '\u6D4B\u8BD5\u6570\u636E.json';
export const DEFAULT_TEST_JSON_PATH = `./${DEFAULT_TEST_JSON_NAME}`;

export const isSpecialMarkedValue = (value) =>
    typeof value === 'string' && (value.startsWith('>') || value.startsWith('<'));

export const isNumericLike = (value) => {
    if (isSpecialMarkedValue(value)) {
        return true;
    }

    const parsedValue = parseFloat(value);
    return !Number.isNaN(parsedValue) && Number.isFinite(parsedValue);
};

export const parseNumericValue = (value) => {
    if (isSpecialMarkedValue(value)) {
        return parseFloat(String(value).slice(1)) || 0;
    }

    return parseFloat(value) || 0;
};

export const calculateNumericAverage = (values) => {
    if (!Array.isArray(values) || values.length === 0) {
        return 0;
    }

    const numericValues = values.filter(isNumericLike).map(parseNumericValue);
    if (numericValues.length === 0) {
        return 0;
    }

    const total = numericValues.reduce((sum, value) => sum + value, 0);
    return total / numericValues.length;
};

export const isSameCompareItem = (leftItem, rightItem) =>
    leftItem?.[MODEL_KEY] === rightItem?.[MODEL_KEY] &&
    leftItem?.[BATCH_KEY] === rightItem?.[BATCH_KEY];

export const getCompareItemKey = (item) =>
    `${item?.[MODEL_KEY] ?? ''}::${item?.[BATCH_KEY] ?? ''}`;

export const matchesModelQuery = (row, searchTerm, isPrecise = false) => {
    if (!searchTerm) {
        return true;
    }

    const modelValue = row?.[MODEL_KEY] ? row[MODEL_KEY].toString() : '';
    const normalizedModel = modelValue.toLowerCase();
    const normalizedQuery = searchTerm.toLowerCase();

    return isPrecise
        ? normalizedModel === normalizedQuery
        : normalizedModel.includes(normalizedQuery);
};

export const isIdentifierKey = (key) => key === MODEL_KEY || key === BATCH_KEY;

export const collectColumnKeys = (rows) => {
    const allKeys = new Set();
    rows.forEach((row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
    });
    return Array.from(allKeys);
};

const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export const highlightText = (text, searchTerm) => {
    if (text === undefined || text === null || text === '') {
        return '-';
    }

    const safeText = escapeHtml(text);
    if (!searchTerm) {
        return safeText;
    }

    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    return safeText.replace(regex, '<span class="bg-yellow-200 text-yellow-900 font-bold">$1</span>');
};

export const formatValueForDisplay = (
    value,
    { displayMode = 'all', searchTerm = '', highlight = false } = {}
) => {
    if (value === undefined || value === null || value === '') {
        return '-';
    }

    if (Array.isArray(value)) {
        const average = calculateNumericAverage(value);
        if (displayMode === 'average') {
            return `<span class="text-pink-600 font-bold">${average.toFixed(2)}</span>`;
        }

        const renderedValues = value.map((item) => {
            if (item === undefined || item === null || item === '') {
                return '<span class="param-value">[-]</span>';
            }

            const renderedItem = highlight
                ? highlightText(item, searchTerm)
                : escapeHtml(item);

            return `<span class="param-value">[${renderedItem}]</span>`;
        }).join('');

        return `${renderedValues} (<span class="text-pink-600 font-bold">${average.toFixed(2)}</span>)`;
    }

    return highlight ? highlightText(value, searchTerm) : escapeHtml(value);
};
