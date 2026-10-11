// Every trace is computed from the graph, then copied into immutable snapshots.
const NODES = [
  { id: 'A', x: 0.1, y: 0.5 }, { id: 'B', x: 0.32, y: 0.2 },
  { id: 'C', x: 0.32, y: 0.8 }, { id: 'D', x: 0.62, y: 0.2 },
  { id: 'E', x: 0.62, y: 0.8 }, { id: 'F', x: 0.9, y: 0.5 },
];
const EDGES = [
  ['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5],
  ['C', 'D', 8], ['C', 'E', 10], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 3],
].map(([from, to, weight]) => ({ from, to, weight }));
const DAG_EDGES = [
  ['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F'],
].map(([from, to]) => ({ from, to, weight: 1 }));
const UNDIRECTED = { nodes: NODES, edges: EDGES, directed: false };
const DAG = { nodes: NODES, edges: DAG_EDGES, directed: true };

function annotated(raw) {
  const tags = {};
  const source = raw.trim().split('\n').map((line, index) => {
    let clean = line.replace(/\[\[(\w+)\]\]/g, (_, tag) => {
      (tags[tag] ||= []).push(index + 1);
      return '';
    });
    clean = clean.replace(/\s*(?:\/\/|#)\s*@([a-zA-Z,]+)\s*$/, (_, names) => {
      for (const tag of names.split(',')) (tags[tag] ||= []).push(index + 1);
      return '';
    });
    return clean;
  }).join('\n');
  return { source, tags };
}

function context(input = {}, graph = UNDIRECTED) {
  const ids = graph.nodes.map(node => node.id);
  const start = ids.includes(input.start) ? input.start : 'A';
  const adjacent = Object.fromEntries(ids.map(id => [id, []]));
  for (const edge of graph.edges) {
    adjacent[edge.from].push({ to: edge.to, weight: edge.weight });
    if (!graph.directed) adjacent[edge.to].push({ to: edge.from, weight: edge.weight });
  }
  for (const neighbors of Object.values(adjacent)) neighbors.sort((a, b) => a.to.localeCompare(b.to));
  const steps = [];
  const visited = new Set(), frontier = [], order = [], selectedEdges = [];
  function step(tag, description, extras = {}) {
    const state = {
      type: 'graph', nodes: graph.nodes, edges: graph.edges, directed: graph.directed,
      active: [], visited: [...visited], frontier: [...frontier], activeEdges: [],
      selectedEdges, order, metrics: { visited: visited.size }, ...extras,
    };
    steps.push({ tag, description, state: JSON.parse(JSON.stringify(state)) });
  }
  return { ids, start, adjacent, steps, visited, frontier, order, selectedEdges, step };
}

function bfs(input) {
  const c = context(input);
  const { start, adjacent, visited, frontier, order, step, steps } = c;
  visited.add(start); frontier.push(start);
  step('init', `将起点 ${start} 放入队列并标记为已发现。队列遵循先进先出。`);
  while (frontier.length) {
    const current = frontier.shift(); order.push(current);
    step('visit', `从队首取出 ${current}，加入遍历顺序。`, { active: [current] });
    for (const edge of adjacent[current]) {
      step('inspect', `检查 ${current} 的相邻节点 ${edge.to}。`, { active: [current, edge.to], activeEdges: [[current, edge.to]] });
      if (visited.has(edge.to)) {
        step('skip', `${edge.to} 已被发现，避免重复加入队列。`, { active: [edge.to] });
      } else {
        visited.add(edge.to); frontier.push(edge.to);
        step('enqueue', `发现 ${edge.to}，标记后加入队尾。`, { active: [edge.to], activeEdges: [[current, edge.to]] });
      }
    }
  }
  step('finish', `广度优先遍历完成：${order.join(' → ')}。`);
  return { steps, result: [...order] };
}

function dfs(input) {
  const { start, adjacent, visited, frontier, order, step, steps } = context(input);
  frontier.push(start);
  step('init', `将起点 ${start} 放入栈。栈遵循后进先出，显示顺序从栈底到栈顶。`);
  while (frontier.length) {
    const current = frontier.pop();
    if (visited.has(current)) {
      step('skipVisited', `${current} 已访问，跳过这个重复的栈条目。`, { active: [current] });
      continue;
    }
    visited.add(current); order.push(current);
    step('visit', `弹出栈顶 ${current}，首次访问并加入遍历顺序。`, { active: [current] });
    // Reverse insertion means the alphabetically first neighbor is visited first.
    for (const edge of [...adjacent[current]].reverse()) {
      step('inspect', `倒序检查 ${current} 的相邻节点 ${edge.to}。`, { active: [current, edge.to], activeEdges: [[current, edge.to]] });
      if (visited.has(edge.to)) {
        step('skipNeighbor', `${edge.to} 已访问，无需再压入栈。`, { active: [edge.to] });
      } else {
        frontier.push(edge.to);
        step('enqueue', `将 ${edge.to} 压入栈，稍后从栈顶继续深入。`, { active: [edge.to], activeEdges: [[current, edge.to]] });
      }
    }
  }
  step('finish', `深度优先遍历完成：${order.join(' → ')}。`);
  return { steps, result: [...order] };
}

function dijkstra(input) {
  const { ids, start, adjacent, visited, frontier, order, selectedEdges, step, steps } = context(input);
  const distances = Object.fromEntries(ids.map(id => [id, Infinity]));
  const parents = {};
  distances[start] = 0;
  function state(extras = {}) {
    frontier.splice(0, frontier.length, ...ids.filter(id => !visited.has(id) && distances[id] < Infinity));
    const labels = Object.fromEntries(ids.map(id => [id, distances[id] === Infinity ? '∞' : distances[id]]));
    return {
      distances: labels,
      table: { columns: ['节点', '最短距离', '前驱'], rows: ids.map(id => [id, labels[id], parents[id] || '—']) },
      ...extras,
    };
  }
  step('init', `将 ${start} 的距离设为 0，其余设为无穷大。图中所有边权非负。`, state());
  while (visited.size < ids.length) {
    let current = null;
    for (const id of ids) if (!visited.has(id) && (current === null || distances[id] < distances[current])) current = id;
    if (current === null || distances[current] === Infinity) break;
    step('select', `选择尚未确定且距离最小的节点 ${current}（${distances[current]}）。`, state({ active: [current] }));
    for (const edge of adjacent[current]) {
      if (visited.has(edge.to)) continue;
      const candidate = distances[current] + edge.weight;
      step('inspect', `尝试 ${current} → ${edge.to}：${distances[current]} + ${edge.weight} = ${candidate}。`, state({ active: [current, edge.to], activeEdges: [[current, edge.to]] }));
      if (candidate < distances[edge.to]) {
        distances[edge.to] = candidate; parents[edge.to] = current;
        selectedEdges.splice(0, selectedEdges.length, ...Object.entries(parents).map(([to, from]) => [from, to]));
        step('relax', `新路径更短，更新 ${edge.to} 的距离为 ${candidate}，前驱为 ${current}。`, state({ active: [edge.to], activeEdges: [[current, edge.to]] }));
      }
    }
    visited.add(current); order.push(current);
    step('settle', `${current} 的最短距离已确定为 ${distances[current]}。`, state({ active: [current] }));
  }
  step('finish', `从 ${start} 出发的最短距离计算完成。`, state());
  return { steps, result: { distances: { ...distances }, parents: { ...parents } } };
}

function topological(input) {
  const { ids, adjacent, visited, frontier, order, step, steps } = context(input, DAG);
  const indegree = Object.fromEntries(ids.map(id => [id, 0]));
  for (const edge of DAG.edges) indegree[edge.to]++;
  const state = extras => ({ table: { columns: ['节点', '当前入度'], rows: ids.map(id => [id, indegree[id]]) }, ...extras });
  step('init', '统计每个节点的入度。拓扑排序要求有向无环图。', state());
  frontier.push(...ids.filter(id => indegree[id] === 0));
  step('ready', `将所有入度为 0 的节点加入队列：${frontier.join('、')}。`, state());
  while (frontier.length) {
    const current = frontier.shift(); visited.add(current); order.push(current);
    step('select', `取出 ${current} 放入拓扑顺序；它的前置节点都已处理。`, state({ active: [current] }));
    for (const edge of adjacent[current]) {
      indegree[edge.to]--;
      step('inspect', `移除 ${current} → ${edge.to} 的影响，将 ${edge.to} 的入度减到 ${indegree[edge.to]}。`, state({ active: [current, edge.to], activeEdges: [[current, edge.to]] }));
      if (indegree[edge.to] === 0) {
        frontier.push(edge.to);
        step('enqueue', `${edge.to} 入度变为 0，加入队尾等待处理。`, state({ active: [edge.to] }));
      }
    }
  }
  step('finish', order.length === ids.length ? `拓扑排序完成：${order.join(' → ')}。` : '存在环，无法得到完整拓扑顺序。', state());
  return { steps, result: [...order] };
}

function kruskal(input) {
  const { ids, visited, selectedEdges, step, steps } = context(input);
  const parent = Object.fromEntries(ids.map(id => [id, id]));
  const rank = Object.fromEntries(ids.map(id => [id, 0]));
  const find = id => parent[id] === id ? id : (parent[id] = find(parent[id]));
  const sorted = [...EDGES].sort((a, b) => a.weight - b.weight || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  let totalWeight = 0;
  const state = extras => ({ metrics: { visited: visited.size, totalWeight }, ...extras });
  step('init', '将边按权重升序排列；并查集开始时每个节点独立。', state({ table: { columns: ['边', '权重'], rows: sorted.map(edge => [`${edge.from}–${edge.to}`, edge.weight]) } }));
  for (const edge of sorted) {
    step('inspect', `检查权重为 ${edge.weight} 的边 ${edge.from}–${edge.to}。`, state({ active: [edge.from, edge.to], activeEdges: [[edge.from, edge.to]] }));
    let a = find(edge.from), b = find(edge.to);
    if (a === b) {
      step('reject', '两端已属于同一连通分量，加入这条边会产生环。', state({ activeEdges: [[edge.from, edge.to]] }));
      continue;
    }
    if (rank[a] < rank[b]) [a, b] = [b, a];
    parent[b] = a; if (rank[a] === rank[b]) rank[a]++;
    selectedEdges.push([edge.from, edge.to]); totalWeight += edge.weight;
    visited.add(edge.from); visited.add(edge.to);
    step('accept', `合并两个连通分量，选中 ${edge.from}–${edge.to}；总权重 ${totalWeight}。`, state({ active: [edge.from, edge.to], activeEdges: [[edge.from, edge.to]] }));
    if (selectedEdges.length === ids.length - 1) break;
  }
  step('finish', `最小生成树包含 ${selectedEdges.length} 条边，总权重 ${totalWeight}。`, state());
  return { steps, result: { edges: selectedEdges.map(edge => [...edge]), totalWeight } };
}

function prim(input) {
  const { ids, start, visited, selectedEdges, order, step, steps } = context(input);
  let totalWeight = 0;
  visited.add(start); order.push(start);
  const state = extras => ({ metrics: { visited: visited.size, totalWeight }, ...extras });
  step('init', `从 ${start} 开始生长最小生成树，每次选跨越已选节点集合的最轻边。`, state({ active: [start] }));
  while (visited.size < ids.length) {
    let best = null;
    for (const edge of EDGES) {
      step('inspect', `检查 ${edge.from}–${edge.to}（权重 ${edge.weight}）是否跨越当前集合。`, state({ activeEdges: [[edge.from, edge.to]] }));
      const crosses = visited.has(edge.from) !== visited.has(edge.to);
      if (!crosses) {
        step('reject', '这条边没有连接集合内外两个节点，不能扩展当前树。', state({ activeEdges: [[edge.from, edge.to]] }));
        continue;
      }
      if (best === null || edge.weight < best.weight) best = edge;
    }
    if (!best) break;
    const next = visited.has(best.from) ? best.to : best.from;
    visited.add(next); order.push(next);
    selectedEdges.push([best.from, best.to]); totalWeight += best.weight;
    step('accept', `选择最轻的跨集合边 ${best.from}–${best.to}，加入节点 ${next}；总权重 ${totalWeight}。`, state({ active: [next], activeEdges: [[best.from, best.to]] }));
  }
  step('finish', `最小生成树包含 ${selectedEdges.length} 条边，总权重 ${totalWeight}。`, state());
  return { steps, result: { edges: selectedEdges.map(edge => [...edge]), totalWeight } };
}

const rawCodes = {};
rawCodes.bfs = {
  javascript: `function bfs(graph, start) {
  const queue = [start], seen = new Set([start]), order = []; [[init]]
  while (queue.length) {
    const u = queue.shift(); order.push(u); [[visit]]
    for (const v of graph[u]) { [[inspect]]
      if (seen.has(v)) continue; [[skip]]
      seen.add(v); queue.push(v); [[enqueue]]
    }
  }
  return order; [[finish]]
}`,
  python: `from collections import deque

def bfs(graph, start):
    queue, seen, order = deque([start]), {start}, [] [[init]]
    while queue:
        u = queue.popleft(); order.append(u) [[visit]]
        for v in graph[u]: [[inspect]]
            if v in seen:
                continue [[skip]]
            seen.add(v); queue.append(v) [[enqueue]]
    return order [[finish]]`,
  java: `import java.util.*;

static List<Integer> bfs(int[][] graph, int start) {
    Queue<Integer> queue = new ArrayDeque<>();
    boolean[] seen = new boolean[graph.length];
    List<Integer> order = new ArrayList<>();
    queue.add(start); seen[start] = true; [[init]]
    while (!queue.isEmpty()) {
        int u = queue.remove(); order.add(u); [[visit]]
        for (int v : graph[u]) { [[inspect]]
            if (seen[v]) continue; [[skip]]
            seen[v] = true; queue.add(v); [[enqueue]]
        }
    }
    return order; [[finish]]
}`,
  c: `// Vertices are indices 0..n-1; graph[u][v] != 0 denotes an edge.
#define MAX 64
int bfs(int graph[MAX][MAX], int n, int start, int order[MAX]) {
    int queue[MAX], seen[MAX] = {0}, head = 0, tail = 0, count = 0;
    queue[tail++] = start; seen[start] = 1; [[init]]
    while (head < tail) {
        int u = queue[head++]; order[count++] = u; [[visit]]
        for (int v = 0; v < n; v++) {
            if (!graph[u][v]) continue; [[inspect]]
            if (seen[v]) continue; [[skip]]
            seen[v] = 1; queue[tail++] = v; [[enqueue]]
        }
    }
    return count; [[finish]]
}`,
  cpp: `#include <vector>
#include <queue>
using namespace std;

vector<int> bfs(const vector<vector<int>>& graph, int start) {
    queue<int> pending; vector<bool> seen(graph.size(), false);
    vector<int> order; pending.push(start); seen[start] = true; [[init]]
    while (!pending.empty()) {
        int u = pending.front(); pending.pop(); order.push_back(u); [[visit]]
        for (int v : graph[u]) { [[inspect]]
            if (seen[v]) continue; [[skip]]
            seen[v] = true; pending.push(v); [[enqueue]]
        }
    }
    return order; [[finish]]
}`,
};
rawCodes.bfs.typescript = rawCodes.bfs.javascript
  .replace('function bfs(graph, start)', 'function bfs(graph: Record<string, string[]>, start: string): string[]')
  .replace('order = []', 'order: string[] = []')
  .replace('queue.shift()', 'queue.shift()!');

rawCodes.dfs = {
  javascript: `function dfs(graph, start) {
  const stack = [start], seen = new Set(), order = []; [[init]]
  while (stack.length) {
    const u = stack.pop();
    if (seen.has(u)) continue; [[skipVisited]]
    seen.add(u); order.push(u); [[visit]]
    for (const v of [...graph[u]].reverse()) { [[inspect]]
      if (seen.has(v)) continue; [[skipNeighbor]]
      stack.push(v); [[enqueue]]
    }
  }
  return order; [[finish]]
}`,
  python: `def dfs(graph, start):
    stack, seen, order = [start], set(), [] [[init]]
    while stack:
        u = stack.pop()
        if u in seen:
            continue [[skipVisited]]
        seen.add(u); order.append(u) [[visit]]
        for v in reversed(graph[u]): [[inspect]]
            if v in seen:
                continue [[skipNeighbor]]
            stack.append(v) [[enqueue]]
    return order [[finish]]`,
  java: `import java.util.*;

static List<Integer> dfs(int[][] graph, int start) {
    Deque<Integer> stack = new ArrayDeque<>();
    boolean[] seen = new boolean[graph.length];
    List<Integer> order = new ArrayList<>(); stack.push(start); [[init]]
    while (!stack.isEmpty()) {
        int u = stack.pop();
        if (seen[u]) continue; [[skipVisited]]
        seen[u] = true; order.add(u); [[visit]]
        for (int i = graph[u].length - 1; i >= 0; i--) { [[inspect]]
            int v = graph[u][i];
            if (seen[v]) continue; [[skipNeighbor]]
            stack.push(v); [[enqueue]]
        }
    }
    return order; [[finish]]
}`,
  c: `#define MAX 64
int dfs(int graph[MAX][MAX], int n, int start, int order[MAX]) {
    int stack[MAX * MAX], seen[MAX] = {0}, top = 0, count = 0;
    stack[top++] = start; [[init]]
    while (top > 0) {
        int u = stack[--top];
        if (seen[u]) continue; [[skipVisited]]
        seen[u] = 1; order[count++] = u; [[visit]]
        for (int v = n - 1; v >= 0; v--) {
            if (!graph[u][v]) continue; [[inspect]]
            if (seen[v]) continue; [[skipNeighbor]]
            stack[top++] = v; [[enqueue]]
        }
    }
    return count; [[finish]]
}`,
  cpp: `#include <vector>
using namespace std;

vector<int> dfs(const vector<vector<int>>& graph, int start) {
    vector<int> stack{start}, order; vector<bool> seen(graph.size(), false); [[init]]
    while (!stack.empty()) {
        int u = stack.back(); stack.pop_back();
        if (seen[u]) continue; [[skipVisited]]
        seen[u] = true; order.push_back(u); [[visit]]
        for (auto it = graph[u].rbegin(); it != graph[u].rend(); ++it) { [[inspect]]
            if (seen[*it]) continue; [[skipNeighbor]]
            stack.push_back(*it); [[enqueue]]
        }
    }
    return order; [[finish]]
}`,
};
rawCodes.dfs.typescript = rawCodes.dfs.javascript
  .replace('function dfs(graph, start)', 'function dfs(graph: Record<string, string[]>, start: string): string[]')
  .replace('new Set()', 'new Set<string>()')
  .replace('order = []', 'order: string[] = []')
  .replace('stack.pop()', 'stack.pop()!');

rawCodes.dijkstra = {
  javascript: `// graph[u] contains { to, weight }; every weight is nonnegative.
function dijkstra(graph, start) {
  const nodes = Object.keys(graph), done = new Set();
  const dist = Object.fromEntries(nodes.map(v => [v, Infinity]));
  dist[start] = 0; [[init]]
  while (done.size < nodes.length) {
    let u;
    for (const v of nodes)
      if (!done.has(v) && (u === undefined || dist[v] < dist[u])) u = v; [[select]]
    if (u === undefined || dist[u] === Infinity) break;
    for (const { to: v, weight } of graph[u]) {
      if (done.has(v)) continue;
      const candidate = dist[u] + weight; [[inspect]]
      if (candidate < dist[v]) dist[v] = candidate; [[relax]]
    }
    done.add(u); [[settle]]
  }
  return dist; [[finish]]
}`,
  python: `def dijkstra(graph, start):
    done, dist = set(), {v: float('inf') for v in graph}
    dist[start] = 0 [[init]]
    while len(done) < len(graph):
        u = min((v for v in graph if v not in done), key=dist.get) [[select]]
        if dist[u] == float('inf'):
            break
        for v, weight in graph[u]:
            if v in done:
                continue
            candidate = dist[u] + weight [[inspect]]
            if candidate < dist[v]:
                dist[v] = candidate [[relax]]
        done.add(u) [[settle]]
    return dist [[finish]]`,
  java: `import java.util.*;

// Positive weights; zero denotes no edge.
static int[] dijkstra(int[][] weights, int start) {
    int n = weights.length; boolean[] done = new boolean[n];
    int[] dist = new int[n]; Arrays.fill(dist, Integer.MAX_VALUE);
    dist[start] = 0; [[init]]
    for (int k = 0; k < n; k++) {
        int u = -1;
        for (int v = 0; v < n; v++)
            if (!done[v] && (u < 0 || dist[v] < dist[u])) u = v; [[select]]
        if (u < 0 || dist[u] == Integer.MAX_VALUE) break;
        for (int v = 0; v < n; v++) {
            if (done[v] || weights[u][v] == 0) continue;
            int candidate = dist[u] + weights[u][v]; [[inspect]]
            if (candidate < dist[v]) dist[v] = candidate; [[relax]]
        }
        done[u] = true; [[settle]]
    }
    return dist; [[finish]]
}`,
  c: `#include <limits.h>
#define MAX 64
void dijkstra(int weights[MAX][MAX], int n, int start, int dist[MAX]) {
    int done[MAX] = {0};
    for (int v = 0; v < n; v++) dist[v] = INT_MAX;
    dist[start] = 0; [[init]]
    for (int k = 0; k < n; k++) {
        int u = -1;
        for (int v = 0; v < n; v++)
            if (!done[v] && (u < 0 || dist[v] < dist[u])) u = v; [[select]]
        if (u < 0 || dist[u] == INT_MAX) break;
        for (int v = 0; v < n; v++) {
            if (done[v] || weights[u][v] == 0) continue;
            int candidate = dist[u] + weights[u][v]; [[inspect]]
            if (candidate < dist[v]) dist[v] = candidate; [[relax]]
        }
        done[u] = 1; [[settle]]
    }
    return; [[finish]]
}`,
  cpp: `#include <vector>
#include <limits>
#include <utility>
using namespace std;

vector<int> dijkstra(const vector<vector<pair<int,int>>>& graph, int start) {
    int n = graph.size(); vector<bool> done(n, false);
    vector<int> dist(n, numeric_limits<int>::max()); dist[start] = 0; [[init]]
    for (int k = 0; k < n; k++) {
        int u = -1;
        for (int v = 0; v < n; v++)
            if (!done[v] && (u < 0 || dist[v] < dist[u])) u = v; [[select]]
        if (u < 0 || dist[u] == numeric_limits<int>::max()) break;
        for (auto [v, weight] : graph[u]) {
            if (done[v]) continue;
            int candidate = dist[u] + weight; [[inspect]]
            if (candidate < dist[v]) dist[v] = candidate; [[relax]]
        }
        done[u] = true; [[settle]]
    }
    return dist; [[finish]]
}`,
};
rawCodes.dijkstra.typescript = rawCodes.dijkstra.javascript
  .replace('function dijkstra(graph, start)', 'function dijkstra(graph: Record<string, { to: string; weight: number }[]>, start: string): Record<string, number>')
  .replace('new Set()', 'new Set<string>()')
  .replace('let u;', 'let u: string | undefined;');
rawCodes.topological = {
  javascript: `function topologicalSort(graph) {
  const nodes = Object.keys(graph), degree = Object.fromEntries(nodes.map(v => [v, 0]));
  for (const u of nodes) for (const v of graph[u]) degree[v]++; [[init]]
  const queue = nodes.filter(v => degree[v] === 0), order = []; [[ready]]
  while (queue.length) {
    const u = queue.shift(); order.push(u); [[select]]
    for (const v of graph[u]) {
      degree[v]--; [[inspect]]
      if (degree[v] === 0) queue.push(v); [[enqueue]]
    }
  }
  return order.length === nodes.length ? order : null; [[finish]]
}`,
  python: `from collections import deque

def topological_sort(graph):
    degree = {v: 0 for v in graph}
    for neighbors in graph.values():
        for v in neighbors:
            degree[v] += 1 [[init]]
    queue, order = deque(v for v in graph if degree[v] == 0), [] [[ready]]
    while queue:
        u = queue.popleft(); order.append(u) [[select]]
        for v in graph[u]:
            degree[v] -= 1 [[inspect]]
            if degree[v] == 0:
                queue.append(v) [[enqueue]]
    return order if len(order) == len(graph) else None [[finish]]`,
  java: `import java.util.*;

static List<Integer> topologicalSort(int[][] graph) {
    int n = graph.length; int[] degree = new int[n];
    for (int[] neighbors : graph) for (int v : neighbors) degree[v]++; [[init]]
    Queue<Integer> queue = new ArrayDeque<>(); List<Integer> order = new ArrayList<>();
    for (int v = 0; v < n; v++) if (degree[v] == 0) queue.add(v); [[ready]]
    while (!queue.isEmpty()) {
        int u = queue.remove(); order.add(u); [[select]]
        for (int v : graph[u]) {
            degree[v]--; [[inspect]]
            if (degree[v] == 0) queue.add(v); [[enqueue]]
        }
    }
    return order.size() == n ? order : null; [[finish]]
}`,
  c: `#define MAX 64
// Returns -1 when a directed cycle prevents a complete order.
int topological_sort(int graph[MAX][MAX], int n, int order[MAX]) {
    int degree[MAX] = {0}, queue[MAX], head = 0, tail = 0, count = 0;
    for (int u = 0; u < n; u++) for (int v = 0; v < n; v++)
        if (graph[u][v]) degree[v]++; [[init]]
    for (int v = 0; v < n; v++) if (degree[v] == 0) queue[tail++] = v; [[ready]]
    while (head < tail) {
        int u = queue[head++]; order[count++] = u; [[select]]
        for (int v = 0; v < n; v++) {
            if (!graph[u][v]) continue;
            degree[v]--; [[inspect]]
            if (degree[v] == 0) queue[tail++] = v; [[enqueue]]
        }
    }
    return count == n ? count : -1; [[finish]]
}`,
  cpp: `#include <vector>
#include <queue>
#include <optional>
using namespace std;

optional<vector<int>> topologicalSort(const vector<vector<int>>& graph) {
    int n = graph.size(); vector<int> degree(n), order; queue<int> pending;
    for (const auto& neighbors : graph) for (int v : neighbors) degree[v]++; [[init]]
    for (int v = 0; v < n; v++) if (degree[v] == 0) pending.push(v); [[ready]]
    while (!pending.empty()) {
        int u = pending.front(); pending.pop(); order.push_back(u); [[select]]
        for (int v : graph[u]) {
            degree[v]--; [[inspect]]
            if (degree[v] == 0) pending.push(v); [[enqueue]]
        }
    }
    return order.size() == n ? optional<vector<int>>(order) : nullopt; [[finish]]
}`,
};
rawCodes.topological.typescript = rawCodes.topological.javascript
  .replace('function topologicalSort(graph)', 'function topologicalSort(graph: Record<string, string[]>): string[] | null')
  .replace('order = []', 'order: string[] = []')
  .replace('queue.shift()', 'queue.shift()!');

rawCodes.kruskal = {
  javascript: `function kruskal(nodes, edges) {
  const parent = Object.fromEntries(nodes.map(v => [v, v]));
  const rank = Object.fromEntries(nodes.map(v => [v, 0]));
  const find = v => parent[v] === v ? v : (parent[v] = find(parent[v]));
  const sorted = [...edges].sort((a, b) => a.weight - b.weight);
  const tree = []; let totalWeight = 0; [[init]]
  for (const edge of sorted) {
    let a = find(edge.from), b = find(edge.to); [[inspect]]
    if (a === b) continue; [[reject]]
    if (rank[a] < rank[b]) [a, b] = [b, a];
    parent[b] = a; if (rank[a] === rank[b]) rank[a]++;
    tree.push(edge); totalWeight += edge.weight; [[accept]]
    if (tree.length === nodes.length - 1) break;
  }
  return { edges: tree, totalWeight }; [[finish]]
}`,
  python: `def kruskal(nodes, edges):
    parent, rank = {v: v for v in nodes}, {v: 0 for v in nodes}
    def find(v):
        if parent[v] != v:
            parent[v] = find(parent[v])
        return parent[v]
    tree, total = [], 0
    sorted_edges = sorted(edges, key=lambda e: e[2]) [[init]]
    for u, v, weight in sorted_edges:
        a, b = find(u), find(v) [[inspect]]
        if a == b:
            continue [[reject]]
        if rank[a] < rank[b]:
            a, b = b, a
        parent[b] = a
        if rank[a] == rank[b]:
            rank[a] += 1
        tree.append((u, v, weight)); total += weight [[accept]]
        if len(tree) == len(nodes) - 1:
            break
    return tree, total [[finish]]`,
  java: `import java.util.*;

static int find(int[] parent, int v) {
    if (parent[v] != v) parent[v] = find(parent, parent[v]);
    return parent[v];
}
// edges contain {u, v, weight}; the result is the selected edge list.
static List<int[]> kruskal(int n, int[][] edges) {
    int[] parent = new int[n], rank = new int[n];
    for (int v = 0; v < n; v++) parent[v] = v;
    int[][] sorted = edges.clone(); Arrays.sort(sorted, Comparator.comparingInt(e -> e[2]));
    List<int[]> tree = new ArrayList<>(); [[init]]
    for (int[] edge : sorted) {
        int a = find(parent, edge[0]), b = find(parent, edge[1]); [[inspect]]
        if (a == b) continue; [[reject]]
        if (rank[a] < rank[b]) { int t = a; a = b; b = t; }
        parent[b] = a; if (rank[a] == rank[b]) rank[a]++;
        tree.add(edge); [[accept]]
        if (tree.size() == n - 1) break;
    }
    return tree; [[finish]]
}`,
  c: `#include <stdlib.h>
#define MAX 64
typedef struct { int u, v, weight; } Edge;
int find_root(int parent[MAX], int v) {
    if (parent[v] != v) parent[v] = find_root(parent, parent[v]);
    return parent[v];
}
int compare_edges(const void *a, const void *b) {
    const Edge *x = a, *y = b;
    return (x->weight > y->weight) - (x->weight < y->weight);
}
// The input edge array is sorted in place; output is a minimum forest.
int kruskal(int n, Edge edges[], int m, Edge tree[MAX]) {
    int parent[MAX], rank[MAX] = {0}, count = 0;
    for (int v = 0; v < n; v++) parent[v] = v;
    qsort(edges, m, sizeof(Edge), compare_edges); [[init]]
    for (int i = 0; i < m; i++) {
        int a = find_root(parent, edges[i].u), b = find_root(parent, edges[i].v); [[inspect]]
        if (a == b) continue; [[reject]]
        if (rank[a] < rank[b]) { int t = a; a = b; b = t; }
        parent[b] = a; if (rank[a] == rank[b]) rank[a]++;
        tree[count++] = edges[i]; [[accept]]
        if (count == n - 1) break;
    }
    return count; [[finish]]
}`,
  cpp: `#include <vector>
#include <array>
#include <algorithm>
#include <numeric>
#include <functional>
using namespace std;

vector<array<int,3>> kruskal(int n, vector<array<int,3>> edges) {
    vector<int> parent(n), rank(n); iota(parent.begin(), parent.end(), 0);
    function<int(int)> find = [&](int v) { return parent[v] == v ? v : parent[v] = find(parent[v]); };
    sort(edges.begin(), edges.end(), [](auto a, auto b) { return a[2] < b[2]; });
    vector<array<int,3>> tree; [[init]]
    for (auto edge : edges) {
        int a = find(edge[0]), b = find(edge[1]); [[inspect]]
        if (a == b) continue; [[reject]]
        if (rank[a] < rank[b]) swap(a, b);
        parent[b] = a; if (rank[a] == rank[b]) rank[a]++;
        tree.push_back(edge); [[accept]]
        if (tree.size() == n - 1) break;
    }
    return tree; [[finish]]
}`,
};
rawCodes.kruskal.typescript = rawCodes.kruskal.javascript
  .replace('function kruskal(nodes, edges)', 'function kruskal(nodes: string[], edges: { from: string; to: string; weight: number }[])')
  .replace('const find = v =>', 'const find = (v: string): string =>')
  .replace('const tree = []', 'const tree: typeof edges = []');

rawCodes.prim = {
  javascript: `function prim(nodes, edges, start) {
  const seen = new Set([start]), tree = []; let totalWeight = 0; [[init]]
  while (seen.size < nodes.length) {
    let best = null;
    for (const edge of edges) { [[inspect]]
      if (seen.has(edge.from) === seen.has(edge.to)) continue; [[reject]]
      if (best === null || edge.weight < best.weight) best = edge;
    }
    if (best === null) break;
    seen.add(seen.has(best.from) ? best.to : best.from);
    tree.push(best); totalWeight += best.weight; [[accept]]
  }
  return { edges: tree, totalWeight }; [[finish]]
}`,
  python: `def prim(nodes, edges, start):
    seen, tree, total = {start}, [], 0 [[init]]
    while len(seen) < len(nodes):
        best = None
        for edge in edges: [[inspect]]
            u, v, weight = edge
            if (u in seen) == (v in seen):
                continue [[reject]]
            if best is None or weight < best[2]:
                best = edge
        if best is None:
            break
        u, v, weight = best
        seen.add(v if u in seen else u)
        tree.append(best); total += weight [[accept]]
    return tree, total [[finish]]`,
  java: `import java.util.*;

// edges contain {u, v, weight}; the graph is undirected.
static List<int[]> prim(int n, int[][] edges, int start) {
    boolean[] seen = new boolean[n]; seen[start] = true;
    List<int[]> tree = new ArrayList<>(); int count = 1; [[init]]
    while (count < n) {
        int[] best = null;
        for (int[] edge : edges) { [[inspect]]
            if (seen[edge[0]] == seen[edge[1]]) continue; [[reject]]
            if (best == null || edge[2] < best[2]) best = edge;
        }
        if (best == null) break;
        int next = seen[best[0]] ? best[1] : best[0];
        seen[next] = true; count++; tree.add(best); [[accept]]
    }
    return tree; [[finish]]
}`,
  c: `#define MAX 64
typedef struct { int u, v, weight; } Edge;
int prim(int n, Edge edges[], int m, int start, Edge tree[MAX]) {
    int seen[MAX] = {0}, count = 0, vertices = 1;
    seen[start] = 1; [[init]]
    while (vertices < n) {
        int best = -1;
        for (int i = 0; i < m; i++) { [[inspect]]
            if (seen[edges[i].u] == seen[edges[i].v]) continue; [[reject]]
            if (best < 0 || edges[i].weight < edges[best].weight) best = i;
        }
        if (best < 0) break;
        int next = seen[edges[best].u] ? edges[best].v : edges[best].u;
        seen[next] = 1; vertices++; tree[count++] = edges[best]; [[accept]]
    }
    return count; [[finish]]
}`,
  cpp: `#include <vector>
#include <array>
using namespace std;

vector<array<int,3>> prim(int n, const vector<array<int,3>>& edges, int start) {
    vector<bool> seen(n, false); seen[start] = true;
    vector<array<int,3>> tree; int count = 1; [[init]]
    while (count < n) {
        const array<int,3>* best = nullptr;
        for (const auto& edge : edges) { [[inspect]]
            if (seen[edge[0]] == seen[edge[1]]) continue; [[reject]]
            if (best == nullptr || edge[2] < (*best)[2]) best = &edge;
        }
        if (best == nullptr) break;
        int next = seen[(*best)[0]] ? (*best)[1] : (*best)[0];
        seen[next] = true; count++; tree.push_back(*best); [[accept]]
    }
    return tree; [[finish]]
}`,
};
rawCodes.prim.typescript = rawCodes.prim.javascript
  .replace('function prim(nodes, edges, start)', 'function prim(nodes: string[], edges: { from: string; to: string; weight: number }[], start: string)')
  .replace('tree = []', 'tree: typeof edges = []')
  .replace('let best = null', 'let best: typeof edges[number] | null = null');

const extraGraphCodes = {
  bfs: {
    csharp: `List<int> BreadthFirstSearch(int[][] graph, int start) {
    var seen = new bool[graph.Length]; var queue = new Queue<int>(); // @init
    var order = new List<int>(); seen[start] = true; queue.Enqueue(start);
    while (queue.Count > 0) {
        int node = queue.Dequeue(); order.Add(node); // @visit
        foreach (int next in graph[node]) { // @inspect
            if (seen[next]) continue; // @skip
            seen[next] = true; queue.Enqueue(next); // @enqueue
        }
    }
    return order; // @finish
}`,
    go: `func BreadthFirstSearch(graph [][]int, start int) []int {
    seen := make([]bool, len(graph)); queue := []int{start} // @init
    order := []int{}; seen[start] = true
    for len(queue) > 0 {
        node := queue[0]; queue = queue[1:]; order = append(order, node) // @visit
        for _, next := range graph[node] { // @inspect
            if seen[next] { continue } // @skip
            seen[next] = true; queue = append(queue, next) // @enqueue
        }
    }
    return order // @finish
}`,
    rust: `fn breadth_first_search(graph: &[Vec<usize>], start: usize) -> Vec<usize> {
    let mut seen = vec![false; graph.len()]; // @init
    let mut queue = std::collections::VecDeque::from([start]);
    let mut order = Vec::new(); seen[start] = true;
    while let Some(node) = queue.pop_front() {
        order.push(node); // @visit
        for &next in &graph[node] { // @inspect
            if seen[next] { continue; } // @skip
            seen[next] = true; queue.push_back(next); // @enqueue
        }
    }
    order // @finish
}`,
    swift: `func breadthFirstSearch(_ graph: [[Int]], _ start: Int) -> [Int] {
    var seen = Array(repeating: false, count: graph.count) // @init
    var queue = [start], order = [Int](), head = 0; seen[start] = true
    while head < queue.count {
        let node = queue[head]; head += 1; order.append(node) // @visit
        for next in graph[node] { // @inspect
            if seen[next] { continue } // @skip
            seen[next] = true; queue.append(next) // @enqueue
        }
    }
    return order // @finish
}`
  },
  dfs: {
    csharp: `List<int> DepthFirstSearch(int[][] graph, int start) {
    var seen = new bool[graph.Length]; var stack = new Stack<int>(); // @init
    var order = new List<int>(); stack.Push(start);
    while (stack.Count > 0) {
        int node = stack.Pop();
        if (seen[node]) continue; // @skipVisited
        seen[node] = true; order.Add(node); // @visit
        for (int i = graph[node].Length - 1; i >= 0; i--) { // @inspect
            int next = graph[node][i];
            if (seen[next]) continue; // @skipNeighbor
            stack.Push(next); // @enqueue
        }
    }
    return order; // @finish
}`,
    go: `func DepthFirstSearch(graph [][]int, start int) []int {
    seen := make([]bool, len(graph)); stack := []int{start} // @init
    order := []int{}
    for len(stack) > 0 {
        node := stack[len(stack)-1]; stack = stack[:len(stack)-1]
        if seen[node] { continue } // @skipVisited
        seen[node] = true; order = append(order, node) // @visit
        for i := len(graph[node])-1; i >= 0; i-- { // @inspect
            next := graph[node][i]
            if seen[next] { continue } // @skipNeighbor
            stack = append(stack, next) // @enqueue
        }
    }
    return order // @finish
}`,
    rust: `fn depth_first_search(graph: &[Vec<usize>], start: usize) -> Vec<usize> {
    let mut seen = vec![false; graph.len()]; let mut stack = vec![start]; // @init
    let mut order = Vec::new();
    while let Some(node) = stack.pop() {
        if seen[node] { continue; } // @skipVisited
        seen[node] = true; order.push(node); // @visit
        for &next in graph[node].iter().rev() { // @inspect
            if seen[next] { continue; } // @skipNeighbor
            stack.push(next); // @enqueue
        }
    }
    order // @finish
}`,
    swift: `func depthFirstSearch(_ graph: [[Int]], _ start: Int) -> [Int] {
    var seen = Array(repeating: false, count: graph.count), stack = [start] // @init
    var order = [Int]()
    while let node = stack.popLast() {
        if seen[node] { continue } // @skipVisited
        seen[node] = true; order.append(node) // @visit
        for next in graph[node].reversed() { // @inspect
            if seen[next] { continue } // @skipNeighbor
            stack.append(next) // @enqueue
        }
    }
    return order // @finish
}`
  },
  dijkstra: {
    csharp: `int[] Dijkstra((int to, int weight)[][] graph, int start) {
    var distance = new int[graph.Length]; System.Array.Fill(distance, int.MaxValue / 4); // @init
    var settled = new bool[graph.Length]; distance[start] = 0;
    for (int round = 0; round < graph.Length; round++) {
        int node = -1;
        for (int i = 0; i < graph.Length; i++)
            if (!settled[i] && (node == -1 || distance[i] < distance[node])) node = i; // @select
        if (node == -1 || distance[node] == int.MaxValue / 4) break;
        foreach (var edge in graph[node]) {
            if (settled[edge.to]) continue;
            int candidate = distance[node] + edge.weight; // @inspect
            if (candidate < distance[edge.to])
                distance[edge.to] = candidate; // @relax
        }
        settled[node] = true; // @settle
    }
    return distance; // @finish
}`,
    go: `type Edge struct { To, Weight int }
func Dijkstra(graph [][]Edge, start int) []int {
    const infinity = int(1e9)
    distance := make([]int, len(graph)); settled := make([]bool, len(graph)) // @init
    for i := range distance { distance[i] = infinity }; distance[start] = 0
    for round := 0; round < len(graph); round++ {
        node := -1
        for i := range graph {
            if !settled[i] && (node == -1 || distance[i] < distance[node]) { node = i } // @select
        }
        if node == -1 || distance[node] == infinity { break }
        for _, edge := range graph[node] {
            if settled[edge.To] { continue }
            candidate := distance[node]+edge.Weight // @inspect
            if candidate < distance[edge.To] {
                distance[edge.To] = candidate // @relax
            }
        }
        settled[node] = true // @settle
    }
    return distance // @finish
}`,
    rust: `fn dijkstra(graph: &[Vec<(usize, i32)>], start: usize) -> Vec<i32> {
    let mut distance = vec![i32::MAX / 4; graph.len()]; // @init
    let mut settled = vec![false; graph.len()]; distance[start] = 0;
    for _ in 0..graph.len() {
        let node = (0..graph.len()).filter(|&i| !settled[i]).min_by_key(|&i| distance[i]); // @select
        let Some(node) = node else { break; };
        if distance[node] == i32::MAX / 4 { break; }
        for &(next, weight) in &graph[node] {
            if settled[next] { continue; }
            let candidate = distance[node] + weight; // @inspect
            if candidate < distance[next] {
                distance[next] = candidate; // @relax
            }
        }
        settled[node] = true; // @settle
    }
    distance // @finish
}`,
    swift: `func dijkstra(_ graph: [[(to: Int, weight: Int)]], _ start: Int) -> [Int] {
    let infinity = Int.max / 4
    var distance = Array(repeating: infinity, count: graph.count) // @init
    var settled = Array(repeating: false, count: graph.count); distance[start] = 0
    for _ in graph.indices {
        var node = -1
        for i in graph.indices {
            if !settled[i] && (node == -1 || distance[i] < distance[node]) { node = i } // @select
        }
        if node == -1 || distance[node] == infinity { break }
        for edge in graph[node] {
            if settled[edge.to] { continue }
            let candidate = distance[node] + edge.weight // @inspect
            if candidate < distance[edge.to] {
                distance[edge.to] = candidate // @relax
            }
        }
        settled[node] = true // @settle
    }
    return distance // @finish
}`
  },
  topological: {
    csharp: `List<int> TopologicalSort(int[][] graph) {
    var degree = new int[graph.Length]; var queue = new Queue<int>(); // @init
    foreach (var neighbors in graph) foreach (int next in neighbors) degree[next]++;
    for (int node = 0; node < graph.Length; node++)
        if (degree[node] == 0) queue.Enqueue(node); // @ready
    var order = new List<int>();
    while (queue.Count > 0) {
        int node = queue.Dequeue(); order.Add(node); // @select
        foreach (int next in graph[node]) {
            degree[next]--; // @inspect
            if (degree[next] == 0) queue.Enqueue(next); // @enqueue
        }
    }
    if (order.Count != graph.Length) throw new System.InvalidOperationException("Graph contains a cycle");
    return order; // @finish
}`,
    go: `func TopologicalSort(graph [][]int) []int {
    degree := make([]int, len(graph)); queue := []int{} // @init
    for _, neighbors := range graph { for _, next := range neighbors { degree[next]++ } }
    for node := range graph {
        if degree[node] == 0 { queue = append(queue, node) } // @ready
    }
    order := []int{}
    for len(queue) > 0 {
        node := queue[0]; queue = queue[1:]; order = append(order, node) // @select
        for _, next := range graph[node] {
            degree[next]-- // @inspect
            if degree[next] == 0 { queue = append(queue, next) } // @enqueue
        }
    }
    if len(order) != len(graph) { return nil }
    return order // @finish
}`,
    rust: `fn topological_sort(graph: &[Vec<usize>]) -> Option<Vec<usize>> {
    let mut degree = vec![0; graph.len()]; // @init
    for neighbors in graph { for &next in neighbors { degree[next] += 1; } }
    let mut queue: std::collections::VecDeque<usize> = (0..graph.len()).filter(|&i| degree[i] == 0).collect(); // @ready
    let mut order = Vec::new();
    while let Some(node) = queue.pop_front() {
        order.push(node); // @select
        for &next in &graph[node] {
            degree[next] -= 1; // @inspect
            if degree[next] == 0 { queue.push_back(next); } // @enqueue
        }
    }
    if order.len() != graph.len() { return None; }
    Some(order) // @finish
}`,
    swift: `func topologicalSort(_ graph: [[Int]]) -> [Int]? {
    var degree = Array(repeating: 0, count: graph.count) // @init
    for neighbors in graph { for next in neighbors { degree[next] += 1 } }
    var queue = graph.indices.filter { degree[$0] == 0 } // @ready
    var order = [Int](), head = 0
    while head < queue.count {
        let node = queue[head]; head += 1; order.append(node) // @select
        for next in graph[node] {
            degree[next] -= 1 // @inspect
            if degree[next] == 0 { queue.append(next) } // @enqueue
        }
    }
    if order.count != graph.count { return nil }
    return order // @finish
}`
  },
  kruskal: {
    csharp: `List<(int from, int to, int weight)> Kruskal(int count, (int from, int to, int weight)[] edges) {
    var parent = new int[count]; for (int i = 0; i < count; i++) parent[i] = i; // @init
    int Find(int vertex) {
        while (parent[vertex] != vertex) { parent[vertex] = parent[parent[vertex]]; vertex = parent[vertex]; }
        return vertex;
    }
    var sorted = ((int from, int to, int weight)[])edges.Clone();
    System.Array.Sort(sorted, (a, b) => a.weight.CompareTo(b.weight)); // @init
    var tree = new List<(int from, int to, int weight)>();
    foreach (var edge in sorted) {
        int left = Find(edge.from), right = Find(edge.to); // @inspect
        if (left == right) continue; // @reject
        parent[left] = right; tree.Add(edge); // @accept
        if (tree.Count == count - 1) break;
    }
    return tree; // @finish
}`,
    go: `import "sort"
type WeightedEdge struct { From, To, Weight int }
func Kruskal(count int, edges []WeightedEdge) []WeightedEdge {
    parent := make([]int, count); for i := range parent { parent[i] = i } // @init
    find := func(vertex int) int {
        for parent[vertex] != vertex { parent[vertex] = parent[parent[vertex]]; vertex = parent[vertex] }
        return vertex
    }
    sorted := append([]WeightedEdge(nil), edges...)
    sort.SliceStable(sorted, func(i, j int) bool { return sorted[i].Weight < sorted[j].Weight }) // @init
    tree := []WeightedEdge{}
    for _, edge := range sorted {
        left, right := find(edge.From), find(edge.To) // @inspect
        if left == right { continue } // @reject
        parent[left] = right; tree = append(tree, edge) // @accept
        if len(tree) == count-1 { break }
    }
    return tree // @finish
}`,
    rust: `fn kruskal(count: usize, edges: &[(usize, usize, i32)]) -> Vec<(usize, usize, i32)> {
    let mut parent: Vec<usize> = (0..count).collect(); // @init
    fn find(parent: &mut [usize], mut vertex: usize) -> usize {
        while parent[vertex] != vertex { parent[vertex] = parent[parent[vertex]]; vertex = parent[vertex]; }
        vertex
    }
    let mut sorted = edges.to_vec(); sorted.sort_by_key(|edge| edge.2); // @init
    let mut tree = Vec::new();
    for edge in sorted {
        let left = find(&mut parent, edge.0); let right = find(&mut parent, edge.1); // @inspect
        if left == right { continue; } // @reject
        parent[left] = right; tree.push(edge); // @accept
        if tree.len() == count.saturating_sub(1) { break; }
    }
    tree // @finish
}`,
    swift: `func kruskal(_ count: Int, _ edges: [(from: Int, to: Int, weight: Int)]) -> [(Int, Int, Int)] {
    var parent = Array(0..<count) // @init
    func find(_ node: Int) -> Int {
        var vertex = node
        while parent[vertex] != vertex { parent[vertex] = parent[parent[vertex]]; vertex = parent[vertex] }
        return vertex
    }
    let sorted = edges.sorted { $0.weight < $1.weight } // @init
    var tree = [(Int, Int, Int)]()
    for edge in sorted {
        let left = find(edge.from), right = find(edge.to) // @inspect
        if left == right { continue } // @reject
        parent[left] = right; tree.append((edge.from, edge.to, edge.weight)) // @accept
        if tree.count == count - 1 { break }
    }
    return tree // @finish
}`
  },
  prim: {
    csharp: `List<(int from, int to, int weight)> Prim(int count, (int from, int to, int weight)[] edges, int start) {
    var inside = new bool[count]; inside[start] = true; // @init
    var tree = new List<(int from, int to, int weight)>();
    while (tree.Count < count - 1) {
        int best = -1;
        for (int i = 0; i < edges.Length; i++) { // @inspect
            var edge = edges[i];
            if (inside[edge.from] == inside[edge.to]) continue; // @reject
            if (best == -1 || edge.weight < edges[best].weight) best = i;
        }
        if (best == -1) break;
        var chosen = edges[best]; tree.Add(chosen); // @accept
        inside[chosen.from] = true; inside[chosen.to] = true; // @accept
    }
    return tree; // @finish
}`,
    go: `type WeightedEdge struct { From, To, Weight int }
func Prim(count int, edges []WeightedEdge, start int) []WeightedEdge {
    inside := make([]bool, count); inside[start] = true // @init
    tree := []WeightedEdge{}
    for len(tree) < count-1 {
        best := -1
        for i, edge := range edges { // @inspect
            if inside[edge.From] == inside[edge.To] { continue } // @reject
            if best == -1 || edge.Weight < edges[best].Weight { best = i }
        }
        if best == -1 { break }
        chosen := edges[best]; tree = append(tree, chosen) // @accept
        inside[chosen.From] = true; inside[chosen.To] = true // @accept
    }
    return tree // @finish
}`,
    rust: `fn prim(count: usize, edges: &[(usize, usize, i32)], start: usize) -> Vec<(usize, usize, i32)> {
    let mut inside = vec![false; count]; inside[start] = true; // @init
    let mut tree = Vec::new();
    while tree.len() < count.saturating_sub(1) {
        let mut best: Option<usize> = None;
        for (index, edge) in edges.iter().enumerate() { // @inspect
            if inside[edge.0] == inside[edge.1] { continue; } // @reject
            if best.map_or(true, |i| edge.2 < edges[i].2) { best = Some(index); }
        }
        let Some(best) = best else { break; };
        let chosen = edges[best]; tree.push(chosen); // @accept
        inside[chosen.0] = true; inside[chosen.1] = true; // @accept
    }
    tree // @finish
}`,
    swift: `func prim(_ count: Int, _ edges: [(from: Int, to: Int, weight: Int)], _ start: Int) -> [(Int, Int, Int)] {
    var inside = Array(repeating: false, count: count); inside[start] = true // @init
    var tree = [(Int, Int, Int)]()
    while tree.count < count - 1 {
        var best = -1
        for i in edges.indices { // @inspect
            let edge = edges[i]
            if inside[edge.from] == inside[edge.to] { continue } // @reject
            if best == -1 || edge.weight < edges[best].weight { best = i }
        }
        if best == -1 { break }
        let chosen = edges[best]; tree.append((chosen.from, chosen.to, chosen.weight)) // @accept
        inside[chosen.from] = true; inside[chosen.to] = true // @accept
    }
    return tree // @finish
}`
  }
};

const definitions = [
  { id: 'bfs', name: '广度优先搜索', nameEn: 'Breadth-first Search',
    summary: '用先进先出的队列逐层探索图，适合无权图的最短步数与层级遍历。',
    complexity: { time: 'O(V + E)', space: 'O(V)' }, build: bfs, graph: UNDIRECTED },
  { id: 'dfs', name: '深度优先搜索', nameEn: 'Depth-first Search',
    summary: '用后进先出的栈深入一条路径，再回退探索其他分支。',
    complexity: { time: 'O(V + E)', space: 'O(V + E)' }, build: dfs, graph: UNDIRECTED },
  { id: 'dijkstra', name: 'Dijkstra 最短路径', nameEn: 'Dijkstra Shortest Path',
    summary: '每次确定当前距离最小的节点，再松弛它的邻边；适用于非负边权。',
    complexity: { time: 'O(V² + E)', space: 'O(V)' }, build: dijkstra, graph: UNDIRECTED },
  { id: 'topological', name: '拓扑排序', nameEn: 'Topological Sort',
    summary: '按入度为零的顺序消除节点，得到符合依赖关系的有向无环图顺序。',
    complexity: { time: 'O(V + E)', space: 'O(V)' }, build: topological, graph: DAG },
  { id: 'kruskal', name: 'Kruskal 最小生成树', nameEn: 'Kruskal Minimum Spanning Tree',
    summary: '按权重逐条检查边，用并查集拒绝成环的边，连接全部节点。',
    complexity: { time: 'O(E log E)', space: 'O(V + E)' }, build: kruskal, graph: UNDIRECTED },
  { id: 'prim', name: 'Prim 最小生成树', nameEn: 'Prim Minimum Spanning Tree',
    summary: '从一个节点开始，重复扫描边并选择连接树内外节点的最轻边。',
    complexity: { time: 'O(VE)', space: 'O(V)' }, build: prim, graph: UNDIRECTED },
];

export const graphAlgorithms = definitions.map(definition => ({
  ...definition, category: 'graphs', kind: 'graph', inputType: 'graph', defaults: { start: 'A' },
  codes: Object.fromEntries(Object.entries({ ...rawCodes[definition.id], ...extraGraphCodes[definition.id] })
    .map(([language, source]) => [language, annotated(source)])),
}));
