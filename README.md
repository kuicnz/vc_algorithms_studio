# Algorithm Studio · 算法工作室

**把算法的每一步，变成看得见的过程。**

一个纯 HTML、CSS、JavaScript 实现的交互式算法演示网站。首版提供 **24 种常见算法、10 种代码语言**，在左侧展示代码，在右侧展示同步的数组、图或动态规划状态。界面向笑脸 Macintosh 时期的 System 7 / Mac OS 8–9 致敬：灰银色窗口、条纹标题栏、方形控件和蓝紫色选中状态。

[中文说明](#中文说明) · [English guide](#english-guide)

## 中文说明

### 功能

- 按类别浏览、按中文或英文名称搜索算法，支持直接访问算法链接，例如 `/#quick`。
- 代码在左、动画在右；每个步骤高亮对应操作的代码行，循环和分支会回到实际对应的位置。
- 播放、暂停、上一步、下一步、重置、拖动进度条，以及 0.5× / 1× / 2× / 4× 调速。
- 切换 JavaScript、TypeScript、Python、Java、C、C++、C#、Go、Rust、Swift，保留当前演示进度。语言偏好会在浏览器允许时保存到本地。
- 修改数组、查找目标、字符串、背包物品、硬币与金额，或使用随机示例。部分图算法可修改起点。
- 数组显示比较、交换和有序区；图显示访问顺序、候选集合、最短距离或生成树；动态规划显示当前单元格与依赖状态。
- 复制代码、键盘操作、专注模式、帮助窗口及适应手机的布局；尊重减少动态效果的系统设置。
- 页面运行时不依赖外部 API、CDN、在线字体或第三方 JavaScript 库。

### 算法目录

| 分类 / Category | 算法 / Algorithms |
| --- | --- |
| 排序 / Sorting · 8 | 冒泡 Bubble、选择 Selection、插入 Insertion、归并 Merge、快速 Quick、堆 Heap、计数 Counting、希尔 Shell |
| 搜索 / Searching · 5 | 顺序 Linear、二分 Binary、跳跃 Jump、插值 Interpolation、指数 Exponential |
| 图算法 / Graphs · 6 | 广度优先 BFS、深度优先 DFS、Dijkstra 最短路径、拓扑排序 Topological、Kruskal 最小生成树、Prim 最小生成树 |
| 动态规划 / Dynamic programming · 5 | 斐波那契 Fibonacci、0/1 背包 Knapsack、最长公共子序列 LCS、零钱兑换 Coin Change、编辑距离 Levenshtein |

### 本地运行

需要现代浏览器和 Python 3。网站无需安装依赖，也不需要构建：

```bash
git clone https://github.com/kuicnz/vc_algorithms.git
cd vc_algorithms
python3 -m http.server 8000
```

在浏览器访问 `http://localhost:8000`。也可以安装 Node.js 后使用 `npm start`（该命令依然需要 Python 3）。端口被占用时，可直接把 Python 命令中的 `8000` 改为其他端口。

请通过 HTTP 静态服务器打开页面；直接双击 HTML 使用 `file://` 可能被浏览器的 ES module 安全限制阻止。所有应用文件都可部署到支持静态文件的托管服务；无后端配置。

### 使用与输入范围

选择算法后，使用语言菜单、播放控制和「修改输入」。快捷键在输入框、按钮或弹窗获得焦点时不会抢占正常操作：

| 按键 | 功能 |
| --- | --- |
| `Space` | 播放 / 暂停 |
| `←` / `→` | 上一步 / 下一步 |
| `R` | 重置当前轨迹 |
| `/` | 在算法库聚焦搜索框 |

- 数组：1–18 个整数，范围 −99–99；计数排序只接受 0–99。逗号、中文逗号、空格均可分隔。
- 搜索：目标为 −999–999。除顺序搜索外，演示会先排序输入副本；返回的索引属于展示数组。搜索复杂度标注搜索阶段，未包含副本准备和排序开销。
- 图：使用 6 个节点 A–F 的固定图。拓扑排序使用有向无环图；其他算法使用非负权重的无向连通图。BFS、DFS、Dijkstra 和 Prim 可修改起点；Kruskal 和拓扑排序不依赖起点。
- 斐波那契：`n` 为 0–20。
- 背包：最多 6 件物品，重量 1–16，价值 0–99，容量 0–16；每件物品最多选一次。
- 字符串：每个字符串最多 10 个 ASCII 字符，区分大小写，支持空字符串。
- 零钱兑换：最多 6 种 1–20 的正整数面额，金额为 0–20；同种硬币可重复使用，不可达时返回 −1。

这是**预设算法的教学演示**：JavaScript 生成状态轨迹，其他语言显示等价代码并同步高亮，不会在浏览器中编译或执行这些语言，也不提供任意代码编辑。示例主要是函数片段；复制到独立程序时可能需要补充入口、导入或类型定义。图的部分语言示例使用整数节点编号，0–5 对应 A–F。Go 示例使用 `max` / `min` 时需要 Go 1.21 或更新版本。

### 文件结构

```text
index.html                   页面结构
css/styles.css               经典 Mac 风格与响应式布局
assets/happy-computer.svg    本地笑脸电脑图标
js/app.js                    导航、播放器、代码高亮与界面事件
js/catalog.js                算法和语言目录
js/inputs.js                 输入解析、边界校验和随机示例
js/renderers.js              数组、图、状态表和语法渲染
js/algorithms/sorting.js     排序轨迹与语言代码
js/algorithms/searching.js   搜索轨迹与语言代码
js/algorithms/graphs.js      图算法轨迹与语言代码
js/algorithms/dynamic.js     动态规划轨迹与语言代码
tests/algorithms.test.js     结果、边界、快照与行映射测试
tests/browser.mjs           真实浏览器交互和响应式测试
```

### 开发与验证

测试需要 Node.js 22 或更新版本，无需 `npm install`：

```bash
npm test
```

测试覆盖排序与搜索的随机输入和边界、动态规划参考结果、图算法最短路径与生成树、输入校验、快照隔离、10 种语言的行映射，以及显示的 JavaScript 代码与演示结果的一致性。

真实浏览器集成测试另外需要 Chromium：

```bash
npm run test:browser
# 浏览器不在 PATH 时，指定可执行文件：
CHROME_BIN=/path/to/chromium npm run test:browser
```

该测试自行启动临时静态服务器和无头浏览器，检查 **240 个算法与语言组合、720 个同步步骤状态**，以及搜索、分类、播放、暂停、输入修改、错误提示、帮助窗口和移动端溢出。截图写入命令输出所示的系统临时目录，浏览器和服务器在测试结束后退出。这个容器测试使用 Chromium 的 `--no-sandbox`；请只对可信的本仓库页面运行测试。

新增算法时，注册元数据、默认输入、`build(input)` 和全部 10 种语言的 `codes`。`build` 返回 `{ steps, result }`；每个步骤有语义标签 `tag`、说明 `description` 和独立快照 `state`。`codes[language]` 提供源代码 `source` 及从标签到 **从 1 开始的代码行号** 的 `tags`。条件分支与不同位置的操作应使用不同标签，避免一次高亮互斥分支。最后更新目录计数、输入校验及覆盖测试。

## English guide

### Overview

Algorithm Studio is a dependency-free static website for exploring **24 algorithms in 10 programming languages**. The code pane on the left and the visualization on the right stay synchronized as you step through an algorithm. Its silver-gray windows, striped title bars, square beveled controls, smiling computer icon, and indigo selection colors draw inspiration from System 7 and Mac OS 8–9.

Browse four categories, search Chinese or English names, choose a language, then play, pause, step backward or forward, reset, seek on the timeline, or adjust playback speed. Editable inputs and random examples let you explore different cases. Array bars show comparisons and writes; graphs show traversal, distances, and spanning trees; dynamic programming shows state tables and dependencies. The interface includes code copying, keyboard navigation, focus mode, responsive layouts, and reduced-motion support.

Available languages: **JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, and Swift**. The [shared algorithm table](#算法目录) lists every implemented algorithm.

### Run locally

Use a modern browser and Python 3. No installation or build is required:

```bash
git clone https://github.com/kuicnz/vc_algorithms.git
cd vc_algorithms
python3 -m http.server 8000
```

Open `http://localhost:8000`. Alternatively, run `npm start` with Node.js and Python 3 installed. Change the port in the Python command if needed. Serve the files over HTTP: opening `index.html` through `file://` may fail because the browser restricts ES module imports. Any static host can serve the site; no backend, external APIs, CDN, or remote fonts are required.

### Controls and scope

`Space` plays/pauses, arrow keys step, `R` resets, and `/` focuses catalog search. Shortcuts leave form controls and dialogs alone. Switching language preserves the current step; the browser remembers the selected language when local storage is available.

- Arrays contain 1–18 integers between −99 and 99; counting sort requires 0–99. Search targets can range from −999 to 999. Nonlinear search algorithms sort a copy first and return an index in the displayed array. Their complexity badges describe the search, excluding preparation and sorting.
- Graph algorithms use fixed six-node examples. Topological sorting uses a DAG. The other examples use a connected undirected graph with nonnegative weights. BFS, DFS, Dijkstra, and Prim let you change the starting node.
- Fibonacci accepts `n` from 0 to 20. Knapsack accepts up to six items, weights 1–16, values 0–99, and capacity 0–16. Strings contain up to ten case-sensitive ASCII characters and may be empty. Coin change accepts up to six denominations 1–20 and an amount 0–20, with unlimited coins per denomination.

These are **preset educational simulations**. JavaScript computes the state trace; each language supplies equivalent example code with operation-to-line mappings. The site does not compile other languages or execute arbitrary edited code. Snippets may require a program entry point, imports, or supporting types when copied into a standalone project. Some graph snippets use integer nodes 0–5 for A–F. Go snippets using built-in `max` or `min` require Go 1.21+.

### Development and tests

HTML, CSS, application JavaScript, input handling, visual renderers, and algorithm modules are kept separate; see the [file tree](#文件结构). Add algorithms by providing metadata, defaults, an immutable `{ steps, result }` trace builder, and all ten source snippets. Each step's semantic tag maps to 1-based source lines. Separate mutually exclusive branches into distinct tags, and extend the input validation and coverage tests.

With Node.js 22+:

```bash
npm test
```

The tests check algorithm results against independent references, randomized and boundary inputs, input preservation, snapshot isolation, language coverage, valid code-line mappings, renderer escaping, and agreement between displayed JavaScript and trace results.

With Chromium installed:

```bash
npm run test:browser
# Optional custom executable:
CHROME_BIN=/path/to/chromium npm run test:browser
```

The integration suite uses Node's native WebSocket and Chrome DevTools Protocol, starts its own temporary static server, and checks 240 algorithm/language combinations and 720 synchronized snapshots. It also tests catalog navigation, playback, stepping, seeking, editable inputs, validation, dialogs, mobile overflow, and console errors. Screenshots are stored in the printed temporary directory; test processes are cleaned up automatically. This container-oriented harness launches Chromium with `--no-sandbox`; run it only against the trusted repository pages.

## License / 许可

[MIT](LICENSE)
