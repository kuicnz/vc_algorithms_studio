// A* uses g (known cost) + h (Manhattan lower bound) on an eight-node grid.
// The missing center square is an obstacle; all remaining edges have unit cost.
const NODES = [
  ['A', 0, 0], ['B', 1, 0], ['C', 2, 0], ['D', 0, 1],
  ['F', 2, 1], ['G', 0, 2], ['H', 1, 2], ['I', 2, 2],
].map(([id, column, row]) => ({ id, x: 0.1 + column * 0.4, y: 0.1 + row * 0.4, column, row }));
const EDGES = [
  ['A', 'B'], ['B', 'C'], ['A', 'D'], ['C', 'F'],
  ['D', 'G'], ['F', 'I'], ['G', 'H'], ['H', 'I'],
].map(([from, to]) => ({ from, to, weight: 1 }));
const GRAPH = { nodes: NODES, edges: EDGES, directed: false };

function annotated(raw) {
  const tags = {};
  const source = raw.trim().split('\n').map((line, index) => line.replace(/\s*(?:\/\/|#)\s*@([a-zA-Z,]+)\s*$/, (_, names) => {
    for (const tag of names.split(',')) (tags[tag] ||= []).push(index + 1);
    return '';
  })).join('\n');
  return { source, tags };
}

function build(input = {}) {
  const graph = input.graph ?? GRAPH;
  const ids = graph.nodes.map(node => node.id);
  const start = ids.includes(input.start) ? input.start : ids[0];
  const goal = ids.includes(input.goal) ? input.goal : ids.at(-1);
  const adjacency = Object.fromEntries(ids.map(id => [id, []]));
  for (const edge of graph.edges) {
    adjacency[edge.from].push({ to: edge.to, weight: edge.weight });
    if (!graph.directed) adjacency[edge.to].push({ to: edge.from, weight: edge.weight });
  }
  for (const edges of Object.values(adjacency)) edges.sort((a, b) => ids.indexOf(a.to) - ids.indexOf(b.to));
  const target = graph.nodes.find(node => node.id === goal);
  const h = Object.fromEntries(graph.nodes.map(node => [node.id,
    Math.abs(node.column - target.column) + Math.abs(node.row - target.row),
  ]));
  const g = Object.fromEntries(ids.map(id => [id, Infinity]));
  const parents = {}, open = new Set([start]), closed = new Set(), order = [], steps = [];
  g[start] = 0;
  let selectedEdges = [];
  const label = value => Number.isFinite(value) ? value : '∞';
  function step(tag, description, descriptionEn, extras = {}) {
    const state = {
      type: 'graph', nodes: graph.nodes, edges: graph.edges, directed: graph.directed,
      active: [], visited: [...closed], frontier: ids.filter(id => open.has(id)),
      activeEdges: [], selectedEdges, order,
      distances: Object.fromEntries(ids.map(id => [id, label(g[id])])),
      table: { columns: ['节点', 'g', 'h', 'f'], columnsEn: ['Node', 'g', 'h', 'f'], rows: ids.map(id => [id, label(g[id]), h[id], label(g[id] + h[id])]) },
      metrics: { visited: closed.size },
      note: `起点 ${start} → 终点 ${goal} · 中心 E 是障碍 · f = g + h`,
      noteEn: `Start ${start} → Goal ${goal} · Center E is blocked · f = g + h`,
      ...extras,
    };
    steps.push({ tag, description, descriptionEn, state: structuredClone(state) });
  }
  step('init', `起点 ${start} 的 g 设为 0，加入开放集合。h 是到 ${goal} 的曼哈顿距离。`,
    `Set g(${start}) to 0 and add it to the open set. h is the Manhattan distance to ${goal}.`);
  while (open.size) {
    let current = null;
    for (const id of ids) if (open.has(id) && (current === null || g[id] + h[id] < g[current] + h[current])) current = id;
    open.delete(current);
    order.push(current);
    step('select', `选择 f 最小的 ${current}：g=${g[current]}，h=${h[current]}，f=${g[current] + h[current]}。`,
      `Select ${current}, the open node with the smallest f: g=${g[current]}, h=${h[current]}, f=${g[current] + h[current]}.`, { active: [current] });
    if (current === goal) {
      step('found', `到达目标 ${goal}，最短路径代价为 ${g[goal]}，开始回溯前驱。`,
        `Reached ${goal} with optimal cost ${g[goal]}. Reconstruct the path from its parents.`, { active: [goal] });
      const path = [];
      for (let at = goal; at !== undefined; at = parents[at]) {
        path.unshift(at);
        selectedEdges = path.slice(1).map((to, index) => [path[index], to]);
        step('path', `回溯节点 ${at}，当前路径 ${path.join(' → ')}。`,
          `Reconstruct through ${at}: ${path.join(' → ')}.`, { active: [at], activeEdges: selectedEdges });
      }
      step('done', `A* 完成：${path.join(' → ')}，总代价 ${g[goal]}。`,
        `A* complete: ${path.join(' → ')}. Total cost: ${g[goal]}.`, { active: [...path], metrics: { visited: closed.size, pathCost: g[goal] } });
      return { steps, result: { path, cost: g[goal] } };
    }
    for (const edge of adjacency[current]) {
      const extras = { active: [current, edge.to], activeEdges: [[current, edge.to]] };
      step('inspect', `检查相邻节点 ${edge.to}，边 ${current} → ${edge.to} 的代价为 ${edge.weight}。`,
        `Inspect neighbor ${edge.to}; edge ${current} → ${edge.to} costs ${edge.weight}.`, extras);
      if (closed.has(edge.to)) {
        step('skipClosed', `${edge.to} 已在关闭集合中；一致启发式保证无需重新扩展它。`,
          `${edge.to} is closed. The consistent heuristic means it does not need to be expanded again.`, extras);
        continue;
      }
      const candidate = g[current] + edge.weight;
      if (candidate < g[edge.to]) {
        const old = label(g[edge.to]);
        g[edge.to] = candidate; parents[edge.to] = current; open.add(edge.to);
        selectedEdges = Object.entries(parents).map(([to, from]) => [from, to]);
        step('relax', `经 ${current} 的路径更短：将 ${edge.to} 的 g 从 ${old} 更新为 ${candidate}，f=${candidate + h[edge.to]}。`,
          `The route via ${current} is better: update g(${edge.to}) from ${old} to ${candidate}; f=${candidate + h[edge.to]}.`, extras);
      } else {
        step('keep', `候选代价 ${candidate} 不小于 ${edge.to} 已知的 g=${g[edge.to]}，保留原路径。`,
          `Candidate cost ${candidate} does not improve g(${edge.to})=${g[edge.to]}. Keep the existing route.`, extras);
      }
    }
    closed.add(current);
    step('close', `${current} 的邻居已处理，将它加入关闭集合。`,
      `All neighbors of ${current} have been processed. Move it to the closed set.`, { active: [current] });
  }
  step('noPath', `开放集合为空，无法从 ${start} 到达 ${goal}。`,
    `The open set is empty. No path exists from ${start} to ${goal}.`);
  return { steps, result: { path: [], cost: Infinity } };
}

const rawCodes = {
  javascript: `function astar(adj, h, start, goal) {
  const n = adj.length, g = Array(n).fill(Infinity);
  const parent = Array(n).fill(-1), open = Array(n).fill(false);
  const closed = Array(n).fill(false);
  g[start] = 0; open[start] = true; // @init
  while (open.some(Boolean)) {
    let u = -1;
    for (let i = 0; i < n; i++)
      if (open[i] && (u < 0 || g[i] + h[i] < g[u] + h[u])) u = i; // @select
    open[u] = false; // @select
    if (u === goal) { // @found
      const path = [];
      for (let at = goal; at !== -1; at = parent[at]) path.unshift(at); // @path
      return { path, cost: g[goal] }; // @done
    }
    for (const [v, weight] of adj[u]) { // @inspect
      if (closed[v]) continue; // @skipClosed
      const candidate = g[u] + weight;
      if (candidate < g[v]) {
        g[v] = candidate; parent[v] = u; open[v] = true; // @relax
      } else {
        continue; // @keep
      }
    }
    closed[u] = true; // @close
  }
  return { path: [], cost: Infinity }; // @noPath
}`,
  typescript: `function astar(adj: [number, number][][], h: number[], start: number, goal: number): { path: number[]; cost: number } {
  const n = adj.length, g: number[] = Array(n).fill(Infinity);
  const parent: number[] = Array(n).fill(-1), open: boolean[] = Array(n).fill(false);
  const closed: boolean[] = Array(n).fill(false);
  g[start] = 0; open[start] = true; // @init
  while (open.some(Boolean)) {
    let u = -1;
    for (let i = 0; i < n; i++)
      if (open[i] && (u < 0 || g[i] + h[i] < g[u] + h[u])) u = i; // @select
    open[u] = false; // @select
    if (u === goal) { // @found
      const path: number[] = [];
      for (let at = goal; at !== -1; at = parent[at]) path.unshift(at); // @path
      return { path, cost: g[goal] }; // @done
    }
    for (const [v, weight] of adj[u]) { // @inspect
      if (closed[v]) continue; // @skipClosed
      const candidate = g[u] + weight;
      if (candidate < g[v]) {
        g[v] = candidate; parent[v] = u; open[v] = true; // @relax
      } else {
        continue; // @keep
      }
    }
    closed[u] = true; // @close
  }
  return { path: [], cost: Infinity }; // @noPath
}`,
  python: `def astar(adj, h, start, goal):
    n = len(adj)
    g, parent = [float('inf')] * n, [-1] * n
    opened, closed = [False] * n, [False] * n
    g[start], opened[start] = 0, True # @init
    while any(opened):
        u = -1
        for i in range(n):
            if opened[i] and (u < 0 or g[i] + h[i] < g[u] + h[u]):
                u = i # @select
        opened[u] = False # @select
        if u == goal: # @found
            path, at = [], goal
            while at != -1:
                path.append(at) # @path
                at = parent[at]
            path.reverse()
            return {'path': path, 'cost': g[goal]} # @done
        for v, weight in adj[u]: # @inspect
            if closed[v]:
                continue # @skipClosed
            candidate = g[u] + weight
            if candidate < g[v]:
                g[v], parent[v], opened[v] = candidate, u, True # @relax
            else:
                continue # @keep
        closed[u] = True # @close
    return {'path': [], 'cost': float('inf')} # @noPath`,
  c: `#include <stdbool.h>
#include <math.h>
#include <stdlib.h>
typedef struct { int to; double weight; } Edge;
typedef struct { const Edge *edges; int count; } Neighbors;
typedef struct { int *path; int length; double cost; } Result;
// Caller frees result.path. h must be a consistent heuristic.
Result astar(const Neighbors *adj, const double *h, int n, int start, int goal) {
  double *g = malloc((size_t)n * sizeof(double));
  int *parent = malloc((size_t)n * sizeof(int));
  bool *open = calloc((size_t)n, sizeof(bool)), *closed = calloc((size_t)n, sizeof(bool));
  if (!g || !parent || !open || !closed) {
    free(g); free(parent); free(open); free(closed);
    return (Result){NULL, 0, INFINITY};
  }
  for (int i = 0; i < n; i++) { g[i] = INFINITY; parent[i] = -1; }
  g[start] = 0; open[start] = true; // @init
  while (true) {
    int u = -1;
    for (int i = 0; i < n; i++)
      if (open[i] && (u < 0 || g[i] + h[i] < g[u] + h[u])) u = i; // @select
    if (u < 0) break;
    open[u] = false; // @select
    if (u == goal) { // @found
      int *path = malloc((size_t)n * sizeof(int)), length = 0;
      if (!path) { free(g); free(parent); free(open); free(closed); return (Result){NULL, 0, INFINITY}; }
      for (int at = goal; at != -1; at = parent[at]) path[length++] = at; // @path
      for (int i = 0; i < length / 2; i++) {
        int swap = path[i]; path[i] = path[length - 1 - i]; path[length - 1 - i] = swap;
      }
      double cost = g[goal];
      free(g); free(parent); free(open); free(closed);
      return (Result){path, length, cost}; // @done
    }
    for (int e = 0; e < adj[u].count; e++) { // @inspect
      int v = adj[u].edges[e].to;
      if (closed[v]) continue; // @skipClosed
      double candidate = g[u] + adj[u].edges[e].weight;
      if (candidate < g[v]) {
        g[v] = candidate; parent[v] = u; open[v] = true; // @relax
      } else {
        continue; // @keep
      }
    }
    closed[u] = true; // @close
  }
  free(g); free(parent); free(open); free(closed);
  return (Result){NULL, 0, INFINITY}; // @noPath
}`,
  cpp: `#include <algorithm>
#include <limits>
#include <utility>
#include <vector>
struct Result { std::vector<int> path; double cost; };
Result astar(const std::vector<std::vector<std::pair<int, double>>>& adj,
             const std::vector<double>& h, int start, int goal) {
  int n = static_cast<int>(adj.size());
  std::vector<double> g(n, std::numeric_limits<double>::infinity());
  std::vector<int> parent(n, -1);
  std::vector<bool> open(n, false), closed(n, false);
  g[start] = 0; open[start] = true; // @init
  while (std::any_of(open.begin(), open.end(), [](bool value) { return value; })) {
    int u = -1;
    for (int i = 0; i < n; ++i)
      if (open[i] && (u < 0 || g[i] + h[i] < g[u] + h[u])) u = i; // @select
    open[u] = false; // @select
    if (u == goal) { // @found
      std::vector<int> path;
      for (int at = goal; at != -1; at = parent[at]) path.push_back(at); // @path
      std::reverse(path.begin(), path.end());
      return {path, g[goal]}; // @done
    }
    for (auto [v, weight] : adj[u]) { // @inspect
      if (closed[v]) continue; // @skipClosed
      double candidate = g[u] + weight;
      if (candidate < g[v]) {
        g[v] = candidate; parent[v] = u; open[v] = true; // @relax
      } else {
        continue; // @keep
      }
    }
    closed[u] = true; // @close
  }
  return {{}, std::numeric_limits<double>::infinity()}; // @noPath
}`,
  java: `import java.util.*;

// Nonnegative weights and a consistent heuristic, with h[goal] == 0.
class AStar {
    record Edge(int to, double weight) {}
    record Result(List<Integer> path, double cost) {}
    static Result astar(List<List<Edge>> graph, double[] h, int start, int goal) {
        int n = graph.size(); double[] g = new double[n];
        int[] parent = new int[n]; boolean[] open = new boolean[n], closed = new boolean[n];
        Arrays.fill(g, Double.POSITIVE_INFINITY); Arrays.fill(parent, -1);
        g[start] = 0; open[start] = true; // @init
        while (true) {
            int current = -1; double best = Double.POSITIVE_INFINITY;
            for (int u = 0; u < n; u++)
                if (open[u] && (current == -1 || g[u] + h[u] < best)) {
                    current = u; best = g[u] + h[u]; // @select
                }
            if (current == -1) break;
            open[current] = false; // @select
            if (current == goal) { // @found
                List<Integer> path = new ArrayList<>();
                for (int u = goal; u != -1; u = parent[u]) path.add(0, u); // @path
                return new Result(path, g[goal]); // @done
            }
            for (Edge edge : graph.get(current)) { // @inspect
                if (closed[edge.to()]) continue; // @skipClosed
                double candidate = g[current] + edge.weight();
                if (candidate < g[edge.to()]) {
                    g[edge.to()] = candidate; parent[edge.to()] = current; open[edge.to()] = true; // @relax
                } else {
                    continue; // @keep
                }
            }
            closed[current] = true; // @close
        }
        return new Result(List.of(), Double.POSITIVE_INFINITY); // @noPath
    }
}`,
  csharp: `using System;
using System.Collections.Generic;

// Nonnegative weights and a consistent heuristic, with h[goal] == 0.
class AStarDemo {
    public static (List<int> path, double cost) AStar(
        (int to, double weight)[][] graph, double[] h, int start, int goal) {
        int n = graph.Length; var g = new double[n]; var parent = new int[n];
        var open = new bool[n]; var closed = new bool[n];
        Array.Fill(g, double.PositiveInfinity); Array.Fill(parent, -1);
        g[start] = 0; open[start] = true; // @init
        while (true) {
            int current = -1; double best = double.PositiveInfinity;
            for (int u = 0; u < n; u++)
                if (open[u] && (current == -1 || g[u] + h[u] < best)) {
                    current = u; best = g[u] + h[u]; // @select
                }
            if (current == -1) break;
            open[current] = false; // @select
            if (current == goal) { // @found
                var path = new List<int>();
                for (int u = goal; u != -1; u = parent[u]) path.Insert(0, u); // @path
                return (path, g[goal]); // @done
            }
            foreach (var edge in graph[current]) { // @inspect
                if (closed[edge.to]) continue; // @skipClosed
                double candidate = g[current] + edge.weight;
                if (candidate < g[edge.to]) {
                    g[edge.to] = candidate; parent[edge.to] = current; open[edge.to] = true; // @relax
                } else {
                    continue; // @keep
                }
            }
            closed[current] = true; // @close
        }
        return (new List<int>(), double.PositiveInfinity); // @noPath
    }
}`,
  go: `package main

import "math"

type Edge struct { To int; Weight float64 }
type Result struct { Path []int; Cost float64 }
// Weights are nonnegative; h is consistent and h[goal] is zero.
func astar(graph [][]Edge, h []float64, start, goal int) Result {
    n := len(graph); g := make([]float64, n); parent := make([]int, n)
    open, closed := make([]bool, n), make([]bool, n)
    for u := range graph { g[u] = math.Inf(1); parent[u] = -1 }
    g[start] = 0; open[start] = true // @init
    for {
        current := -1; best := math.Inf(1)
        for u := range graph {
            if open[u] && (current == -1 || g[u]+h[u] < best) {
                current = u; best = g[u]+h[u] // @select
            }
        }
        if current == -1 { break }
        open[current] = false // @select
        if current == goal { // @found
            path := []int{}
            for u := goal; u != -1; u = parent[u] { path = append([]int{u}, path...) } // @path
            return Result{path, g[goal]} // @done
        }
        for _, edge := range graph[current] { // @inspect
            if closed[edge.To] { continue } // @skipClosed
            candidate := g[current]+edge.Weight
            if candidate < g[edge.To] {
                g[edge.To] = candidate; parent[edge.To] = current; open[edge.To] = true // @relax
            } else {
                continue // @keep
            }
        }
        closed[current] = true // @close
    }
    return Result{[]int{}, math.Inf(1)} // @noPath
}`,
  rust: `// Nonnegative weights and a consistent heuristic, with h[goal] == 0.
fn astar(graph: &[Vec<(usize, f64)>], h: &[f64], start: usize, goal: usize) -> (Vec<usize>, f64) {
    let n = graph.len(); let mut g = vec![f64::INFINITY; n];
    let mut parent = vec![-1isize; n];
    let mut open = vec![false; n]; let mut closed = vec![false; n];
    g[start] = 0.0; open[start] = true; // @init
    loop {
        let mut current = None; let mut best = f64::INFINITY;
        for u in 0..n {
            if open[u] && (current.is_none() || g[u] + h[u] < best) {
                current = Some(u); best = g[u] + h[u]; // @select
            }
        }
        let Some(current) = current else { break; };
        open[current] = false; // @select
        if current == goal { // @found
            let mut path = Vec::new(); let mut node = goal as isize;
            while node != -1 { let u = node as usize; path.insert(0, u); node = parent[u]; } // @path
            return (path, g[goal]); // @done
        }
        for &(next, weight) in &graph[current] { // @inspect
            if closed[next] { continue; } // @skipClosed
            let candidate = g[current] + weight;
            if candidate < g[next] {
                g[next] = candidate; parent[next] = current as isize; open[next] = true; // @relax
            } else {
                continue; // @keep
            }
        }
        closed[current] = true; // @close
    }
    (Vec::new(), f64::INFINITY) // @noPath
}`,
  swift: `// Nonnegative weights and a consistent heuristic, with h[goal] == 0.
func astar(_ graph: [[(to: Int, weight: Double)]], _ h: [Double], _ start: Int, _ goal: Int) -> (path: [Int], cost: Double) {
    let n = graph.count
    var g = Array(repeating: Double.infinity, count: n), parent = Array(repeating: -1, count: n)
    var open = Array(repeating: false, count: n), closed = Array(repeating: false, count: n)
    g[start] = 0; open[start] = true // @init
    while true {
        var current = -1, best = Double.infinity
        for u in graph.indices {
            if open[u] && (current == -1 || g[u] + h[u] < best) {
                current = u; best = g[u] + h[u] // @select
            }
        }
        if current == -1 { break }
        open[current] = false // @select
        if current == goal { // @found
            var path = [Int](), node = goal
            while node != -1 { path.insert(node, at: 0); node = parent[node] } // @path
            return (path, g[goal]) // @done
        }
        for edge in graph[current] { // @inspect
            if closed[edge.to] { continue } // @skipClosed
            let candidate = g[current] + edge.weight
            if candidate < g[edge.to] {
                g[edge.to] = candidate; parent[edge.to] = current; open[edge.to] = true // @relax
            } else {
                continue // @keep
            }
        }
        closed[current] = true // @close
    }
    return ([], Double.infinity) // @noPath
}`,
};

export const astarAlgorithms = [{
  id: 'astar', name: 'A* 寻路', nameEn: 'A* Pathfinding', category: 'graphs',
  summary: '用 f = g + h 选择下一节点，绕过中心障碍。曼哈顿启发式引导最短路径搜索。',
  summaryEn: 'Choose the next node using f = g + h and route around a central obstacle. A Manhattan heuristic guides the shortest-path search.',
  complexity: { time: 'O(V² + E)', space: 'O(V + E)' }, kind: 'graph', inputType: 'pathfinding',
  defaults: { start: 'A', goal: 'I' }, graph: GRAPH, build,
  codes: Object.fromEntries(Object.entries(rawCodes).map(([language, raw]) => [language, annotated(raw)])),
}];
