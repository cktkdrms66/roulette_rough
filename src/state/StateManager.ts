import { BattleState } from '../types/battle.types';
import { RunState, getRunState, setRunState } from './RunState';

// 싱글턴 접근자
class StateManager {
  private _battle: BattleState | null = null;

  get battle(): BattleState {
    if (!this._battle) throw new Error('BattleState not initialized');
    return this._battle;
  }

  setBattle(state: BattleState): void {
    this._battle = state;
  }

  clearBattle(): void {
    this._battle = null;
  }

  get run(): RunState {
    return getRunState();
  }

  setRun(state: RunState): void {
    setRunState(state);
  }
}

export const stateManager = new StateManager();
