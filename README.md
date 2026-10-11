# Algorithm Studio · 算法工作室

**把算法的每一步，变成看得见的过程。**

一个纯 HTML、CSS、JavaScript 实现的交互式算法演示网站。提供 **28 种常见算法、10 种代码语言**，在左侧展示代码，在右侧展示同步的数组、图或动态规划状态。采用游戏像素风格、细长列表目录和本地像素字体，支持白色 / 黑色主题与中文 / English 界面随时切换。

[中文说明](#中文说明) · [English guide](#english-guide)

## 中文说明

### 功能

- 主页使用细长列表，按五个类别浏览、按中文或英文名称搜索算法，支持直接访问算法链接，例如 `/#quick`。
- 代码在左、动画在右；每个步骤高亮对应操作的代码行，循环和分支会回到实际对应的位置。
- 播放、暂停、上一步、下一步、重置、拖动进度条，以及 0.5× / 1× / 2× / 4× 调速。播放完成后保留结果 1.2 秒，再自动从头重播；暂停、手动拖动或离开页面会停止循环。
- 首次打开默认使用黑色主题，之后记住用户选择。右上角随时切换白色 / 黑色主题、中文 / English 界面和音效。主题、界面语言、代码语言切换均保留当前进度；界面语言还会翻译算法简介、步骤说明、表格标签、帮助和输入错误。
- Web Audio 合成选择、点击、代码步骤与完成音效；首次点击或键盘交互后启用，可随时静音。无需音频下载。
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
| 图算法 / Graphs · 7 | 广度优先 BFS、深度优先 DFS、Dijkstra 最短路径、拓扑排序 Topological、Kruskal 最小生成树、Prim 最小生成树、A* 寻路 Pathfinding |
| 动态规划 / Dynamic programming · 5 | 斐波那契 Fibonacci、0/1 背包 Knapsack、最长公共子序列 LCS、零钱兑换 Coin Change、编辑距离 Levenshtein |
| 贪心 / Greedy · 3 | 活动选择 Activity Selection、分数背包 Fractional Knapsack、贪心找零 Greedy Coin Change |

### 本地运行

需要现代浏览器和 Python 3。网站无需安装依赖，也不需要构建：

```bash
git clone https://github.com/kuicnz/vc_algorithms.git
cd vc_algorithms
python3 -m http.server 8000
```

在浏览器访问 `http://localhost:8000`。也可以安装 Node.js 后使用 `npm start`（该命令依然需要 Python 3）。端口被占用时，可直接把 Python 命令中的 `8000` 改为其他端口。

MacBook 下载 ZIP 后：解压文件，打开终端，输入 `cd ` 后把**包含 `index.html` 的文件夹**拖入终端并回车，再执行上述 Python 命令。不要在个人主目录 `~` 启动，否则看到的是目录列表。结束后按 `Control+C` 停止服务器。

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
- A*：使用 3×3 网格中的 8 个可通行节点，中央 E 为障碍；可修改起点与终点，包括起终点相同的情况。边权为 1，曼哈顿启发式可采纳且一致；按 `f = g + h` 选择开放节点，展示 g/h/f 表与重建路径。
- 贪心活动选择：最多 8 个活动，时间为 0–24，每个开始时间必须早于对应的结束时间。
- 分数背包：最多 6 件可分割物品，重量 1–50、价值 1–200，容量 0–100；按价值密度选择。
- 贪心找零：最多 6 种面额（1–50），金额 0–100。对任意面额不保证最优，也可能留下余数；例如面额 `[1,3,4]`、金额 6，贪心需要 3 枚，而动态规划只需 2 枚。
- 斐波那契：`n` 为 0–20。
- 背包：最多 6 件物品，重量 1–16，价值 0–99，容量 0–16；每件物品最多选一次。
- 字符串：每个字符串最多 10 个 ASCII 字符，区分大小写，支持空字符串。
- 零钱兑换：最多 6 种 1–20 的正整数面额，金额为 0–20；同种硬币可重复使用，不可达时返回 −1。

这是**预设算法的教学演示**：JavaScript 生成状态轨迹，其他语言显示等价代码并同步高亮，不会在浏览器中编译或执行这些语言，也不提供任意代码编辑。示例主要是函数片段；复制到独立程序时可能需要补充入口、导入或类型定义。图的部分语言示例使用整数节点编号，0–5 对应 A–F。Go 示例使用 `max` / `min` 时需要 Go 1.21 或更新版本。

### 文件结构

```text
index.html                   页面结构
css/styles.css               白黑像素主题、列表与响应式布局
assets/pixel-mark.svg        本地像素图标
assets/fonts/               像素字体及 SIL OFL 许可
js/app.js                    导航、播放器、代码高亮与界面事件
js/catalog.js                算法和语言目录
js/inputs.js                 输入解析、双语错误和随机示例
js/i18n.js                   界面双语、帮助与偏好保存
js/trace-i18n.js             算法简介、步骤和状态标签翻译
js/sound.js                  Web Audio 像素音效
js/renderers.js              数组、图、状态表和语法渲染
js/algorithms/sorting.js     排序轨迹与语言代码
js/algorithms/searching.js   搜索轨迹与语言代码
js/algorithms/graphs.js      图算法轨迹与语言代码
js/algorithms/dynamic.js     动态规划轨迹与语言代码
js/algorithms/astar.js       A* 寻路、启发式与路径重建
js/algorithms/greedy.js      三种贪心轨迹与语言代码
tests/algorithms.test.js     结果、边界、快照与行映射测试
tests/browser.mjs           真实浏览器交互和响应式测试
```

### 开发与验证

测试需要 Node.js 22 或更新版本，无需 `npm install`：

```bash
npm test
```

95 项测试覆盖排序与搜索的随机输入和边界、动态规划参考结果、图算法最短路径与生成树、A* 全部 64 个起终点组合及绕行 / 无路径、贪心独立参考结果与非最优反例、双语翻译、输入校验、快照隔离、音效合成与静音，以及显示的 JavaScript 代码与演示结果的一致性。

真实浏览器集成测试另外需要 Chromium：

```bash
npm run test:browser
# 浏览器不在 PATH 时，指定可执行文件：
CHROME_BIN=/path/to/chromium npm run test:browser
```

该测试自行启动临时静态服务器和无头浏览器，检查 **280 个算法与语言组合、840 个同步步骤状态**，以及 56 个英文界面状态、自动重播与暂停取消、搜索、分类、输入修改、主题 / 语言切换保持进度与未提交输入、偏好持久化、静音、帮助窗口和两种主题 / 语言下的手机布局。截图写入命令输出所示的系统临时目录，浏览器和服务器在测试结束后退出。这个容器测试使用 Chromium 的 `--no-sandbox`；请只对可信的本仓库页面运行测试。

新增算法时，注册元数据、默认输入、`build(input)` 和全部 10 种语言的 `codes`。`build` 返回 `{ steps, result }`；每个步骤有语义标签 `tag`、双语说明 `description` / `descriptionEn` 和独立快照 `state`。新算法提供 `summaryEn`，表格可提供 `rowLabelsEn` / `columnLabelsEn` / `matrixEn`，补充说明可提供 `noteEn`。`codes[language]` 提供源代码 `source` 及从标签到 **从 1 开始的代码行号** 的 `tags`。条件分支与不同位置的操作应使用不同标签，避免一次高亮互斥分支。最后更新目录计数、输入校验及覆盖测试。

## English guide

### Overview

Algorithm Studio is a dependency-free static website for exploring **28 algorithms in 10 programming languages**. The code pane on the left and the visualization on the right stay synchronized as you step through an algorithm. The game-inspired pixel interface uses a compact list catalogue, hard borders, pixel motifs, and a bundled local pixel font. The first visit defaults to the dark theme; subsequent visits remember your choice. Top-right controls switch light/dark themes, Chinese/English interface language, and sound at any time.

Browse five categories, search Chinese or English names, choose a language, then play, pause, step backward or forward, reset, seek on the timeline, or adjust playback speed. Editable inputs and random examples let you explore different cases. Array bars show comparisons and writes; graphs show traversal, distances, and spanning trees; dynamic programming shows state tables and dependencies. Playback holds the completed result for 1.2 seconds and automatically loops. Pause, seeking, navigation, or hiding the browser tab stops playback. The interface includes code copying, keyboard navigation, focus mode, responsive layouts, and reduced-motion support. Selection, click, execution, and completion sounds are synthesized using Web Audio after a user gesture; mute them at the top right.

Available languages: **JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, and Swift**. The [shared algorithm table](#算法目录) lists every implemented algorithm.

### Run locally

Use a modern browser and Python 3. No installation or build is required:

```bash
git clone https://github.com/kuicnz/vc_algorithms.git
cd vc_algorithms
python3 -m http.server 8000
```

On a MacBook, extract the ZIP, type `cd ` in Terminal, drag the folder containing `index.html` into Terminal, press Return, and run the Python command. Start it from the project directory, not `~`. Stop it with `Control+C`.

Open `http://localhost:8000`. Alternatively, run `npm start` with Node.js and Python 3 installed. Change the port in the Python command if needed. Serve the files over HTTP: opening `index.html` through `file://` may fail because the browser restricts ES module imports. Any static host can serve the site; no backend, external APIs, CDN, or remote fonts are required.

### Controls and scope

`Space` plays/pauses, arrow keys step, `R` resets, and `/` focuses catalog search. Shortcuts leave form controls and dialogs alone. Switching theme, interface language, or code language preserves the current step and pending input edits. Algorithm summaries, step explanations, table labels, input errors, and help all support English. The browser remembers theme, both language preferences, and mute state when local storage is available.

- Arrays contain 1–18 integers between −99 and 99; counting sort requires 0–99. Search targets can range from −999 to 999. Nonlinear search algorithms sort a copy first and return an index in the displayed array. Their complexity badges describe the search, excluding preparation and sorting.
- Graph algorithms use fixed six-node examples. Topological sorting uses a DAG. The other examples use a connected undirected graph with nonnegative weights. BFS, DFS, Dijkstra, and Prim let you change the starting node.
- A* uses an eight-node outer ring of a 3×3 grid with the center blocked, unit edge costs, and an admissible, consistent Manhattan heuristic. Both endpoints are editable. Open/closed sets, g/h/f values, and path reconstruction are visible.
- Activity selection accepts up to 8 activities, with times 0–24 and start < end. Fractional knapsack accepts up to 6 divisible items, weights 1–50, values 1–200, capacity 0–100. Greedy coin change accepts denominations 1–50 and amount 0–100; it can be suboptimal or fail to make a reachable amount. For `[1,3,4]` and amount 6, greedy uses 3 coins while dynamic programming uses 2.
- Fibonacci accepts `n` from 0 to 20. Knapsack accepts up to six items, weights 1–16, values 0–99, and capacity 0–16. Strings contain up to ten case-sensitive ASCII characters and may be empty. Coin change accepts up to six denominations 1–20 and an amount 0–20, with unlimited coins per denomination.

These are **preset educational simulations**. JavaScript computes the state trace; each language supplies equivalent example code with operation-to-line mappings. The site does not compile other languages or execute arbitrary edited code. Snippets may require a program entry point, imports, or supporting types when copied into a standalone project. Some graph snippets use integer nodes 0–5 for A–F. Go snippets using built-in `max` or `min` require Go 1.21+.

### Development and tests

HTML, CSS, application JavaScript, input handling, visual renderers, and algorithm modules are kept separate; see the [file tree](#文件结构). Add algorithms by providing metadata, defaults, an immutable `{ steps, result }` trace builder, and all ten source snippets. Each step's semantic tag maps to 1-based source lines. Separate mutually exclusive branches into distinct tags, and extend the input validation and coverage tests.

With Node.js 22+:

```bash
npm test
```

The 95 tests check independent algorithm references, all 64 A* endpoint pairs plus detours and no-path cases, greedy optimality and counterexamples, randomized and boundary inputs, snapshot isolation, bilingual metadata and traces, input validation, sound synthesis/muting, line mappings, and displayed-JavaScript agreement.

With Chromium installed:

```bash
npm run test:browser
# Optional custom executable:
CHROME_BIN=/path/to/chromium npm run test:browser
```

The integration suite uses Node's native WebSocket and Chrome DevTools Protocol, starts its own temporary static server, and checks 280 algorithm/language combinations and 840 synchronized snapshots. It additionally checks 56 English UI states, automatic replay and cancellation, catalog navigation, pending input preservation, persisted theme/locale/mute preferences, playback controls, validation, dialogs, mobile utilities in both themes/languages, and console errors. Screenshots are stored in the printed temporary directory; test processes are cleaned up automatically. This container-oriented harness launches Chromium with `--no-sandbox`; run it only against the trusted repository pages.

## License / 许可

Application code: [MIT](LICENSE). The bundled [Press Start 2P](https://github.com/google/fonts/tree/main/ofl/pressstart2p) font is separately licensed under [SIL OFL 1.1](assets/fonts/OFL.txt).

应用代码使用 MIT 许可；打包的 Press Start 2P 像素字体使用单独的 SIL OFL 1.1 许可，版权及许可文件保存在 `assets/fonts/OFL.txt`。
