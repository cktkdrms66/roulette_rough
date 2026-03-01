import { Slot } from './slot.types';
import { JokerDef } from './joker.types';
import { CardDef } from './card.types';

export type BattlePhase =
  | 'PlayerTurn'
  | 'Spinning'
  | 'Resolving'
  | 'EnemyTurn'
  | 'WaveEnd'
  | 'BattleEnd';

export interface EnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  nextAction: EnemyAction;
}

export type EnemyActionType = 'Attack' | 'Defend' | 'Curse';

export interface EnemyAction {
  type: EnemyActionType;
  value: number;
  description: string;
}

export interface BattleState {
  playerHP: number;
  playerMaxHP: number;
  playerShield: number;
  playerGold: number;
  freeRerolls: number;
  slots: Slot[];              // 12개
  jokers: JokerDef[];         // 최대 5개
  wave: number;
  maxWaves: number;
  enemy: EnemyState;
  shopCards: CardDef[];       // 3개 표시
  rerollCost: number;
  consecutiveAttackCount: number;
  nextAttackMultiplier: number;  // 심호흡용
  globalAttackFlat: number;      // 영구 누적형 전체 피해 보너스
  waveGlobalFlat: number;        // 웨이브마다 리셋되는 임시 전체 피해 보너스
  phase: BattlePhase;
  playerStunned: boolean;
}
