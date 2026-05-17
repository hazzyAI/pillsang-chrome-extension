import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

W, H = 16, 21
fig, ax = plt.subplots(figsize=(W, 18))
ax.set_xlim(0, W)
ax.set_ylim(5.2, H)
ax.axis('off')
fig.patch.set_facecolor('#F5F6FA')

# ── Palette ─────────────────────────────────────────────────
NEU_EC='#5B6BF8'; NEU_FC='#EDEEFF'; NEU_TX='#2C2C8A'
BLU_EC='#2E86C1'; BLU_FC='#D6EAF8'; BLU_TX='#1A5276'
AMB_EC='#CA6F1E'; AMB_FC='#FDEBD0'; AMB_TX='#784212'
GRN_EC='#1E8449'; GRN_FC='#D5F5E3'; GRN_TX='#145A32'
RED_EC='#C0392B'; RED_FC='#FDEDEC'; RED_TX='#7B241C'
PUR_EC='#7D3C98'; PUR_FC='#F5EEF8'; PUR_TX='#4A235A'
INK  ='#1A1A2E'; SUB='#3A3A4A'; ARROW='#44445A'

def box(ax, cx, cy, w, h, title, sub=None,
        fc='#FFF', ec='#AAA', lw=2.5,
        ts=15, tc=INK, ss=12.5, sc=SUB, r=0.45):
    ax.add_patch(FancyBboxPatch(
        (cx-w/2, cy-h/2), w, h,
        boxstyle=f"round,pad=0.05,rounding_size={r}",
        facecolor=fc, edgecolor=ec, linewidth=lw, zorder=3))
    ty = cy + (0.28 if sub else 0)
    ax.text(cx, ty, title, ha='center', va='center',
            fontsize=ts, fontweight='bold', color=tc, zorder=4)
    if sub:
        ax.text(cx, cy-0.32, sub, ha='center', va='center',
                fontsize=ss, color=sc, zorder=4)

def arr(ax, x1, y1, x2, y2, color=ARROW, lw=3.4, ms=28):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color,
                                lw=lw, mutation_scale=ms), zorder=5)

def lbl(ax, x, y, text, color, fs=12.5):
    ax.text(x, y, text, ha='center', va='center',
            fontsize=fs, fontweight='bold', color=color, zorder=6)

# ── Positions ────────────────────────────────────────────────
CX = 8.0
MW = 9.5     # main box width
BW = 4.8     # branch box width
LX = 2.9     # whitelist x
RX = 13.1    # blacklist x

Y_USER   = 20.0
Y_FEAT   = 18.1
Y_DB1    = 16.0   # center of DB box  (height=1.4 → top 16.7, bot 15.3)
BLINE    = 15.0   # horizontal T-line y  (well below DB box bottom)
Y_WL     = 13.2   # branch result boxes
Y_BL     = 13.2
Y_AI     = 11.1
Y_PROB   =  9.3
Y_STORE  =  7.3

# ── 1. 사용자 URL 접속 ─────────────────────────────────────
box(ax, CX, Y_USER, MW, 1.0, '사용자가 URL 접속',
    fc=NEU_FC, ec=NEU_EC, lw=3.0, ts=16, tc=NEU_TX)
arr(ax, CX, Y_USER-0.5, CX, Y_FEAT+0.5)

# ── 2. URL + HTML 특성 추출 ────────────────────────────────
box(ax, CX, Y_FEAT, MW, 1.0, 'URL + HTML 특성 추출',
    fc=BLU_FC, ec=BLU_EC, lw=2.5, ts=15, tc=BLU_TX)
arr(ax, CX, Y_FEAT-0.5, CX, Y_DB1+0.7)

# ── 3. 1단계: 서버 DB 조회 ──────────────────────────────────
box(ax, CX, Y_DB1, MW+3.0, 1.4,
    '1단계 : 서버 DB 조회',
    sub='화이트 / 블랙리스트 등록 여부 확인',
    fc=AMB_FC, ec=AMB_EC, lw=3.0, ts=16, tc=AMB_TX, ss=13, sc=AMB_TX)

# short vertical line from DB bottom to T-line
ax.plot([CX, CX], [Y_DB1-0.7, BLINE],
        color=ARROW, lw=2.8, solid_capstyle='round', zorder=2)
# horizontal T-line
ax.plot([LX, RX], [BLINE, BLINE],
        color=ARROW, lw=2.8, solid_capstyle='round', zorder=2)

# ── branch arrows ───────────────────────────────────────────
arr(ax, LX, BLINE, LX, Y_WL+0.62, color=GRN_EC, lw=3.2)
arr(ax, RX, BLINE, RX, Y_BL+0.62, color=RED_EC, lw=3.2)

# branch labels → positioned on the arrows (left/right side)
mid_L = (BLINE + Y_WL + 0.62) / 2
mid_R = (BLINE + Y_BL + 0.62) / 2
lbl(ax, LX - 1.15, mid_L, '화이트리스트', GRN_EC, fs=12.5)
lbl(ax, RX + 1.15, mid_R, '블랙리스트',   RED_EC, fs=12.5)

# center arrow (미등록 URL)
arr(ax, CX, BLINE, CX, Y_AI+0.72, color=PUR_EC, lw=3.4)
mid_C = (BLINE + Y_AI + 0.72) / 2
lbl(ax, CX + 1.3, mid_C, '미등록 URL', PUR_EC, fs=12.5)

# ── 3-L: 안전 (화이트리스트) ───────────────────────────────
box(ax, LX, Y_WL, BW, 1.2,
    '안전  (확률 0%)', sub='즉시 결과 반환',
    fc=GRN_FC, ec=GRN_EC, lw=2.5, ts=15, tc=GRN_TX, ss=12.5, sc=GRN_TX)

# ── 3-R: 위험 (블랙리스트) ────────────────────────────────
box(ax, RX, Y_BL, BW, 1.2,
    '유해 사이트  (확률 100%)', sub='즉시 결과 반환',
    fc=RED_FC, ec=RED_EC, lw=2.5, ts=14.5, tc=RED_TX, ss=12.5, sc=RED_TX)

# ── 4. 2단계: 온디바이스 AI 추론 ───────────────────────────
box(ax, CX, Y_AI, MW+3.0, 1.4,
    '2단계 : 온디바이스 AI 추론',
    sub='Boosting Model ONNX  ·  WASM 기반 (네트워크 불필요)',
    fc=PUR_FC, ec=PUR_EC, lw=3.0, ts=16, tc=PUR_TX, ss=13, sc=PUR_TX)
arr(ax, CX, Y_AI-0.7, CX, Y_PROB+0.5)

# ── 5. 악성 확률 & 팝업 표시 ──────────────────────────────
box(ax, CX, Y_PROB, MW, 1.0,
    '악성 확률 산출  →  팝업 UI 실시간 표시',
    fc=BLU_FC, ec=BLU_EC, lw=2.5, ts=15, tc=BLU_TX)
arr(ax, CX, Y_PROB-0.5, CX, Y_STORE+0.72)

# ── 6. 서버 DB 적재 ────────────────────────────────────────
box(ax, CX, Y_STORE, MW+3.0, 1.4,
    '서버 DB 적재  →  탐지 결과 저장',
    sub='수집 데이터는 추후 라벨링 후 모델 재학습에 활용',
    fc=AMB_FC, ec=AMB_EC, lw=3.0, ts=16, tc=AMB_TX, ss=13, sc=AMB_TX)

# ── footer ──────────────────────────────────────────────────
ax.text(CX, 6.0,
        '※  임계값 초과 시  Chrome 알림 자동 실행 ( ≥ 70% )  /  유해 사이트 차단 페이지 리디렉션 ( ≥ 80% )',
        ha='center', fontsize=12, color='#888899', style='italic', zorder=6)

plt.tight_layout(pad=0.4)
out = r'C:\Users\gkckd\OneDrive\Desktop\정민 개인\pillsang-chrome-extension\assets\architecture.png'
plt.savefig(out, dpi=160, bbox_inches='tight', facecolor=fig.get_facecolor())
print('saved')
