import { EnemyState } from '../types/battle.types';

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  wave: number;  // 몇 번째 웨이브용
  actions: EnemyActionTemplate[];
}

export interface EnemyActionTemplate {
  type: 'Attack' | 'Defend' | 'Curse';
  value: number;
  description: string;
  weight: number;  // 랜덤 선택 가중치
}

export const ENEMIES: EnemyDef[] = [
  {
    id: 'SLIME',
    name: '슬라임',
    maxHp: 40,
    wave: 1,
    actions: [
      { type: 'Attack', value: 6,  description: '몸통 박치기 (6 피해)',  weight: 3 },
      { type: 'Defend', value: 5,  description: '방어 자세 (실드 5)',    weight: 1 },
    ],
  },
  {
    id: 'GOBLIN',
    name: '고블린',
    maxHp: 55,
    wave: 1,
    actions: [
      { type: 'Attack', value: 8,  description: '단검 찌르기 (8 피해)',    weight: 2 },
      { type: 'Attack', value: 12, description: '도끼 내려찍기 (12 피해)', weight: 1 },
      { type: 'Defend', value: 8,  description: '방패 들기 (실드 8)',      weight: 1 },
    ],
  },
  {
    id: 'ORC',
    name: '오크',
    maxHp: 80,
    wave: 2,
    actions: [
      { type: 'Attack', value: 15, description: '대검 휘두르기 (15 피해)', weight: 2 },
      { type: 'Attack', value: 10, description: '주먹질 (10 피해)',         weight: 2 },
      { type: 'Defend', value: 12, description: '방어 자세 (실드 12)',      weight: 1 },
    ],
  },
  {
    id: 'WITCH',
    name: '마녀',
    maxHp: 70,
    wave: 2,
    actions: [
      { type: 'Attack', value: 12, description: '마법 화살 (12 피해)',        weight: 2 },
      { type: 'Curse',  value: 8,  description: '저주 걸기 (8 피해 + 저주)', weight: 2 },
      { type: 'Defend', value: 6,  description: '마법 방어 (실드 6)',         weight: 1 },
    ],
  },
  {
    id: 'DEMON_LORD',
    name: '마왕',
    maxHp: 120,
    wave: 3,
    actions: [
      { type: 'Attack', value: 20, description: '마검 강타 (20 피해)',           weight: 2 },
      { type: 'Attack', value: 14, description: '불꽃 발사 (14 피해)',           weight: 2 },
      { type: 'Curse',  value: 12, description: '암흑 저주 (12 피해 + 저주)',    weight: 1 },
      { type: 'Defend', value: 15, description: '마법 방어막 (실드 15)',         weight: 1 },
    ],
  },
];

export function getEnemyForWave(wave: number): EnemyDef {
  const candidates = ENEMIES.filter(e => e.wave === wave);
  if (candidates.length === 0) return ENEMIES[ENEMIES.length - 1];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function createEnemyState(def: EnemyDef): EnemyState {
  const action = selectAction(def);
  return {
    id: def.id,
    name: def.name,
    hp: def.maxHp,
    maxHp: def.maxHp,
    shield: 0,
    nextAction: action,
  };
}

export function selectAction(def: EnemyDef): EnemyState['nextAction'] {
  const totalWeight = def.actions.reduce((sum, a) => sum + a.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const action of def.actions) {
    rand -= action.weight;
    if (rand <= 0) {
      return { type: action.type, value: action.value, description: action.description };
    }
  }
  const last = def.actions[def.actions.length - 1];
  return { type: last.type, value: last.value, description: last.description };
}
