export const UI_TEXT = {
    common: {
        emptySheetList: '暂无数据<br>请上传文件',
        noSelectedFile: '未选择文件',
        emptyCompareCount: '0',
        emptyPageIndicator: '1 / 1',
        emptyPaginationInfo: '显示 0 - 0 条，共 0 条'
    },
    search: {
        precise: '精确查询',
        fuzzy: '模糊查询',
        preciseShort: '精确',
        fuzzyShort: '模糊'
    },
    displayMode: {
        average: '平均值',
        all: '参数'
    },
    actions: {
        selectAll: '全选',
        clear: '清空',
        compare: '对比',
        exportJson: '导出 JSON'
    },
    selection: {
        summary: (count) => `已选 ${count} 项`,
        nothingToAdd: '当前没有可添加的项目',
        addedToCompare: (count) => `已添加 ${count} 个项目到对比项`,
        nothingSelected: '当前没有选中的项目',
        clearedCompare: (count) => `已清空 ${count} 个对比项`
    },
    file: {
        confirmReset: '确定要清空当前所有数据吗？',
        noExportData: '暂无数据可导出',
        exportSuccess: '导出成功'
    },
    sheet: {
        selectPrompt: '请选择工作表',
        noSelection: '未选择数据'
    }
};
