export type NodeType = 'Battle' | 'Elite' | 'Boss';

export interface MapNode {
  id: string;
  type: NodeType;
  label: string;
  wave: number;
  nextNodeIds: string[];
  x: number;  // 맵 화면 표시용 정규화 좌표 (0-1)
  y: number;
}

// 하드코딩된 3층 분기 맵
export const MAP_NODES: MapNode[] = [
  // 시작
  { id: 'start', type: 'Battle', label: '전투', wave: 1, nextNodeIds: ['b1_a', 'b1_b'], x: 0.5, y: 0.9 },
  // 1층 분기
  { id: 'b1_a', type: 'Battle', label: '전투', wave: 1, nextNodeIds: ['b2_a', 'b2_b'], x: 0.3, y: 0.7 },
  { id: 'b1_b', type: 'Battle', label: '전투', wave: 1, nextNodeIds: ['b2_b', 'b2_c'], x: 0.7, y: 0.7 },
  // 2층 분기
  { id: 'b2_a', type: 'Elite', label: '엘리트', wave: 1, nextNodeIds: ['boss'], x: 0.2, y: 0.5 },
  { id: 'b2_b', type: 'Battle', label: '전투', wave: 1, nextNodeIds: ['boss'], x: 0.5, y: 0.5 },
  { id: 'b2_c', type: 'Elite', label: '엘리트', wave: 1, nextNodeIds: ['boss'], x: 0.8, y: 0.5 },
  // 보스
  { id: 'boss', type: 'Boss', label: '보스', wave: 1, nextNodeIds: [], x: 0.5, y: 0.2 },
];

export function getNode(id: string): MapNode {
  const node = MAP_NODES.find(n => n.id === id);
  if (!node) throw new Error(`Unknown map node: ${id}`);
  return node;
}

export function getStartNode(): MapNode {
  return getNode('start');
}
