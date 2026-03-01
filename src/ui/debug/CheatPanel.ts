import Phaser from 'phaser';
import { BattleState } from '../../types/battle.types';
import { TypedEventEmitter, GameEvents } from '../../events/GameEvents';
import { TagSystem } from '../../systems/TagSystem';
import { TagType } from '../../types/tag.types';
import { TAG_DEFS } from '../../data/tags';
import { JOKERS } from '../../data/jokers';
import { THEME } from '../theme';

const PANEL_W = 460;
const PANEL_H = 570;

export class CheatPanel extends Phaser.GameObjects.Container {
  private battleState: BattleState;
  private gameEvents: TypedEventEmitter;
  private tagSystem: TagSystem;
  private onRefresh: () => void;
  private activeTab: number = 0;
  private tabContents: Phaser.GameObjects.Container[] = [];
  private tabBgGraphics: Phaser.GameObjects.Graphics[] = [];

  constructor(
    scene: Phaser.Scene,
    state: BattleState,
    events: TypedEventEmitter,
    tagSystem: TagSystem,
    onRefresh: () => void,
  ) {
    super(scene, 0, 0);
    this.battleState = state;
    this.gameEvents  = events;
    this.tagSystem   = tagSystem;
    this.onRefresh   = onRefresh;

    const { width, height } = scene.cameras.main;

    // 배경 클릭 시 닫기
    const backdrop = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setInteractive();
    backdrop.on('pointerdown', () => this.toggle());
    this.add(backdrop);

    // 패널 컨테이너 (중앙)
    const px = width / 2;
    const py = height / 2;
    const panel = scene.add.container(px, py);
    this.add(panel);

    // 패널 배경
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a0c08, 0.97);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 8);
    bg.lineStyle(2, THEME.GOLD_DARK, 1);
    bg.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 8);
    bg.lineStyle(1, THEME.GOLD, 0.35);
    bg.strokeRoundedRect(-PANEL_W / 2 + 3, -PANEL_H / 2 + 3, PANEL_W - 6, PANEL_H - 6, 6);
    panel.add(bg);

    // 타이틀 바
    const titleBar = scene.add.graphics();
    titleBar.fillStyle(THEME.GOLD_DARK, 1);
    titleBar.fillRoundedRect(-PANEL_W / 2 + 2, -PANEL_H / 2 + 2, PANEL_W - 4, 34, { tl: 7, tr: 7, bl: 0, br: 0 });
    panel.add(titleBar);

    panel.add(
      scene.add.text(0, -PANEL_H / 2 + 19, '[ CHEAT PANEL ]', {
        fontSize: '13px', fontStyle: 'bold', color: '#1a0a08',
      }).setOrigin(0.5, 0.5),
    );

    // 닫기 버튼
    const closeBtn = scene.add.text(PANEL_W / 2 - 18, -PANEL_H / 2 + 19, '✕', {
      fontSize: '14px', fontStyle: 'bold', color: '#1a0a08',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggle());
    panel.add(closeBtn);

    // 탭 버튼들
    const tabNames = ['⚙ 기본', '🃏 조커', '🏷 태그'];
    const TAB_COUNT = tabNames.length;
    const TAB_W = (PANEL_W - 16) / TAB_COUNT;
    const tabY = -PANEL_H / 2 + 52;

    for (let i = 0; i < TAB_COUNT; i++) {
      const tx = -PANEL_W / 2 + 8 + i * TAB_W + TAB_W / 2;

      const tabBg = scene.add.graphics();
      panel.add(tabBg);
      this.tabBgGraphics.push(tabBg);

      const tabLabel = scene.add.text(tx, tabY, tabNames[i], {
        fontSize: '11px', fontStyle: 'bold', color: THEME.TEXT_GOLD,
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
      tabLabel.on('pointerdown', () => this.switchTab(i));
      panel.add(tabLabel);
    }

    // 구분선
    const sep = scene.add.graphics();
    sep.lineStyle(1, THEME.GOLD_DARK, 0.5);
    sep.lineBetween(-PANEL_W / 2 + 8, -PANEL_H / 2 + 64, PANEL_W / 2 - 8, -PANEL_H / 2 + 64);
    panel.add(sep);

    // 탭 콘텐츠 영역 시작 Y
    const contentTopY = -PANEL_H / 2 + 72;

    // 탭 0: 기본
    const tab0 = scene.add.container(0, contentTopY);
    this.buildBasicTab(scene, tab0);
    panel.add(tab0);
    this.tabContents.push(tab0);

    // 탭 1: 조커
    const tab1 = scene.add.container(0, contentTopY);
    this.buildJokerTab(scene, tab1);
    panel.add(tab1);
    this.tabContents.push(tab1);

    // 탭 2: 태그
    const tab2 = scene.add.container(0, contentTopY);
    this.buildTagTab(scene, tab2);
    panel.add(tab2);
    this.tabContents.push(tab2);

    this.setVisible(false);
    this.setDepth(500);
    this.switchTab(0);
  }

  // ── 탭 0: 기본 치트 ──────────────────────────────────────────────────────

  private buildBasicTab(scene: Phaser.Scene, container: Phaser.GameObjects.Container): void {
    const cheats: { label: string; color?: number; action: () => void }[] = [
      { label: '💰 골드 +10',   action: () => this.addGold(10) },
      { label: '💰 골드 +50',   action: () => this.addGold(50) },
      { label: '💰 골드 +200',  action: () => this.addGold(200) },
      { label: '🎰 프리리롤 +3', action: () => { this.battleState.freeRerolls += 3; this.refresh(); } },
      { label: '❤️ HP 완전 회복', action: () => { this.battleState.playerHP = this.battleState.playerMaxHP; this.refresh(); } },
      { label: '❤️ HP +30',      action: () => { this.battleState.playerHP = Math.min(this.battleState.playerMaxHP, this.battleState.playerHP + 30); this.refresh(); } },
      { label: '🛡 실드 +10',   action: () => { this.battleState.playerShield += 10; this.refresh(); } },
      { label: '⚔️ 전체 피해 +1', action: () => { this.battleState.globalAttackFlat += 1; this.refresh(); } },
      { label: '⚔️ 전체 피해 +5', action: () => { this.battleState.globalAttackFlat += 5; this.refresh(); } },
      { label: '💀 적 HP → 1',  color: 0x8B0000, action: () => { this.battleState.enemy.hp = 1; this.refresh(); } },
      { label: '💀 적 실드 제거', color: 0x8B0000, action: () => { this.battleState.enemy.shield = 0; this.refresh(); } },
      { label: '🔄 리롤 비용 초기화', action: () => { this.battleState.rerollCost = 2; this.refresh(); } },
    ];

    const BTN_W = 196;
    const BTN_H = 36;
    const GAP   = 7;
    const COLS  = 2;

    cheats.forEach((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = -PANEL_W / 2 + 14 + col * (BTN_W + GAP) + BTN_W / 2;
      const y   = row * (BTN_H + GAP);
      this.makeButton(scene, container, x, y, BTN_W, BTN_H, c.label, c.action, c.color);
    });
  }

  // ── 탭 1: 조커 ──────────────────────────────────────────────────────────

  private buildJokerTab(scene: Phaser.Scene, container: Phaser.GameObjects.Container): void {
    const BTN_W = 196;
    const BTN_H = 34;
    const GAP   = 6;
    const COLS  = 2;

    JOKERS.forEach((joker, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = -PANEL_W / 2 + 14 + col * (BTN_W + GAP) + BTN_W / 2;
      const y   = row * (BTN_H + GAP);
      this.makeButton(scene, container, x, y, BTN_W, BTN_H, `+ ${joker.name}`, () => {
        this.battleState.jokers.push(joker);
        this.refresh();
      }, 0x2a4a0a);
    });
  }

  // ── 탭 2: 태그 ──────────────────────────────────────────────────────────

  private buildTagTab(scene: Phaser.Scene, container: Phaser.GameObjects.Container): void {
    // 대상 슬롯 선택 드롭다운 대신: 0~5번 슬롯 버튼 + 각 태그별 랜덤 추가 버튼

    // 설명 텍스트
    container.add(
      scene.add.text(0, 0, '랜덤 슬롯 또는 슬롯 0~5에 태그 추가', {
        fontSize: '10px', color: THEME.TEXT_DIM, align: 'center',
      }).setOrigin(0.5, 0),
    );

    const BTN_W = 196;
    const BTN_H = 34;
    const GAP   = 6;
    const COLS  = 2;
    const START_Y = 22;

    TAG_DEFS.forEach((tagDef, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = -PANEL_W / 2 + 14 + col * (BTN_W + GAP) + BTN_W / 2;
      const y   = START_Y + row * (BTN_H + GAP);
      const hexColor = tagDef.color;

      this.makeButton(scene, container, x, y, BTN_W, BTN_H, `🏷 ${tagDef.name}`, () => {
        this.addTagToRandomSlot(tagDef.type);
      }, hexColor);
    });

    // 하단: 특정 슬롯 번호 선택기
    const slotRowY = START_Y + Math.ceil(TAG_DEFS.length / COLS) * (BTN_H + GAP) + 8;
    container.add(
      scene.add.text(0, slotRowY, '▼ 태그 대상 슬롯 고정 (체크 시 해당 슬롯)', {
        fontSize: '9px', color: THEME.TEXT_DIM, align: 'center',
      }).setOrigin(0.5, 0),
    );

    const SLOT_BTN_W = 56;
    for (let s = 0; s < 6; s++) {
      const x = -PANEL_W / 2 + 14 + s * (SLOT_BTN_W + 5) + SLOT_BTN_W / 2;
      const y = slotRowY + 18;
      this.makeButton(scene, container, x, y, SLOT_BTN_W, 28, `칸 ${s}`, () => {
        this.targetSlotIndex = s;
        this.refresh();
      }, 0x1a3a5a);
    }

    // 랜덤으로 초기화 버튼
    const resetX = -PANEL_W / 2 + 14 + 6 * (SLOT_BTN_W + 5) + 40;
    this.makeButton(scene, container, resetX, slotRowY + 18 - 0, 58, 28, '랜덤', () => {
      this.targetSlotIndex = -1;
      this.refresh();
    });

    this.targetSlotLabel = scene.add.text(0, slotRowY + 52, '대상: 랜덤', {
      fontSize: '10px', color: THEME.TEXT_GOLD, align: 'center',
    }).setOrigin(0.5, 0);
    container.add(this.targetSlotLabel);
  }

  private targetSlotIndex: number = -1;
  private targetSlotLabel!: Phaser.GameObjects.Text;

  private addTagToRandomSlot(type: TagType): void {
    const slots = this.battleState.slots;
    let idx = this.targetSlotIndex;
    if (idx < 0) {
      idx = Math.floor(Math.random() * slots.length);
    }
    const slot = slots[idx];
    if (!slot) return;
    this.tagSystem.addTagToSlot(slot, type);
    this.refresh();
  }

  // ── 공통 버튼 생성 ────────────────────────────────────────────────────────

  private makeButton(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    x: number, y: number,
    w: number, h: number,
    label: string,
    action: () => void,
    accentColor: number = 0x3a2a1a,
  ): void {
    const btnBg = scene.add.graphics();
    const drawBtn = (hovered: boolean) => {
      btnBg.clear();
      const col = hovered ? Phaser.Display.Color.IntegerToColor(accentColor).lighten(20).color : accentColor;
      btnBg.fillStyle(col, 1);
      btnBg.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
      btnBg.lineStyle(1, hovered ? THEME.GOLD : THEME.GOLD_DARK, hovered ? 0.9 : 0.5);
      btnBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    };
    drawBtn(false);
    btnBg.setPosition(x, y);

    const btnText = scene.add.text(x, y, label, {
      fontSize: '11px', fontStyle: 'bold', color: THEME.TEXT_CREAM,
      stroke: '#000000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', action);
    zone.on('pointerover', () => drawBtn(true));
    zone.on('pointerout',  () => drawBtn(false));

    container.add([btnBg, btnText, zone]);
  }

  // ── 탭 전환 ──────────────────────────────────────────────────────────────

  private switchTab(idx: number): void {
    this.activeTab = idx;
    this.tabContents.forEach((c, i) => c.setVisible(i === idx));
    this.drawTabBgs();
  }

  private drawTabBgs(): void {
    const TAB_COUNT = this.tabBgGraphics.length;
    const TAB_W     = (PANEL_W - 16) / TAB_COUNT;
    const tabY      = -PANEL_H / 2 + 52;

    this.tabBgGraphics.forEach((g, i) => {
      g.clear();
      const tx = -PANEL_W / 2 + 8 + i * TAB_W;
      const active = i === this.activeTab;
      g.fillStyle(active ? THEME.GOLD_DARK : 0x2a1a0a, active ? 1 : 0.6);
      g.fillRoundedRect(tx, tabY - 11, TAB_W, 22, 4);
    });
  }

  // ── 유틸 ────────────────────────────────────────────────────────────────

  private addGold(amount: number): void {
    this.battleState.playerGold += amount;
    this.gameEvents.emit(GameEvents.GOLD_CHANGED, { amount, newTotal: this.battleState.playerGold });
    this.refresh();
  }

  private refresh(): void {
    if (this.targetSlotLabel) {
      const label = this.targetSlotIndex < 0 ? '대상: 랜덤' : `대상: 슬롯 ${this.targetSlotIndex}번`;
      this.targetSlotLabel.setText(label);
    }
    this.onRefresh();
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }
}
