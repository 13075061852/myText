# 数据管理

一个在浏览器中运行的 Excel 数据分析工具，支持工作表切换、型号搜索、分页浏览、冻结行列、参数展示、数据对比和 JSON 导出。

项目当前采用原生 HTML、CSS、JavaScript 实现，不依赖构建工具，适合快速打开、快速调试，也适合后续逐步工程化。

## 功能概览

- 导入 `.xlsx`、`.xls`、`.csv`
- 自动加载内置测试文件 `测试数据.xlsx`
- 多工作表切换
- 型号搜索
  - 模糊查询
  - 精确查询
- 分页浏览
- 冻结表头和左侧列
- 两种显示模式
  - `平均值`
  - `参数`
- 多条数据加入对比项并横向比较
- 导出当前结果为 JSON
- 深色 / 浅色主题切换
- 桌面端侧边栏与移动端抽屉布局

## 启动方式

项目自带一个简单的静态服务器：

```bash
node server.js
```

默认访问地址：

```text
http://localhost:8081/
```

页面加载完成后，会自动尝试读取根目录下的 `测试数据.xlsx`。

## 目录结构

当前目录已经按职责重新整理，根目录只保留入口、服务脚本、文档和测试数据。

```text
.
├─ index.html
├─ README.md
├─ server.js
├─ 测试数据.xlsx
└─ src
   ├─ app
   │  └─ main.js
   ├─ core
   │  ├─ state_manager.js
   │  └─ theme.js
   ├─ services
   │  └─ excel_service.js
   ├─ shared
   │  └─ data_utils.js
   ├─ styles
   │  ├─ base.css
   │  ├─ workspace.css
   │  ├─ table.css
   │  ├─ compare-dialog.css
   │  ├─ desktop.css
   │  └─ mobile.css
   └─ ui
      ├─ compare-dialog.js
      ├─ sidebar.js
      ├─ table.js
      └─ ui_controller.js
```

## 模块职责

### [index.html](/C:/Users/DELL/Desktop/编程项目/数据管理/index.html)

负责页面结构和静态挂载点，包括：

- 侧边栏
- 顶部工具栏
- 表格区域
- 分页区
- 对比弹窗

### [src/app/main.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/app/main.js)

应用入口，负责：

- 初始化主题
- 初始化 UI
- 绑定搜索、翻页、重置、导出、拖拽上传
- 触发默认测试文件加载

### [src/core/state_manager.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/core/state_manager.js)

全局状态中心，采用轻量 pub/sub 模式维护：

- 当前文件
- 工作表列表
- 当前激活工作表
- 当前处理结果
- 对比项
- 分页信息
- 显示配置

### [src/core/theme.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/core/theme.js)

负责深色 / 浅色主题切换和本地存储。

### [src/services/excel_service.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/services/excel_service.js)

负责：

- 读取 Excel / CSV
- 将工作表转成 JSON
- 合并实验行数据
- 根据搜索条件处理当前工作表

### [src/shared/data_utils.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/shared/data_utils.js)

负责共享工具逻辑，包括：

- 数值解析
- 平均值计算
- 搜索匹配
- 对比项判等
- 表格内容格式化

### [src/ui/ui_controller.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/ui/ui_controller.js)

负责页面级 UI 装配和状态联动。

### [src/ui/table.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/ui/table.js)

负责主表格渲染、选中状态、分页文案和冻结列偏移。

### [src/ui/sidebar.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/ui/sidebar.js)

负责左侧工作表列表和对比项列表。

### [src/ui/compare-dialog.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/ui/compare-dialog.js)

负责对比弹窗的内容渲染、分页和显示模式切换。



### [src/styles/base.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/base.css)

基础设计令牌和全局圆角、面板语义。

### [src/styles/workspace.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/workspace.css)

工作区布局、侧边栏、顶部工具栏、抽屉和通用面板样式。

### [src/styles/table.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/table.css)

主表格和空状态相关样式。

### [src/styles/compare-dialog.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/compare-dialog.css)

对比弹窗和分页区域样式。

### [src/styles/desktop.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/desktop.css)

桌面与宽屏适配规则。

### [src/styles/mobile.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/mobile.css)

移动端与窄屏适配规则。

## 当前数据规则

当前处理逻辑默认围绕以下字段工作：

- `型号`
- `批次`

系统会把连续多行实验数据合并为一条展示记录，并对数值类字段做聚合处理。若你的 Excel 表结构与此规则差异较大，需要同步调整 [src/services/excel_service.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/services/excel_service.js)。

## 已知限制

- 当前没有自动化测试
- 没有 `package.json`、ESLint、Prettier、构建流程
- `server.js` 仅适合本地开发
- 默认测试文件会自动加载，更适合开发环境
- 数据处理逻辑对表结构有一定假设，不是通用型 Excel 分析器
- 项目内仍存在部分历史文案编码问题，后续需要继续统一清理

## 后续优化建议

建议按以下顺序继续推进：

1. 继续拆分 [src/ui/ui_controller.js](/C:/Users/DELL/Desktop/编程项目/数据管理/src/ui/ui_controller.js)
2. 继续整理 [src/styles/workspace.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/workspace.css) 与 [src/styles/mobile.css](/C:/Users/DELL/Desktop/编程项目/数据管理/src/styles/mobile.css) 的覆盖链，进一步减少样式优先级竞争
3. 统一项目内中文文案编码
4. 给数据合并和格式化逻辑补单元测试
5. 将 CDN 依赖迁移到正式工程化方案

## 许可证

当前仓库中未看到明确的许可证声明。如需开源或分发，建议补充 `LICENSE` 文件。
