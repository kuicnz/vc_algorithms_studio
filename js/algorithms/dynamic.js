// The markers are removed from displayed source while preserving exact line maps.
const snippet = (text) => {
  const tags = {};
  const source = text.trim().split('\n').map((line, index) => {
    const match = line.match(/\s*§([\w,-]+)$/);
    if (!match) return line;
    for (const tag of match[1].split(',')) (tags[tag] ||= []).push(index + 1);
    return line.slice(0, match.index);
  }).join('\n');
  return { source, tags };
};

function trace(matrix, rowLabels, columnLabels) {
  const steps = [];
  const emit = (tag, description, active = [], secondary = [], extras = {}) => {
    steps.push({ tag, description, state: {
      type: 'table', matrix: matrix.map((row) => [...row]),
      rowLabels: [...rowLabels], columnLabels: [...columnLabels],
      active: active.map((cell) => [...cell]), secondary: secondary.map((cell) => [...cell]),
      ...extras,
    } });
  };
  return { steps, emit };
}

const boundedInteger = (value, fallback, maximum) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(maximum, Math.floor(number))) : fallback;
};

const fibonacciCodes = Object.fromEntries(Object.entries({
  javascript: `function fibonacci(n) {
  const dp = Array(n + 1).fill(0); §init
  if (n > 0) dp[1] = 1; §init
  for (let i = 2; i <= n; i++) { §iterate
    dp[i] = dp[i - 1] + dp[i - 2]; §write
  }
  return dp[n]; §result
}`,
  typescript: `function fibonacci(n: number): number {
  const dp: number[] = Array(n + 1).fill(0); §init
  if (n > 0) dp[1] = 1; §init
  for (let i = 2; i <= n; i++) { §iterate
    dp[i] = dp[i - 1] + dp[i - 2]; §write
  }
  return dp[n]; §result
}`,
  python: `def fibonacci(n):
    dp = [0] * (n + 1) §init
    if n > 0:
        dp[1] = 1 §init
    for i in range(2, n + 1): §iterate
        dp[i] = dp[i - 1] + dp[i - 2] §write
    return dp[n] §result`,
  java: `static int fibonacci(int n) {
    int[] dp = new int[n + 1]; §init
    if (n > 0) dp[1] = 1; §init
    for (int i = 2; i <= n; i++) { §iterate
        dp[i] = dp[i - 1] + dp[i - 2]; §write
    }
    return dp[n]; §result
}`,
  c: `#include <stdlib.h>
int fibonacci(int n) {
    int *dp = calloc(n + 1, sizeof(int)); §init
    if (n > 0) dp[1] = 1; §init
    for (int i = 2; i <= n; i++) { §iterate
        dp[i] = dp[i - 1] + dp[i - 2]; §write
    }
    int result = dp[n];
    free(dp);
    return result; §result
}`,
  cpp: `#include <vector>
int fibonacci(int n) {
    std::vector<int> dp(n + 1, 0); §init
    if (n > 0) dp[1] = 1; §init
    for (int i = 2; i <= n; i++) { §iterate
        dp[i] = dp[i - 1] + dp[i - 2]; §write
    }
    return dp[n]; §result
}`,
  csharp: `static int Fibonacci(int n) {
    int[] dp = new int[n + 1]; §init
    if (n > 0) dp[1] = 1; §init
    for (int i = 2; i <= n; i++) { §iterate
        dp[i] = dp[i - 1] + dp[i - 2]; §write
    }
    return dp[n]; §result
}`,
  go: `func fibonacci(n int) int {
    dp := make([]int, n + 1) §init
    if n > 0 { dp[1] = 1 } §init
    for i := 2; i <= n; i++ { §iterate
        dp[i] = dp[i - 1] + dp[i - 2] §write
    }
    return dp[n] §result
}`,
  rust: `fn fibonacci(n: usize) -> usize {
    let mut dp = vec![0; n + 1]; §init
    if n > 0 { dp[1] = 1; } §init
    for i in 2..=n { §iterate
        dp[i] = dp[i - 1] + dp[i - 2]; §write
    }
    dp[n] §result
}`,
  swift: `func fibonacci(_ n: Int) -> Int {
    var dp = Array(repeating: 0, count: n + 1) §init
    if n > 0 { dp[1] = 1 } §init
    var i = 2
    while i <= n { §iterate
        dp[i] = dp[i - 1] + dp[i - 2] §write
        i += 1
    }
    return dp[n] §result
}`,
}).map(([language, source]) => [language, snippet(source)]));

const knapsackCodes = Object.fromEntries(Object.entries({
  javascript: `function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0)); §init
  for (let i = 1; i <= n; i++) {
    for (let c = 0; c <= capacity; c++) { §inspect
      if (weights[i - 1] <= c) {
        dp[i][c] = Math.max(dp[i - 1][c], values[i - 1] + dp[i - 1][c - weights[i - 1]]); §choose
      } else {
        dp[i][c] = dp[i - 1][c]; §skip
      }
    }
  }
  return dp[n][capacity]; §result
}`,
  typescript: `function knapsack(weights: number[], values: number[], capacity: number): number {
  const n = weights.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0)); §init
  for (let i = 1; i <= n; i++) {
    for (let c = 0; c <= capacity; c++) { §inspect
      if (weights[i - 1] <= c) {
        dp[i][c] = Math.max(dp[i - 1][c], values[i - 1] + dp[i - 1][c - weights[i - 1]]); §choose
      } else {
        dp[i][c] = dp[i - 1][c]; §skip
      }
    }
  }
  return dp[n][capacity]; §result
}`,
  python: `def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)] §init
    for i in range(1, n + 1):
        for c in range(capacity + 1): §inspect
            if weights[i - 1] <= c:
                dp[i][c] = max(dp[i - 1][c], values[i - 1] + dp[i - 1][c - weights[i - 1]]) §choose
            else:
                dp[i][c] = dp[i - 1][c] §skip
    return dp[n][capacity] §result`,
  java: `static int knapsack(int[] weights, int[] values, int capacity) {
    int n = weights.length;
    int[][] dp = new int[n + 1][capacity + 1]; §init
    for (int i = 1; i <= n; i++) {
        for (int c = 0; c <= capacity; c++) { §inspect
            if (weights[i - 1] <= c) {
                dp[i][c] = Math.max(dp[i - 1][c], values[i - 1] + dp[i - 1][c - weights[i - 1]]); §choose
            } else {
                dp[i][c] = dp[i - 1][c]; §skip
            }
        }
    }
    return dp[n][capacity]; §result
}`,
  c: `#include <stdlib.h>
int knapsack(const int *weights, const int *values, int n, int capacity) {
    int width = capacity + 1;
    int *dp = calloc((n + 1) * width, sizeof(int)); §init
    for (int i = 1; i <= n; i++) {
        for (int c = 0; c <= capacity; c++) { §inspect
            int previous = dp[(i - 1) * width + c];
            if (weights[i - 1] <= c) {
                int take = values[i - 1] + dp[(i - 1) * width + c - weights[i - 1]];
                dp[i * width + c] = previous > take ? previous : take; §choose
            } else {
                dp[i * width + c] = previous; §skip
            }
        }
    }
    int result = dp[n * width + capacity];
    free(dp);
    return result; §result
}`,
  cpp: `#include <algorithm>
#include <vector>
int knapsack(const std::vector<int>& weights, const std::vector<int>& values, int capacity) {
    int n = weights.size();
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(capacity + 1, 0)); §init
    for (int i = 1; i <= n; i++) {
        for (int c = 0; c <= capacity; c++) { §inspect
            if (weights[i - 1] <= c) {
                dp[i][c] = std::max(dp[i - 1][c], values[i - 1] + dp[i - 1][c - weights[i - 1]]); §choose
            } else {
                dp[i][c] = dp[i - 1][c]; §skip
            }
        }
    }
    return dp[n][capacity]; §result
}`,
  csharp: `static int Knapsack(int[] weights, int[] values, int capacity) {
    int n = weights.Length;
    int[,] dp = new int[n + 1, capacity + 1]; §init
    for (int i = 1; i <= n; i++) {
        for (int c = 0; c <= capacity; c++) { §inspect
            if (weights[i - 1] <= c) {
                dp[i, c] = System.Math.Max(dp[i - 1, c], values[i - 1] + dp[i - 1, c - weights[i - 1]]); §choose
            } else {
                dp[i, c] = dp[i - 1, c]; §skip
            }
        }
    }
    return dp[n, capacity]; §result
}`,
  go: `func knapsack(weights, values []int, capacity int) int {
    n := len(weights)
    dp := make([][]int, n + 1) §init
    for i := range dp { dp[i] = make([]int, capacity + 1) } §init
    for i := 1; i <= n; i++ {
        for c := 0; c <= capacity; c++ { §inspect
            if weights[i - 1] <= c {
                dp[i][c] = max(dp[i - 1][c], values[i - 1] + dp[i - 1][c - weights[i - 1]]) §choose
            } else {
                dp[i][c] = dp[i - 1][c] §skip
            }
        }
    }
    return dp[n][capacity] §result
}`,
  rust: `fn knapsack(weights: &[usize], values: &[usize], capacity: usize) -> usize {
    let n = weights.len();
    let mut dp = vec![vec![0; capacity + 1]; n + 1]; §init
    for i in 1..=n {
        for c in 0..=capacity { §inspect
            if weights[i - 1] <= c {
                dp[i][c] = dp[i - 1][c].max(values[i - 1] + dp[i - 1][c - weights[i - 1]]); §choose
            } else {
                dp[i][c] = dp[i - 1][c]; §skip
            }
        }
    }
    dp[n][capacity] §result
}`,
  swift: `func knapsack(_ weights: [Int], _ values: [Int], _ capacity: Int) -> Int {
    let n = weights.count
    var dp = Array(repeating: Array(repeating: 0, count: capacity + 1), count: n + 1) §init
    var i = 1
    while i <= n {
        for c in 0...capacity { §inspect
            if weights[i - 1] <= c {
                dp[i][c] = max(dp[i - 1][c], values[i - 1] + dp[i - 1][c - weights[i - 1]]) §choose
            } else {
                dp[i][c] = dp[i - 1][c] §skip
            }
        }
        i += 1
    }
    return dp[n][capacity] §result
}`,
}).map(([language, source]) => [language, snippet(source)]));

function stringCodes(edit) {
  const name = edit ? 'editDistance' : 'lcs';
  const snake = edit ? 'edit_distance' : 'lcs';
  const body = edit ? {
    js: `const cost = a[i - 1] === b[j - 1] ? 0 : 1; §compare
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost); §write`,
    py: `cost = 0 if a[i - 1] == b[j - 1] else 1 §compare
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost) §write`,
    java: `int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1; §compare
            dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost); §write`,
    c: `int cost = a[i - 1] == b[j - 1] ? 0 : 1; §compare
            int remove = dp[(i - 1) * width + j] + 1;
            int insert = dp[i * width + j - 1] + 1;
            int replace = dp[(i - 1) * width + j - 1] + cost;
            int best = remove < insert ? remove : insert;
            dp[i * width + j] = best < replace ? best : replace; §write`,
    cpp: `int cost = a[i - 1] == b[j - 1] ? 0 : 1; §compare
            dp[i][j] = std::min({dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost}); §write`,
    cs: `int cost = a[i - 1] == b[j - 1] ? 0 : 1; §compare
            dp[i, j] = System.Math.Min(System.Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1), dp[i - 1, j - 1] + cost); §write`,
    go: `cost := 1
            if a[i - 1] == b[j - 1] { cost = 0 } §compare
            best := dp[i - 1][j] + 1
            if dp[i][j - 1] + 1 < best { best = dp[i][j - 1] + 1 }
            if dp[i - 1][j - 1] + cost < best { best = dp[i - 1][j - 1] + cost }
            dp[i][j] = best §write`,
    rust: `let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 }; §compare
            dp[i][j] = (dp[i - 1][j] + 1).min(dp[i][j - 1] + 1).min(dp[i - 1][j - 1] + cost); §write`,
    swift: `let cost = a[i - 1] == b[j - 1] ? 0 : 1 §compare
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost) §write`,
  } : {
    js: `if (a[i - 1] === b[j - 1]) { §compare
        dp[i][j] = dp[i - 1][j - 1] + 1; §match
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); §choose
      }`,
    py: `if a[i - 1] == b[j - 1]: §compare
                dp[i][j] = dp[i - 1][j - 1] + 1 §match
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]) §choose`,
    java: `if (a.charAt(i - 1) == b.charAt(j - 1)) { §compare
                dp[i][j] = dp[i - 1][j - 1] + 1; §match
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); §choose
            }`,
    c: `if (a[i - 1] == b[j - 1]) { §compare
                dp[i * width + j] = dp[(i - 1) * width + j - 1] + 1; §match
            } else {
                int up = dp[(i - 1) * width + j], left = dp[i * width + j - 1];
                dp[i * width + j] = up > left ? up : left; §choose
            }`,
    cpp: `if (a[i - 1] == b[j - 1]) { §compare
                dp[i][j] = dp[i - 1][j - 1] + 1; §match
            } else {
                dp[i][j] = std::max(dp[i - 1][j], dp[i][j - 1]); §choose
            }`,
    cs: `if (a[i - 1] == b[j - 1]) { §compare
                dp[i, j] = dp[i - 1, j - 1] + 1; §match
            } else {
                dp[i, j] = System.Math.Max(dp[i - 1, j], dp[i, j - 1]); §choose
            }`,
    go: `if a[i - 1] == b[j - 1] { §compare
                dp[i][j] = dp[i - 1][j - 1] + 1 §match
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]) §choose
            }`,
    rust: `if a[i - 1] == b[j - 1] { §compare
                dp[i][j] = dp[i - 1][j - 1] + 1; §match
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]); §choose
            }`,
    swift: `if a[i - 1] == b[j - 1] { §compare
                dp[i][j] = dp[i - 1][j - 1] + 1 §match
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]) §choose
            }`,
  };
  return Object.fromEntries(Object.entries({
    javascript: `function ${name}(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)); §init
${edit ? '  for (let i = 0; i <= m; i++) dp[i][0] = i; §init\n  for (let j = 0; j <= n; j++) dp[0][j] = j; §init\n' : ''}  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      ${body.js}
    }
  }
  return dp[m][n]; §result
}`,
    typescript: `function ${name}(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)); §init
${edit ? '  for (let i = 0; i <= m; i++) dp[i][0] = i; §init\n  for (let j = 0; j <= n; j++) dp[0][j] = j; §init\n' : ''}  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      ${body.js}
    }
  }
  return dp[m][n]; §result
}`,
    python: `def ${snake}(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)] §init
${edit ? '    for i in range(m + 1): dp[i][0] = i §init\n    for j in range(n + 1): dp[0][j] = j §init\n' : ''}    for i in range(1, m + 1):
        for j in range(1, n + 1):
            ${body.py}
    return dp[m][n] §result`,
    java: `static int ${name}(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1]; §init
${edit ? '    for (int i = 0; i <= m; i++) dp[i][0] = i; §init\n    for (int j = 0; j <= n; j++) dp[0][j] = j; §init\n' : ''}    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            ${body.java}
        }
    }
    return dp[m][n]; §result
}`,
    c: `#include <stdlib.h>
#include <string.h>
int ${snake}(const char *a, const char *b) {
    int m = strlen(a), n = strlen(b), width = n + 1;
    int *dp = calloc((m + 1) * width, sizeof(int)); §init
${edit ? '    for (int i = 0; i <= m; i++) dp[i * width] = i; §init\n    for (int j = 0; j <= n; j++) dp[j] = j; §init\n' : ''}    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            ${body.c}
        }
    }
    int result = dp[m * width + n];
    free(dp);
    return result; §result
}`,
    cpp: `#include <algorithm>
#include <string>
#include <vector>
int ${name}(const std::string& a, const std::string& b) {
    int m = a.size(), n = b.size();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0)); §init
${edit ? '    for (int i = 0; i <= m; i++) dp[i][0] = i; §init\n    for (int j = 0; j <= n; j++) dp[0][j] = j; §init\n' : ''}    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            ${body.cpp}
        }
    }
    return dp[m][n]; §result
}`,
    csharp: `static int ${edit ? 'EditDistance' : 'Lcs'}(string a, string b) {
    int m = a.Length, n = b.Length;
    int[,] dp = new int[m + 1, n + 1]; §init
${edit ? '    for (int i = 0; i <= m; i++) dp[i, 0] = i; §init\n    for (int j = 0; j <= n; j++) dp[0, j] = j; §init\n' : ''}    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            ${body.cs}
        }
    }
    return dp[m, n]; §result
}`,
    go: `func ${name}(aText, bText string) int {
    a, b := []rune(aText), []rune(bText)
    m, n := len(a), len(b)
    dp := make([][]int, m + 1) §init
    for i := range dp { dp[i] = make([]int, n + 1) } §init
${edit ? '    for i := 0; i <= m; i++ { dp[i][0] = i } §init\n    for j := 0; j <= n; j++ { dp[0][j] = j } §init\n' : ''}    for i := 1; i <= m; i++ {
        for j := 1; j <= n; j++ {
            ${body.go}
        }
    }
    return dp[m][n] §result
}`,
    rust: `fn ${snake}(a_text: &str, b_text: &str) -> usize {
    let a: Vec<char> = a_text.chars().collect();
    let b: Vec<char> = b_text.chars().collect();
    let (m, n) = (a.len(), b.len());
    let mut dp: Vec<Vec<usize>> = vec![vec![0; n + 1]; m + 1]; §init
${edit ? '    for i in 0..=m { dp[i][0] = i; } §init\n    for j in 0..=n { dp[0][j] = j; } §init\n' : ''}    for i in 1..=m {
        for j in 1..=n {
            ${body.rust}
        }
    }
    dp[m][n] §result
}`,
    swift: `func ${name}(_ aText: String, _ bText: String) -> Int {
    let a = Array(aText), b = Array(bText)
    let m = a.count, n = b.count
    var dp = Array(repeating: Array(repeating: 0, count: n + 1), count: m + 1) §init
${edit ? '    for i in 0...m { dp[i][0] = i } §init\n    for j in 0...n { dp[0][j] = j } §init\n' : ''}    var i = 1
    while i <= m {
        var j = 1
        while j <= n {
            ${body.swift}
            j += 1
        }
        i += 1
    }
    return dp[m][n] §result
}`,
  }).map(([language, source]) => [language, snippet(source)]));
}

const coinCodes = Object.fromEntries(Object.entries({
  javascript: `function coinChange(coins, amount) {
  const dp = Array(amount + 1).fill(Infinity); §init
  dp[0] = 0; §init
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) { §inspect
      if (coin <= a) {
        const candidate = dp[a - coin] + 1; §compare
        if (candidate < dp[a]) { §compare
          dp[a] = candidate; §improve
        } else { §keep
          // The current minimum is already as good or better.
        }
      }
    }
  }
  return Number.isFinite(dp[amount]) ? dp[amount] : -1; §result
}`,
  typescript: `function coinChange(coins: number[], amount: number): number {
  const dp: number[] = Array(amount + 1).fill(Infinity); §init
  dp[0] = 0; §init
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) { §inspect
      if (coin <= a) {
        const candidate = dp[a - coin] + 1; §compare
        if (candidate < dp[a]) { §compare
          dp[a] = candidate; §improve
        } else { §keep
          // The current minimum is already as good or better.
        }
      }
    }
  }
  return Number.isFinite(dp[amount]) ? dp[amount] : -1; §result
}`,
  python: `def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1) §init
    dp[0] = 0 §init
    for a in range(1, amount + 1):
        for coin in coins: §inspect
            if coin <= a:
                candidate = dp[a - coin] + 1 §compare
                if candidate < dp[a]: §compare
                    dp[a] = candidate §improve
                else:
                    pass  # Keep the current minimum. §keep
    return dp[amount] if dp[amount] != float('inf') else -1 §result`,
  java: `static int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    java.util.Arrays.fill(dp, amount + 1); §init
    dp[0] = 0; §init
    for (int a = 1; a <= amount; a++) {
        for (int coin : coins) { §inspect
            if (coin <= a) {
                int candidate = dp[a - coin] + 1; §compare
                if (candidate < dp[a]) { §compare
                    dp[a] = candidate; §improve
                } else { §keep
                    // Keep the current minimum.
                }
            }
        }
    }
    return dp[amount] <= amount ? dp[amount] : -1; §result
}`,
  c: `#include <stdlib.h>
int coin_change(const int *coins, int count, int amount) {
    int *dp = malloc((amount + 1) * sizeof(int));
    for (int a = 0; a <= amount; a++) dp[a] = amount + 1; §init
    dp[0] = 0; §init
    for (int a = 1; a <= amount; a++) {
        for (int i = 0; i < count; i++) { §inspect
            int coin = coins[i];
            if (coin <= a) {
                int candidate = dp[a - coin] + 1; §compare
                if (candidate < dp[a]) { §compare
                    dp[a] = candidate; §improve
                } else { §keep
                    /* Keep the current minimum. */
                }
            }
        }
    }
    int result = dp[amount] <= amount ? dp[amount] : -1;
    free(dp);
    return result; §result
}`,
  cpp: `#include <algorithm>
#include <vector>
int coinChange(const std::vector<int>& coins, int amount) {
    std::vector<int> dp(amount + 1, amount + 1); §init
    dp[0] = 0; §init
    for (int a = 1; a <= amount; a++) {
        for (int coin : coins) { §inspect
            if (coin <= a) {
                int candidate = dp[a - coin] + 1; §compare
                if (candidate < dp[a]) { §compare
                    dp[a] = candidate; §improve
                } else { §keep
                    // Keep the current minimum.
                }
            }
        }
    }
    return dp[amount] <= amount ? dp[amount] : -1; §result
}`,
  csharp: `static int CoinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    for (int a = 0; a <= amount; a++) dp[a] = amount + 1; §init
    dp[0] = 0; §init
    for (int a = 1; a <= amount; a++) {
        foreach (int coin in coins) { §inspect
            if (coin <= a) {
                int candidate = dp[a - coin] + 1; §compare
                if (candidate < dp[a]) { §compare
                    dp[a] = candidate; §improve
                } else { §keep
                    // Keep the current minimum.
                }
            }
        }
    }
    return dp[amount] <= amount ? dp[amount] : -1; §result
}`,
  go: `func coinChange(coins []int, amount int) int {
    dp := make([]int, amount + 1)
    for a := range dp { dp[a] = amount + 1 } §init
    dp[0] = 0 §init
    for a := 1; a <= amount; a++ {
        for _, coin := range coins { §inspect
            if coin <= a {
                candidate := dp[a - coin] + 1 §compare
                if candidate < dp[a] { §compare
                    dp[a] = candidate §improve
                } else { §keep
                    // Keep the current minimum.
                }
            }
        }
    }
    if dp[amount] > amount { return -1 } §result
    return dp[amount] §result
}`,
  rust: `fn coin_change(coins: &[usize], amount: usize) -> i32 {
    let mut dp = vec![amount + 1; amount + 1]; §init
    dp[0] = 0; §init
    for a in 1..=amount {
        for &coin in coins { §inspect
            if coin <= a {
                let candidate = dp[a - coin] + 1; §compare
                if candidate < dp[a] { §compare
                    dp[a] = candidate; §improve
                } else { §keep
                    // Keep the current minimum.
                }
            }
        }
    }
    if dp[amount] <= amount { dp[amount] as i32 } else { -1 } §result
}`,
  swift: `func coinChange(_ coins: [Int], _ amount: Int) -> Int {
    var dp = Array(repeating: amount + 1, count: amount + 1) §init
    dp[0] = 0 §init
    var a = 1
    while a <= amount {
        for coin in coins { §inspect
            if coin <= a {
                let candidate = dp[a - coin] + 1 §compare
                if candidate < dp[a] { §compare
                    dp[a] = candidate §improve
                } else { §keep
                    // Keep the current minimum.
                }
            }
        }
        a += 1
    }
    return dp[amount] <= amount ? dp[amount] : -1 §result
}`,
}).map(([language, source]) => [language, snippet(source)]));

function fibonacciBuild(input = {}) {
  const n = boundedInteger(input.n, 8, 20);
  const matrix = [Array(n + 1).fill('·')];
  matrix[0][0] = 0;
  if (n > 0) matrix[0][1] = 1;
  const { steps, emit } = trace(matrix, ['F(n)'], Array.from({ length: n + 1 }, (_, i) => String(i)));
  emit('init', '设置基础状态 F(0) = 0、F(1) = 1。', n > 0 ? [[0, 0], [0, 1]] : [[0, 0]]);
  for (let i = 2; i <= n; i++) {
    emit('iterate', `计算 F(${i})，读取前两个已知状态。`, [[0, i]], [[0, i - 2], [0, i - 1]]);
    matrix[0][i] = matrix[0][i - 1] + matrix[0][i - 2];
    emit('write', `F(${i}) = ${matrix[0][i - 1]} + ${matrix[0][i - 2]} = ${matrix[0][i]}。`, [[0, i]], [[0, i - 2], [0, i - 1]], { metrics: { cells: i + 1, result: matrix[0][i] } });
  }
  const result = matrix[0][n];
  emit('result', `返回 F(${n}) = ${result}。`, [[0, n]], [], { metrics: { cells: n + 1, result } });
  return { steps, result };
}

function knapsackBuild(input = {}) {
  const defaultWeights = [2, 3, 4, 5], defaultValues = [3, 4, 5, 6];
  const rawWeights = Array.isArray(input.weights) ? input.weights : defaultWeights;
  const rawValues = Array.isArray(input.values) ? input.values : defaultValues;
  const items = rawWeights.slice(0, 8).map((weight, i) => ({ weight: Number(weight), value: Number(rawValues[i]) }))
    .filter(({ weight, value }) => Number.isInteger(weight) && weight > 0 && Number.isFinite(value) && value >= 0);
  const capacity = boundedInteger(input.capacity, 8, 16);
  const n = items.length;
  const matrix = Array.from({ length: n + 1 }, (_, i) => Array(capacity + 1).fill(i === 0 ? 0 : '·'));
  const labels = ['无物品', ...items.map((item, i) => `${i + 1}: w${item.weight}/v${item.value}`)];
  const { steps, emit } = trace(matrix, labels, Array.from({ length: capacity + 1 }, (_, i) => String(i)));
  emit('init', '创建状态表：行表示可选物品，列表示背包容量；没有物品时价值为 0。', matrix[0].map((_, c) => [0, c]));
  for (let i = 1; i <= n; i++) {
    const { weight, value } = items[i - 1];
    for (let c = 0; c <= capacity; c++) {
      emit('inspect', `第 ${i} 件物品重量 ${weight}、价值 ${value}；检查容量 ${c}。`, [[i, c]], [[i - 1, c]]);
      if (weight <= c) {
        const skip = matrix[i - 1][c], take = value + matrix[i - 1][c - weight];
        matrix[i][c] = Math.max(skip, take);
        emit('choose', `不选价值 ${skip}；选择价值 ${value} + ${matrix[i - 1][c - weight]} = ${take}；保留 ${matrix[i][c]}。`, [[i, c]], [[i - 1, c], [i - 1, c - weight]]);
      } else {
        matrix[i][c] = matrix[i - 1][c];
        emit('skip', `容量 ${c} 装不下重量 ${weight}；沿用上一行的 ${matrix[i][c]}。`, [[i, c]], [[i - 1, c]]);
      }
    }
  }
  const result = matrix[n][capacity];
  emit('result', `容量 ${capacity} 的 0/1 背包最大价值为 ${result}，每件物品最多选一次。`, [[n, capacity]], [], { metrics: { cells: (n + 1) * (capacity + 1), result } });
  return { steps, result };
}

function stringBuild(input = {}, edit = false) {
  const a = Array.from(String(input.textA ?? 'ALGORITHM')).slice(0, 10);
  const b = Array.from(String(input.textB ?? 'LOGARITHM')).slice(0, 10);
  const m = a.length, n = b.length;
  const matrix = Array.from({ length: m + 1 }, () => Array(n + 1).fill('·'));
  for (let i = 0; i <= m; i++) matrix[i][0] = edit ? i : 0;
  for (let j = 0; j <= n; j++) matrix[0][j] = edit ? j : 0;
  const { steps, emit } = trace(matrix, ['∅', ...a], ['∅', ...b]);
  emit('init', edit ? '设置空字符串边界：插入或删除 i 个字符需要 i 步。' : '设置空字符串边界：与空字符串的公共子序列长度为 0。', [[0, 0]]);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const equal = a[i - 1] === b[j - 1];
      emit('compare', `比较第 ${i} 个字符「${a[i - 1]}」和第 ${j} 个字符「${b[j - 1]}」：${equal ? '相同' : '不同'}。`, [[i, j]], [[i - 1, j - 1], [i - 1, j], [i, j - 1]]);
      if (edit) {
        const deletion = matrix[i - 1][j] + 1;
        const insertion = matrix[i][j - 1] + 1;
        const replacement = matrix[i - 1][j - 1] + (equal ? 0 : 1);
        matrix[i][j] = Math.min(deletion, insertion, replacement);
        emit('write', `删除 ${deletion}、插入 ${insertion}、${equal ? '匹配' : '替换'} ${replacement}，最小代价为 ${matrix[i][j]}。`, [[i, j]], [[i - 1, j], [i, j - 1], [i - 1, j - 1]]);
      } else if (equal) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
        emit('match', `字符相同：左上角长度 ${matrix[i - 1][j - 1]} + 1 = ${matrix[i][j]}。`, [[i, j]], [[i - 1, j - 1]]);
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        emit('choose', `字符不同：取上方 ${matrix[i - 1][j]} 和左侧 ${matrix[i][j - 1]} 的较大值 ${matrix[i][j]}。`, [[i, j]], [[i - 1, j], [i, j - 1]]);
      }
    }
  }
  const result = matrix[m][n];
  emit('result', edit ? `最少需要 ${result} 次插入、删除或替换。` : `最长公共子序列的长度为 ${result}（子序列不要求连续）。`, [[m, n]], [], { metrics: { cells: (m + 1) * (n + 1), result } });
  return { steps, result };
}

function coinBuild(input = {}) {
  const rawCoins = Array.isArray(input.coins) ? input.coins : [1, 3, 4];
  const coins = [...new Set(rawCoins.map(Number).filter((coin) => Number.isInteger(coin) && coin > 0))].slice(0, 8);
  const amount = boundedInteger(input.amount, 10, 20);
  const dp = Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  const matrix = [dp.map((number) => Number.isFinite(number) ? number : '∞')];
  const { steps, emit } = trace(matrix, ['最少硬币'], Array.from({ length: amount + 1 }, (_, i) => String(i)));
  emit('init', '金额 0 需要 0 枚硬币，其他状态初始化为不可达 ∞。', [[0, 0]]);
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      emit('inspect', `金额 ${a}：尝试面值 ${coin}${coin > a ? '，面值过大，跳过' : ''}。`, [[0, a]], coin <= a ? [[0, a - coin]] : []);
      if (coin <= a) {
        const before = dp[a], candidate = dp[a - coin] + 1;
        const shownBefore = Number.isFinite(before) ? before : '∞';
        const shownCandidate = Number.isFinite(candidate) ? candidate : '∞';
        emit('compare', `比较当前 ${shownBefore} 与金额 ${a - coin} 的最优值 + 1（${shownCandidate}），判断候选值是否更小。`, [[0, a]], [[0, a - coin]]);
        if (candidate < before) {
          dp[a] = candidate;
          matrix[0][a] = candidate;
          emit('improve', `候选值 ${candidate} 更小，将金额 ${a} 的最少硬币数更新为 ${candidate}。`, [[0, a]], [[0, a - coin]]);
        } else {
          emit('keep', `候选值 ${shownCandidate} 没有更优，保留当前值 ${shownBefore}。`, [[0, a]], [[0, a - coin]]);
        }
      }
    }
  }
  const result = Number.isFinite(dp[amount]) ? dp[amount] : -1;
  emit('result', result < 0 ? `给定面值无法组成金额 ${amount}，返回 -1。` : `组成金额 ${amount} 最少需要 ${result} 枚硬币。`, [[0, amount]], [], { metrics: { cells: amount + 1, result } });
  return { steps, result };
}

export const dynamicAlgorithms = [
  {
    id: 'fibonacci', name: '斐波那契数列', nameEn: 'Fibonacci', category: 'dynamic',
    summary: '从两个基础状态出发，用前两项之和逐步构建数列。',
    complexity: { time: 'O(n)', space: 'O(n)' }, kind: 'table', inputType: 'fibonacci',
    defaults: { n: 8 }, build: fibonacciBuild, codes: fibonacciCodes,
  },
  {
    id: 'knapsack', name: '0/1 背包', nameEn: '0/1 Knapsack', category: 'dynamic',
    summary: '在容量限制下，每件物品最多选择一次，寻找价值最大的组合。',
    complexity: { time: 'O(n × W)', space: 'O(n × W)' }, kind: 'table', inputType: 'knapsack',
    defaults: { weights: [2, 3, 4, 5], values: [3, 4, 5, 6], capacity: 8 },
    build: knapsackBuild, codes: knapsackCodes,
  },
  {
    id: 'lcs', name: '最长公共子序列', nameEn: 'Longest Common Subsequence', category: 'dynamic',
    summary: '比较两个字符串的前缀，寻找保持相对顺序的最长公共子序列。',
    complexity: { time: 'O(m × n)', space: 'O(m × n)' }, kind: 'table', inputType: 'strings',
    defaults: { textA: 'ALGORITHM', textB: 'LOGARITHM' },
    build: (input) => stringBuild(input, false), codes: stringCodes(false),
  },
  {
    id: 'coin-change', name: '零钱兑换', nameEn: 'Coin Change', category: 'dynamic',
    summary: '每种硬币可重复使用，计算组成指定金额所需的最少硬币数量。',
    complexity: { time: 'O(amount × k)', space: 'O(amount)' }, kind: 'table', inputType: 'coins',
    defaults: { coins: [1, 3, 4], amount: 10 }, build: coinBuild, codes: coinCodes,
  },
  {
    id: 'edit-distance', name: '编辑距离', nameEn: 'Levenshtein Distance', category: 'dynamic',
    summary: '通过插入、删除和替换，将一个字符串变为另一个的最少操作数。',
    complexity: { time: 'O(m × n)', space: 'O(m × n)' }, kind: 'table', inputType: 'strings',
    defaults: { textA: 'ALGORITHM', textB: 'LOGARITHM' },
    build: (input) => stringBuild(input, true), codes: stringCodes(true),
  },
];
