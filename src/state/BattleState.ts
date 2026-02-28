import { BattleState, EnemyState } from '../types/battle.types';
import { Slot, createDefaultSlot } from '../types/slot.types';
import { CardDef } from '../types/card.types';
import { getAllCards } from '../data/cards';
import { getEnemyForWave, createEnemyState } from '../data/enemies';

// 초기 슬롯 구성 (공격 6칸)
// | 인덱스 | 피해 |
// | 0 |  2 |
// | 1 |  5 |
// | 2 |  8 |
// | 3 |  8 |
// | 4 | 15 |
// | 5 |  8 |
const INITIAL_ATK_DAMAGE = [2, 5, 8, 8, 15, 8];
const BASE_POWER = 8;

export function createInitialSlots(): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < 6; i++) {
    const slot = createDefaultSlot(i);
    slot.flatDamageBonus = INITIAL_ATK_DAMAGE[i] - BASE_POWER;
    slots.push(slot);
  }
  return slots;
}

function pickShopCards(count: number = 3): CardDef[] {
  const all = getAllCards();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function createInitialBattleState(wave: number = 1): BattleState {
  const enemyDef = getEnemyForWave(wave);
  const enemy: EnemyState = createEnemyState(enemyDef);

  return {
    playerHP: 80,
    playerMaxHP: 80,
    playerShield: 0,
    playerGold: 5,
    freeRerolls: 1,
    slots: createInitialSlots(),
    jokers: [],  // 플레이어는 조커 없이 시작, JokerSelectScene에서 획득
    wave,
    maxWaves: 3,
    enemy,
    shopCards: pickShopCards(3),
    rerollCost: 2,
    consecutiveAttackCount: 0,
    nextAttackMultiplier: 1,
    globalAttackFlat: 0,
    phase: 'PlayerTurn',
    playerStunned: false,
  };
}

export function refreshShopCards(state: BattleState): void {
  state.shopCards = getAllCards()
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

export { pickShopCards };
