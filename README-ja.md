<p align="center"><a href="README.md">한국어</a> | <a href="README-en.md">English</a> | 日本語</p>

<p align="center"><img src="docs/assets/hero.gif" alt="ReelForge v7 showcase" width="720"></p>

<p align="center"><strong>ReelForge は、一行のブリーフをシネマティックなモーショングラフィック映像に変える、キー不要の AI 映像システムです。</strong></p>

上の GIF はモックアップではありません — v7 パイプライン自身が生成した 22.9 秒の公式ショーケースです。
スライド文法(カード・パネル・箇条書き)はシステムレベルで禁止され、レンダー検証済みの
振付ギャラリーがタイポグラフィ・カメラ・データ・トランジションの演出を供給します。

## [loop] コアループ (v7 — Gallery-First)

```
一行のブリーフ
  → D1 コンセプト   コピーより演出が先: 支配オブジェクト・世界メタファー・シーンごとの視覚イベント命名
  → D2 アーク       intensity 0〜100 カーブ + アークプリセット(ramp/double-peak/cliff/steady-pulse) + ビートグリッド
  → D3 ルーティング  各シーンの振付はギャラリー決定テーブルから割当 — 白紙からの創作は禁止
  → D4 コピー       凍結された演出の上にコピーを載せる(スロット予算を強制)
  → D5 凍結         direction-lint ゲート(RF-DIR-001..008)通過後にのみ制作開始
  → シーンスウォーム  ワーカーは検証済みフラグメントを keep/mutate 契約で変形するのみ
  → Pilot Gate      ピークシーン1本の単独レンダー通過なしには全体コンパイルを拒否(エンジン強制)
  → レンダー・QC     決定論レンダー → 1fps 全数ストリップの機械検査+目視審査 → 失敗シーンのみ再制作
  → 再収穫          QC を通過した新しい振付はギャラリーへ入庫(フライホイール)
```

核心原則: **検証されていないものは語彙ではない。** ギャラリーの全エントリは
3 プリセットでの実レンダー(ブランク/モーション凍結/低コントラスト検査)を通過しています。

## [showcase] 公式ショーケース

ヒーロー GIF のフルバージョンは [`demos/v7-showcase`](demos/v7-showcase) にあります —
160bpm のビートグリッド上で 12 シーン 22.9 秒、ギャラリー技法 13 種が走ります:
文字嵐の収束 → ストライプリビール → 取り消し線ドローオン → カウンター段階疾走 →
オーバーシュートスラム → マルチプレーンドリー → 文字の中へカメラ突入(ズームポータル) →
グリッチ「カチッ」スワップ → 3 深度パララックス → チェックマーク封印。

全フレームはプロジェクトのデザインルール文書
([`demos/v7-showcase/direction/DESIGN-RULES.md`](demos/v7-showcase/direction/DESIGN-RULES.md))に
支配されます — 3 段タイポスケール、ボックス/カード/パネルの全面禁止、データウィジェット禁止
(画面そのものがグラフ)、シーンごとアクセント 1 箇所、成功色は最後の封印で 1 回のみ。

## [quick-start] Quick Start

エージェント経路(推奨): Claude Code でこのリポジトリを開き、`skills/reelforge/SKILL.md` を
スキルとして登録した後、「ReelForge で 30 秒のブランドイントロを作って」のように依頼します。
スキルが D1 コンセプトからストリップ QC・再収穫まで上記ループをそのまま実行します。

ローカルスモーク(パイプライン確認用):

```bash
cd <repo>
npm ci
./node_modules/.bin/hyperframes doctor

PROJECT_DIR="tmp/smoke-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$PROJECT_DIR"
cp fixtures/golden-specs/minimal-3scene/scene_specs.json "$PROJECT_DIR/scene_specs.json"

node bin/vf pipeline run "$PROJECT_DIR" --profile mock
node bin/vf studio "$PROJECT_DIR" --port 4317
```

## [gallery] 振付ギャラリー — このシステムの心臓

[`skills/reelforge/references/gallery/`](skills/reelforge/references/gallery/) には
**実レンダー検証スタンプ済みの振付 31 種**があります
(typo 9 · camera 4 · data 3 · object 4 · atmo 2 · seal 2 · トランジション pairs 4 組)。

- 語彙辞書: [`references/grammar/`](skills/reelforge/references/grammar/00-INDEX.md) —
  AE 流モーション文法 8 ドメイン 101 技法を GSAP コア契約に翻訳
- 選択文法: [`gallery/ROUTING.md`](skills/reelforge/references/gallery/ROUTING.md) —
  シーン意図 × intensity × ムードの決定テーブル
- 検証済み実体: `gallery/fragments/` + `gallery-index.json` — 入庫は
  `scripts/gallery-verify.mjs`(3 プリセット実レンダー → スタンプ)のみ
- ゲート: `scripts/direction-lint.mjs` — 未登録語彙の遮断、バンド・スロット予算・
  アーク整合・ペア隣接の検査。スケッチ制作は許可されるが "sketch-authored" と明示される

## [rules] 品質は立法される

シーンワーカーのセンスに任せません。プロジェクトごとにデザインルール文書を凍結し
(タイポスケール・グリッド・色・ボックス/データ表現の禁止条項・ビートグリッド・ハンドオフ)、
ルール全文が全ワーカーのプロンプトに載ります。レンダー後は 1fps 全数ストリップを
機械検査(ブランク・低コントラスト・モーション凍結)と目視審査で二重判定し、
失敗シーンのみ理由付きで再ディスパッチします(シーンあたり最大 2 ラウンド)。
レンダーは seek ベースの決定論 — 同じ入力なら同じピクセル。render-lint が
Math.random・Date.now・fetch を拒否します。

## [demos] デモ

| デモ | 内容 |
|---|---|
| [v7-showcase](demos/v7-showcase) | **公式ショーケース** — 12 シーンのマキシマルカット、ヒーロー GIF の原本 |
| [pilot-usage-v7](demos/pilot-usage-v7) | A/B パイロット — 同一コピー・タイミングで演出のみ交換、審査 3:0 全会一致勝利 |
| [docs/baseline](docs/baseline) | before/after の 1fps ストリップ証拠(旧スライド型 vs v7) |

v0.1.0 リリースの d1〜d3 デモは旧パイプラインの産物で、歴史記録として残します。

## [reference] リファレンス

CLI と設定: [docs/usage.md](docs/usage.md) · Studio: [docs/studio.md](docs/studio.md) ·
パイプライン再開: [docs/pipeline.md](docs/pipeline.md) · コンパイラ契約:
[docs/compiler.md](docs/compiler.md) · プリセットカタログ: [docs/design-presets.md](docs/design-presets.md) ·
ギャラリー運用: [GALLERY.md](skills/reelforge/references/gallery/GALLERY.md)。

## [omo] OmO / Senpi スキルパッケージ(このフォーク)

このフォークは [gongnyang のオリジナル ReelForge](https://github.com/gongnyang/reelforge)(Apache-2.0)を OmO/Senpi の
git スキルパッケージとして提供します。`package.json` の `pi.skills` が既存の `skills/reelforge`(演出ループ全体)と新しい
`skills/reelforge-shorts`(ワンコマンド 9:16 ショート用アダプター)を登録します。エンジンのコードは変更していません。
`~/.omo/agent/settings.json` の `packages` に追加します:

```json
"packages": ["git:github.com/Heoooooon/reelforge@omo-package"]
```

```bash
npm ci
bash skills/reelforge-shorts/scripts/make-sample.sh   # インタビュー用サンプル素材をローカル生成(macOS say)
node skills/reelforge-shorts/scripts/run.mjs --input skills/reelforge-shorts/examples/interview/input.json --out omo-out/interview
node scripts/verify.mjs                               # 実際の Senpi ローダーによる検出チェック
```

入力はブリーフ(シーン見出し・ナレーション)またはインタビュー動画 + 字幕(SRT/VTT)+ B-roll クリップ、出力は
`shorts.mp4`(1080×1920)とコンタクトシートです。契約: [skills/reelforge-shorts/references/io.md](skills/reelforge-shorts/references/io.md)。

## [license-disclaimer] ライセンスと免責

コードは Apache-2.0 です。フォント、音源、画像、TTS 産出物はそれぞれのライセンスと
利用規約に従い、公開配布または商用利用の前にプロジェクトごとの provenance を確認してください。
ショーケースの BGM は自前のキー不要生成パイプラインの産物です。
