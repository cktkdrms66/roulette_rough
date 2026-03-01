import { SkillResult } from '../types/skill.types';
import { CardDef } from '../types/card.types';
import { JokerDef } from '../types/joker.types';

// 이벤트 이름 상수
export const GameEvents = {
  SPIN_STARTED: 'spin_started',
  SPIN_LANDED: 'spin_landed',
  SKILL_EXECUTED: 'skill_executed',
  DAMAGE_DEALT: 'damage_dealt',
  SHIELD_GAINED: 'shield_gained',
  HEAL_APPLIED: 'heal_applied',
  CURSE_TRIGGERED: 'curse_triggered',
  CARD_DROPPED_ON_SLOTS: 'card_dropped_on_slots',
  CARD_PURCHASED: 'card_purchased',
  SHOP_REROLLED: 'shop_rerolled',
  WAVE_CLEARED: 'wave_cleared',
  BATTLE_ENDED: 'battle_ended',
  GOLD_CHANGED: 'gold_changed',
  JOKER_SELECTED: 'joker_selected',
  PLAYER_STUNNED: 'player_stunned',
  ENEMY_STUNNED: 'enemy_stunned',
  PHASE_CHANGED: 'phase_changed',
  CRITICAL_HIT: 'critical_hit',
  PLAYER_DAMAGED: 'player_damaged',
  ENEMY_DEFEATED: 'enemy_defeated',
  TAG_TRIGGERED: 'tag_triggered',
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];

// 이벤트 페이로드 타입
export interface SpinStartedPayload { targetIndex: number }
export interface SpinLandedPayload { index: number }
export interface SkillExecutedPayload { skillId: string; slotIndex: number; result: SkillResult }
export interface DamageDealtPayload { target: 'player' | 'enemy'; amount: number; isCrit?: boolean }
export interface ShieldGainedPayload { target: 'player' | 'enemy'; amount: number }
export interface HealAppliedPayload { amount: number }
export interface CurseTriggeredPayload { slotIndex: number; damage: number }
export interface CardDroppedPayload { cardDef: CardDef; slotIndices: number[] }
export interface CardPurchasedPayload { cardDef: CardDef }
export interface ShopRerolledPayload { newCards: CardDef[] }
export interface WaveClearedPayload { wave: number; goldReward: number; goldBonus: number; freeRerollBonus: number }
export interface BattleEndedPayload { victory: boolean }
export interface GoldChangedPayload { amount: number; newTotal: number }
export interface JokerSelectedPayload { joker: JokerDef }
export interface PhaseChangedPayload { phase: string }

// 타입 안전 이벤트 에미터 래퍼
export class TypedEventEmitter {
  private emitter: Phaser.Events.EventEmitter;

  constructor(emitter: Phaser.Events.EventEmitter) {
    this.emitter = emitter;
  }

  emit(event: string, data?: unknown): void {
    this.emitter.emit(event, data);
  }

  on(event: string, callback: (data: unknown) => void, context?: unknown): void {
    this.emitter.on(event, callback, context);
  }

  off(event: string, callback: (data: unknown) => void, context?: unknown): void {
    this.emitter.off(event, callback, context);
  }

  once(event: string, callback: (data: unknown) => void, context?: unknown): void {
    this.emitter.once(event, callback, context);
  }

  destroy(): void {
    this.emitter.removeAllListeners();
  }
}
