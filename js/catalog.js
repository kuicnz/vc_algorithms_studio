import { sortingAlgorithms } from './algorithms/sorting.js';
import { searchAlgorithms } from './algorithms/searching.js';
import { graphAlgorithms } from './algorithms/graphs.js';
import { dynamicAlgorithms } from './algorithms/dynamic.js';

export const algorithms = [...sortingAlgorithms, ...searchAlgorithms, ...graphAlgorithms, ...dynamicAlgorithms];
export const categories = [
  { id: 'all', name: '全部算法', english: 'All algorithms', icon: '▦' },
  { id: 'sorting', name: '排序', english: 'Sorting', icon: '▥' },
  { id: 'searching', name: '搜索', english: 'Searching', icon: '⌕' },
  { id: 'graphs', name: '图算法', english: 'Graphs', icon: '◇' },
  { id: 'dynamic', name: '动态规划', english: 'Dynamic programming', icon: '▤' },
];
export const languages = [
  { id: 'javascript', name: 'JavaScript', extension: 'js' },
  { id: 'typescript', name: 'TypeScript', extension: 'ts' },
  { id: 'python', name: 'Python', extension: 'py' },
  { id: 'java', name: 'Java', extension: 'java' },
  { id: 'c', name: 'C', extension: 'c' },
  { id: 'cpp', name: 'C++', extension: 'cpp' },
  { id: 'csharp', name: 'C#', extension: 'cs' },
  { id: 'go', name: 'Go', extension: 'go' },
  { id: 'rust', name: 'Rust', extension: 'rs' },
  { id: 'swift', name: 'Swift', extension: 'swift' },
];

export function filterAlgorithms(category, query) {
  const needle = query.trim().toLocaleLowerCase();
  return algorithms.filter(algorithm => {
    const categoryName = categories.find(item => item.id === algorithm.category)?.name ?? '';
    return (category === 'all' || algorithm.category === category)
      && `${algorithm.name} ${algorithm.nameEn} ${algorithm.summary} ${categoryName}`.toLocaleLowerCase().includes(needle);
  });
}
