import { BattleState, EnemyState } from '../types/battle.types';
import { Slot, createDefaultSlot } from '../types/slot.types';
import { CardDef } from '../types/card.types';
import { getAllCards } from '../data/cards';
import { getEnemyForWave, createEnemyState } from '../data/enemies';

// GDD 초기 슬롯 구성
// | 인덱스 | 스킬 | 분류 |
// | 0,1,3,5,7,9,11 | BASIC_ATTACK | 공격기/물리 |
// | 2, 10 | DEFENSE | 변화기 |
// | 6 | HEAL | 변화기 |
// | 4, 8 | CURSE | 저주 |
export function createInitialSlots(): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < 12; i++) {
    const slot = createDefaultSlot(i);

    if (i === 2 || i === 10) {
      slot.category = 'Transform';
      slot.attackType = 'None';
      slot.skillId = 'DEFENSE';
    } else if (i === 6) {
      slot.category = 'Transform';
      slot.attackType = 'None';
      slot.skillId = 'HEAL';
    } else if (i === 4 || i === 8) {
      slot.category = 'Curse';
      slot.attackType = 'None';
      slot.skillId = 'CURSE';
    }
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
