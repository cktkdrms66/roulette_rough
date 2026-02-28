import { BattleState } from '../types/battle.types';
import { CardDef } from '../types/card.types';
import { Slot } from '../types/slot.types';
import { getAllCards } from '../data/cards';
import { getSkill } from '../data/skills';
import { TypedEventEmitter, GameEvents } from '../events/GameEvents';

// 슬롯 평균 강화 수치 기반으로 교체 카드에 보너스 동적 부여
export function enrichReplaceCards(cards: CardDef[], slots: Slot[]): CardDef[] {
  const avg = slots.reduce((sum, s) => sum + s.flatDamageBonus, 0) / slots.length;

  return cards.map(card => {
    if (card.cardType !== 'ReplaceSlots' || !card.replaceSkillId) return card;

    // 평균 대비 -10% ~ +5% 랜덤 편차
    const variance = avg * (Math.random() * 0.15 - 0.10);
    const bonus = Math.max(0, Math.round(avg + variance));
    const skill = getSkill(card.replaceSkillId);
    const valueStr = bonus > 0 ? `(${skill.basePower}+${bonus})` : `(${skill.basePower})`;

    return {
      ...card,
      replaceBonus: bonus,
      description: `연속된 슬롯 ${card.replaceCount}칸을 ${skill.name}${valueStr}로 교체한다.`,
    };
  });
}

export class ShopSystem {
  // 카드 구매 가능 여부
  canAfford(state: BattleState, card: CardDef): boolean {
    return state.playerGold >= card.cost;
  }

  // 리롤 가능 여부
  canReroll(state: BattleState): boolean {
    return state.freeRerolls > 0 || state.playerGold >= state.rerollCost;
  }

  // 골드 차감 (조커 골드 배율 포함)
  spendGold(state: BattleState, amount: number, events: TypedEventEmitter): void {
    state.playerGold = Math.max(0, state.playerGold - amount);
    events.emit(GameEvents.GOLD_CHANGED, { amount: -amount, newTotal: state.playerGold });
  }

  // 골드 획득
  gainGold(state: BattleState, amount: number, events: TypedEventEmitter): number {
    // 골드 조커 체크
    const goldJoker = state.jokers.find(j => j.id === 'JOKER_GOLD');
    const finalAmount = goldJoker ? Math.floor(amount * (goldJoker.param ?? 1.3)) : amount;

    state.playerGold += finalAmount;
    events.emit(GameEvents.GOLD_CHANGED, { amount: finalAmount, newTotal: state.playerGold });
    return finalAmount;
  }

  // 상점 리롤
  reroll(state: BattleState, events: TypedEventEmitter): boolean {
    if (!this.canReroll(state)) return false;

    if (state.freeRerolls > 0) {
      state.freeRerolls -= 1;
    } else {
      this.spendGold(state, state.rerollCost, events);
    }

    state.shopCards = this.drawShopCards(3, state);
    events.emit(GameEvents.SHOP_REROLLED, { newCards: state.shopCards });
    return true;
  }

  // 카드 구매 (카드 적용은 CardSystem에서)
  purchaseCard(state: BattleState, card: CardDef, events: TypedEventEmitter): boolean {
    if (!this.canAfford(state, card)) return false;

    this.spendGold(state, card.cost, events);
    // 상점에서 해당 카드 제거
    const idx = state.shopCards.findIndex(c => c.id === card.id);
    if (idx !== -1) state.shopCards.splice(idx, 1);

    events.emit(GameEvents.CARD_PURCHASED, { cardDef: card });
    return true;
  }

  private drawShopCards(count: number, state: BattleState): CardDef[] {
    const selected = getAllCards()
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    return enrichReplaceCards(selected, state.slots);
  }
}
