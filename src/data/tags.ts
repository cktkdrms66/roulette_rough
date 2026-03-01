import { TagType } from '../types/tag.types';

export interface TagDef {
  type: TagType;
  name: string;
  description: string;
  maxLevel: number;
  baseLifespan: number | null; // null = 무제한
  color: number;               // UI 표시색
}

export const TAG_DEFS: TagDef[] = [
  {
    type: 'CRITICAL',
    name: '치명타',
    description: '이 칸이 발동될 때 확률적으로 크리티컬 피해를 입힌다. (Lv당 +10%)',
    maxLevel: 10,
    baseLifespan: null,
    color: 0xFF2222,
  },
  {
    type: 'CONSECUTIVE',
    name: '연속',
    description: '이 칸이 발동될 때 추가로 1회 더 실행된다. (Lv2마다 +1회)',
    maxLevel: 10,
    baseLifespan: null,
    color: 0xFF8800,
  },
  {
    type: 'HEAL',
    name: '회복',
    description: '이 칸이 발동될 때 HP를 회복한다. (4+Lv)',
    maxLevel: 10,
    baseLifespan: null,
    color: 0x33CC55,
  },
  {
    type: 'MOVE_RIGHT',
    name: '우측 발동',
    description: '이 칸이 발동될 때 오른쪽 인접 칸도 연쇄 발동된다. (스핀당 1회)',
    maxLevel: 1,
    baseLifespan: 1,
    color: 0xFFFFFF,
  },
  {
    type: 'MOVE_LEFT',
    name: '좌측 발동',
    description: '이 칸이 발동될 때 왼쪽 인접 칸도 연쇄 발동된다. (스핀당 1회)',
    maxLevel: 1,
    baseLifespan: 1,
    color: 0xCCCCFF,
  },
  {
    type: 'GOLD',
    name: '황금',
    description: '이 칸이 발동될 때 골드를 획득한다. (1+Lv)',
    maxLevel: 10,
    baseLifespan: null,
    color: 0xFFD700,
  },
  {
    type: 'ACTIVATE',
    name: '활성화',
    description: '이 칸이 발동될 때 비활성 태그 1개를 활성화한다. (스핀당 1회)',
    maxLevel: 1,
    baseLifespan: 1,
    color: 0xAA44FF,
  },
  {
    type: 'EXTEND_LIFESPAN',
    name: '수명 연장',
    description: '이 칸이 발동될 때 다른 태그들의 수명을 연장한다. (1+Lv/2회, 스핀당 1회)',
    maxLevel: 10,
    baseLifespan: 1,
    color: 0x44AAFF,
  },
  {
    type: 'SHIELD',
    name: '방어막',
    description: '이 칸이 발동될 때 실드를 얻는다. (1+Lv)',
    maxLevel: 10,
    baseLifespan: null,
    color: 0x44CCFF,
  },
  {
    type: 'SHIELD_BREAK',
    name: '방어막 파괴',
    description: '이 칸이 발동될 때 적의 실드를 즉시 제거한다.',
    maxLevel: 1,
    baseLifespan: null,
    color: 0xFF6644,
  },
];

export function getTagDef(type: TagType): TagDef {
  const def = TAG_DEFS.find(t => t.type === type);
  if (!def) throw new Error(`Unknown tag type: ${type}`);
  return def;
}
