import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(13, 16))
ax.set_xlim(0, 13)
ax.set_ylim(0, 16)
ax.axis('off')
fig.patch.set_facecolor('#FAFAFA')

# ── color palette ──────────────────────────────────────────
C_PURPLE  = '#6C63FF'   # main flow
C_BLUE    = '#4A90D9'   # service worker / JS
C_GREEN   = '#27AE60'   # safe
C_RED     = '#E74C3C'   # danger
C_ORANGE  = '#E07B39'   # DB / data
C_GRAY    = '#7F8C8D'   # arrows / borders
C_LIGHT   = '#ECF0F1'   # box background
C_WHITE   = '#FFFFFF'

def box(ax, x, y, w, h, label, sublabel=None, fc=C_WHITE, ec=C_PURPLE, lw=2,
        fontsize=12, bold=True, radius=0.4, subfontsize=10):
    patch = FancyBboxPatch((x - w/2, y - h/2), w, h,
                           boxstyle=f"round,pad=0.05,rounding_size={radius}",
                           facecolor=fc, edgecolor=ec, linewidth=lw, zorder=3)
    ax.add_patch(patch)
    weight = 'bold' if bold else 'normal'
    ty = y if sublabel is None else y + 0.18
    ax.text(x, ty, label, ha='center', va='center',
            fontsize=fontsize, fontweight=weight, color='#1A1A2E', zorder=4,
            fontfamily='Malgun Gothic')
    if sublabel:
        ax.text(x, y - 0.32, sublabel, ha='center', va='center',
                fontsize=subfontsize, color=C_GRAY, zorder=4,
                fontfamily='Malgun Gothic')

def arrow(ax, x1, y1, x2, y2, label=None, color=C_GRAY, lw=2):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color,
                                lw=lw, mutation_scale=18), zorder=5)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.15, my, label, fontsize=9, color=color, va='center', zorder=6)

def hline(ax, y, x1, x2, color=C_GRAY, lw=1.5, ls='--'):
    ax.plot([x1, x2], [y, y], color=color, lw=lw, ls=ls, zorder=2)

# ── layout Y positions (top → bottom) ──────────────────────
Y = {
    'user':    15.2,
    'content': 13.7,
    'bg':      12.2,
    'db1':     10.55,
    # branch: white(left) / black(right)
    'wl':       9.1,
    'bl':       9.1,
    # unregistered path continues
    'onnx':     7.6,
    'prob':     6.1,
    'post':     4.6,
    'collect':  3.3,
}
CX = 6.5   # center x
LX = 3.2   # left branch x (whitelist)
RX = 9.8   # right branch x (blacklist)

# ── 1. 사용자가 URL 접속 ───────────────────────────────────
box(ax, CX, Y['user'], 5.5, 0.85, '사용자가 URL 접속',
    fc='#EEF0FF', ec=C_PURPLE, lw=2.5, fontsize=13)

arrow(ax, CX, Y['user']-0.43, CX, Y['content']+0.43)

# ── 2. content.js ─────────────────────────────────────────
box(ax, CX, Y['content'], 7.0, 0.85,
    '[content.js]  URL + HTML 특성 추출',
    fc='#EEF0FF', ec=C_BLUE, fontsize=12)

arrow(ax, CX, Y['content']-0.43, CX, Y['bg']+0.43)

# ── 3. background.js ──────────────────────────────────────
box(ax, CX, Y['bg'], 7.0, 0.85,
    '[background.js]  Service Worker',
    fc='#EEF0FF', ec=C_BLUE, fontsize=12)

arrow(ax, CX, Y['bg']-0.43, CX, Y['db1']+0.55)

# ── 4. 1단계: 서버 DB 조회 ────────────────────────────────
box(ax, CX, Y['db1'], 8.0, 1.0,
    '1단계 : 서버 DB 조회 API',
    sublabel='화이트 / 블랙리스트 등록 여부 확인',
    fc='#FFF8EE', ec=C_ORANGE, lw=2.5, fontsize=12, subfontsize=10)

# branch lines from DB box down
branch_y = Y['db1'] - 0.5
ax.plot([CX, LX], [branch_y, branch_y], color=C_GRAY, lw=1.8, zorder=2)
ax.plot([CX, RX], [branch_y, branch_y], color=C_GRAY, lw=1.8, zorder=2)
# down arrows to branches
arrow(ax, LX, branch_y, LX, Y['wl']+0.43, color=C_GREEN)
arrow(ax, RX, branch_y, RX, Y['bl']+0.43, color=C_RED)
# branch labels
ax.text(LX - 0.15, branch_y + 0.18, '화이트리스트', ha='center', fontsize=9,
        color=C_GREEN, fontweight='bold', zorder=6)
ax.text(RX + 0.15, branch_y + 0.18, '블랙리스트', ha='center', fontsize=9,
        color=C_RED, fontweight='bold', zorder=6)

# ── 4-L. 화이트리스트 결과 ────────────────────────────────
box(ax, LX, Y['wl'], 4.2, 0.82,
    '안전  (확률 0%)',
    sublabel='즉시 결과 반환',
    fc='#F0FDF4', ec=C_GREEN, lw=2, fontsize=12)

# ── 4-R. 블랙리스트 결과 ──────────────────────────────────
box(ax, RX, Y['bl'], 4.2, 0.82,
    '유해 사이트  (확률 100%)',
    sublabel='즉시 결과 반환',
    fc='#FFF0F0', ec=C_RED, lw=2, fontsize=11)

# ── 미등록 → 2단계 label & arrow ──────────────────────────
ax.text(CX + 0.35, (Y['db1'] - 0.5 + Y['onnx'] + 0.43) / 2 + 0.1,
        '미등록 URL', ha='left', fontsize=9, color=C_PURPLE,
        fontweight='bold', zorder=6)
arrow(ax, CX, Y['db1']-0.5, CX, Y['onnx']+0.55, color=C_PURPLE, lw=2)

# ── 5. 2단계: ONNX 추론 ────────────────────────────────────
box(ax, CX, Y['onnx'], 8.5, 1.0,
    '2단계 : 로컬 ONNX 추론',
    sublabel='[offscreen.js]  Boosting Model ONNX  (WASM)',
    fc='#EEF0FF', ec=C_PURPLE, lw=2.5, fontsize=12, subfontsize=10)

arrow(ax, CX, Y['onnx']-0.5, CX, Y['prob']+0.43)

# ── 6. 악성 확률 반환 ─────────────────────────────────────
box(ax, CX, Y['prob'], 6.0, 0.82,
    '악성 확률  0.0 ~ 1.0  반환',
    fc='#F8F8FF', ec=C_GRAY, lw=1.8, fontsize=12)

arrow(ax, CX, Y['prob']-0.41, CX, Y['post']+0.55)

# ── 7. 서버 DB 적재 ────────────────────────────────────────
box(ax, CX, Y['post'], 8.5, 1.0,
    '서버 DB 적재 API  →  결과 저장',
    sublabel='추후 라벨링  →  모델 재학습 데이터로 활용',
    fc='#FFF8EE', ec=C_ORANGE, lw=2.5, fontsize=12, subfontsize=10)

# ── legend / footnote ─────────────────────────────────────
ax.text(CX, 2.35, '※ 판정 결과는 팝업 UI 에 실시간 표시 · 임계값 초과 시 Chrome 알림 및 차단 페이지 자동 실행',
        ha='center', fontsize=9.5, color=C_GRAY, style='italic', zorder=6)

plt.tight_layout(pad=0.3)
out = r'C:\Users\gkckd\OneDrive\Desktop\정민 개인\pillsang-chrome-extension\assets\architecture.png'
plt.savefig(out, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
print('saved:', out)
