import { getState, setState } from '../core/state_manager.js';
import {
    DEFAULT_TEST_FILE_NAME,
    DEFAULT_TEST_FILE_PATH,
    DEFAULT_TEST_JSON_PATH,
    MODEL_KEY,
    BATCH_KEY,
    calculateNumericAverage,
    isIdentifierKey,
    isNumericLike,
    isSpecialMarkedValue,
    matchesModelQuery,
    parseNumericValue
} from '../shared/data_utils.js';
import { ensureXlsx } from '../shared/vendor_loader.js';

const applyProjectSnapshot = ({
    file,
    sheetNames,
    activeSheetName,
    data,
    originalMergedData,
    compareItems = [],
    config = {}
}) => {
    const resolvedSheetNames = Array.isArray(sheetNames) ? sheetNames : [];
    const resolvedData = data && typeof data === 'object' ? data : {};
    const resolvedMergedData = originalMergedData && typeof originalMergedData === 'object'
        ? originalMergedData
        : {};
    const nextActiveSheetName = activeSheetName || resolvedSheetNames[0] || null;

    setState({
        file,
        sheetNames: resolvedSheetNames,
        data: resolvedData,
        originalMergedData: resolvedMergedData,
        activeSheetName: nextActiveSheetName,
        compareItems,
        config
    });

    processActiveSheet();
};

const fetchJsonSnapshot = async () => {
    const response = await fetch(DEFAULT_TEST_JSON_PATH, { cache: 'no-store' });

    if (!response.ok) {
        throw new Error(`JSON snapshot unavailable: ${response.status}`);
    }

    return response.json();
};

export const loadDefaultProjectData = async () => {
    try {
        const snapshot = await fetchJsonSnapshot();
        const projectMeta = snapshot?.project ?? {};
        const currentView = snapshot?.currentView ?? {};

        applyProjectSnapshot({
            file: projectMeta.file ?? {
                name: DEFAULT_TEST_JSON_PATH.split('/').pop(),
                size: 0
            },
            sheetNames: projectMeta.sheetNames ?? Object.keys(snapshot?.sheets?.raw ?? {}),
            activeSheetName: projectMeta.activeSheetName,
            data: snapshot?.sheets?.raw ?? {},
            originalMergedData: snapshot?.sheets?.merged ?? {},
            compareItems: currentView.compareItems ?? [],
            config: currentView.config ?? {}
        });
    } catch (error) {
        console.warn('Default JSON snapshot not available, falling back to Excel.', error);
        await loadDefaultTestFile();
    }
};

/**
 * 计算数组的平均值
 * @param {Array} arr - 数字数组
 * @returns {number} 平均值
 */
export const calculateAverage = calculateNumericAverage;

/**
 * 合并字段值到目标对象
 * @param {Object} targetObj - 目标对象
 * @param {string} key - 字段名
 * @param {any} value - 字段值
 * @param {boolean} isIdentifier - 是否为标识字段（型号或批次）
 */
export const mergeFieldValue = (targetObj, key, value, isIdentifier) => {
    if (!isIdentifier && !isNumericLike(value)) {
        return;
    }
    
    // 处理字段名相似的情况，将它们合并到同一个数组中
    let baseKey = key;
    // 检查是否有带_数字后缀的字段名
    const suffixMatch = key.match(/^(.*)_([0-9]+)$/);
    if (suffixMatch) {
        baseKey = suffixMatch[1];
    }
    
    // 查找是否已存在基础字段名
    let existingKey = null;
    for (const existingField in targetObj) {
        const existingSuffixMatch = existingField.match(/^(.*)_([0-9]+)$/);
        let existingBaseKey = existingField;
        if (existingSuffixMatch) {
            existingBaseKey = existingSuffixMatch[1];
        }
        
        if (existingBaseKey === baseKey) {
            existingKey = existingField;
            break;
        }
    }
    
    const normalizedValue = (isIdentifier || isSpecialMarkedValue(value))
        ? value
        : parseNumericValue(value);

    if (existingKey) {
        if (!Array.isArray(targetObj[existingKey])) {
            targetObj[existingKey] = [targetObj[existingKey]];
        }
        targetObj[existingKey].push(normalizedValue);
    } else {
        targetObj[key] = normalizedValue;
    }
};

const getRowModelValue = (row) => {
    const modelValue = row?.[MODEL_KEY];

    if (modelValue === null || modelValue === undefined) {
        return '';
    }

    return String(modelValue).trim();
};

const mergeRowIntoTarget = (targetObj, row) => {
    if (!row || typeof row !== 'object') {
        return;
    }

    for (const key in row) {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
            if (key === MODEL_KEY || key === BATCH_KEY || key === '测试温度') {
                if (targetObj[key] === undefined) {
                    targetObj[key] = row[key];
                }
                continue;
            }

            const isIdentifier = isIdentifierKey(key);
            mergeFieldValue(targetObj, key, row[key], isIdentifier);
        }
    }
};

/**
 * 加载默认测试文件
 */
export const loadDefaultTestFile = async () => {
    try {
        const XLSX = await ensureXlsx();
        // 创建XMLHttpRequest对象来加载本地测试文件
        const xhr = new XMLHttpRequest();
        // 使用相对路径加载测试文件
        xhr.open('GET', DEFAULT_TEST_FILE_PATH, true);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = 10000; // 设置10秒超时
        
        xhr.onload = function(e) {
            if (xhr.status === 200) {
                try {
                    // 检查响应数据
                    if (!xhr.response) {
                        throw new Error('文件响应为空');
                    }
                    
                    // 将文件数据转换为Uint8Array格式
                    const data = new Uint8Array(xhr.response);
                    if (data.length === 0) {
                        throw new Error('文件内容为空');
                    }
                    
                    const workbook = XLSX.read(data, { type: 'array' });

                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('Excel文件中没有找到工作表');
                    }
                    
                    // 将工作簿转换为JSON格式
                    const sheetNames = workbook.SheetNames;
                    const dataMap = {};

                    sheetNames.forEach(name => {
                        const worksheet = workbook.Sheets[name];
                        // 将工作表转换为JSON数据（使用默认的header设置，这样会包含列名）
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        dataMap[name] = jsonData;
                    });

                    setState({
                        file: { name: DEFAULT_TEST_FILE_NAME, size: data.length },
                        workbook: workbook,
                        sheetNames: sheetNames,
                        data: dataMap,
                        activeSheetName: sheetNames[0]
                    });

                    processAllSheets(); // 处理所有工作表
                    
                } catch (error) {
                    // 处理文件读取或解析错误
                    console.error('读取默认测试文件时出错:', error);
                    alert('读取默认测试文件时出错: ' + error.message);
                }
            } else {
                console.error('无法加载默认测试文件，状态码:', xhr.status);
                alert('无法加载默认测试文件，请确保文件存在且可访问，错误代码: ' + xhr.status);
            }
        };
        
        xhr.onerror = function() {
            console.error('加载默认测试文件失败');
            alert('加载默认测试文件失败，请检查文件路径和服务器配置');
        };
        
        xhr.ontimeout = function() {
            console.error('加载默认测试文件超时');
            alert('加载默认测试文件超时，请检查网络连接');
        };
        
        xhr.send();
    } catch (error) {
        console.error('加载默认测试文件时发生异常:', error);
        alert('加载默认测试文件时发生异常: ' + error.message);
    }
};

/**
 * 处理用户选择的Excel文件
 * 1. 检查是否选择了文件
 * 2. 使用FileReader读取文件
 * 3. 解析Excel文件并显示结果
 */
export const handleFileUpload = async (file) => {
    if (!file) return;

    const XLSX = await ensureXlsx();
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetNames = workbook.SheetNames;
            const dataMap = {};

            sheetNames.forEach(name => {
                const worksheet = workbook.Sheets[name];
                // 将工作表转换为JSON数据（使用默认的header设置，这样会包含列名）
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                dataMap[name] = jsonData;
            });

            setState({
                file: { name: file.name, size: file.size },
                workbook: workbook,
                sheetNames: sheetNames,
                data: dataMap,
                activeSheetName: sheetNames[0]
            });

            processAllSheets(); // 处理所有工作表

        } catch (error) {
            console.error("Parsing error", error);
            alert("无法读取文件，请确认格式正确。");
        }
    };

    reader.readAsArrayBuffer(file);
};

/**
 * 处理所有工作表的数据（预先合并所有工作表的数据）
 */
export const processAllSheets = () => {
    const { data } = getState();
    
    if (!data) return;

    // Group rows by model across the entire sheet.
    const allMergedData = {};

    Object.keys(data).forEach((sheetName) => {
        const rawData = Array.isArray(data[sheetName]) ? data[sheetName] : [];
        const mergedByModel = new Map();
        const modelOrder = [];
        let currentModel = '';

        rawData.forEach((row) => {
            const rowModel = getRowModelValue(row);
            if (rowModel) {
                currentModel = rowModel;
            }

            if (!currentModel) {
                return;
            }

            if (!mergedByModel.has(currentModel)) {
                mergedByModel.set(currentModel, {});
                modelOrder.push(currentModel);
            }

            const mergedRow = mergedByModel.get(currentModel);
            mergeRowIntoTarget(mergedRow, row);
        });

        allMergedData[sheetName] = modelOrder.map((modelKey) => mergedByModel.get(modelKey));
    });

    // Persist the merged result and refresh the active sheet view.
    setState({
        originalMergedData: allMergedData
    });
    
    processActiveSheet();
};

export const processActiveSheet = () => {
    const { originalMergedData, activeSheetName, config } = getState();
    
    if (!activeSheetName || !originalMergedData[activeSheetName]) return;

    // 获取当前活动工作表的合并数据
    let currentSheetData = originalMergedData[activeSheetName];
    
    // 应用搜索过滤（只对型号列进行搜索）
    let filteredData = currentSheetData;
    if (config.searchQuery) {
        filteredData = filterData(currentSheetData, config.searchQuery, config.isPreciseSearch);
    }

    setState({
        processedData: filteredData,
        pagination: { ...getState().pagination, currentPage: 1, totalItems: filteredData.length }
    });
};

/**
 * 通用搜索过滤函数（只对型号列进行搜索）
 * @param {Array} data - 数据数组
 * @param {string} searchTerm - 搜索词
 * @param {boolean} isPrecise - 是否为精准查询
 * @returns {Array} 过滤后的数据
 */
export const filterData = (data, searchTerm, isPrecise = false) => {
    if (!searchTerm) {
        return data;
    }

    return data.filter(row => matchesModelQuery(row, searchTerm, isPrecise));
};

/**
 * 处理精准查询
 */
export const handlePreciseSearch = () => {
    const { config } = getState();
    setState({ config: { ...config, isPreciseSearch: true } });
    processActiveSheet();
};
