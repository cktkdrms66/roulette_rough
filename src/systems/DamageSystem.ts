import { BattleState, EnemyState } from '../types/battle.types';

export interface DamageCalcInput {
  basePower: number;
  flatBonus: number;
  percentBonus: number;
  globalFlat: number;
  multiplier: number;
  hitCount: number;
}

// 피해 공식: (basePower + flatBonus + globalFlat) * (1 + percentBonus/100) * multiplier
export function calculateDamage(input: DamageCalcInput): number {
  const { basePower, flatBonus, percentBonus, globalFlat, multiplier, hitCount } = input;
  const rawDamage = (basePower + flatBonus + globalFlat) * (1 + percentBonus / 100) * multiplier;
  return Math.max(0, Math.floor(rawDamage * hitCount));
}

// 적에게 피해 적용 (실드 흡수)
export function applyDamageToEnemy(enemy: EnemyState, damage: number): number {
  let remaining = damage;
  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, remaining);
    enemy.shield -= absorbed;
    remaining -= absorbed;
  }
  enemy.hp = Math.max(0, enemy.hp - remaining);
  return damage; // 원래 피해량 반환
}

// 플레이어에게 피해 적용 (실드 흡수)
export function applyDamageToPlayer(state: BattleState, damage: number): number {
  let remaining = damage;
  if (state.playerShield > 0) {
    const absorbed = Math.min(state.playerShield, remaining);
    state.playerShield -= absorbed;
    remaining -= absorbed;
  }
  state.playerHP = Math.max(0, state.playerHP - remaining);
  return damage;
}

// 플레이어 실드 추가
export function addPlayerShield(state: BattleState, amount: number): void {
  state.playerShield += amount;
}

// 적 실드 추가
export function addEnemyShield(enemy: EnemyState, amount: number): void {
  enemy.shield += amount;
}

// 플레이어 HP 회복
export function healPlayer(state: BattleState, amount: number): number {
  const healed = Math.min(amount, state.playerMaxHP - state.playerHP);
  state.playerHP += healed;
  return healed;
}

export function isEnemyDead(enemy: EnemyState): boolean {
  return enemy.hp <= 0;
}

export function isPlayerDead(state: BattleState): boolean {
  return state.playerHP <= 0;
}
