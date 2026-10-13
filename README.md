<p align="center">한국어 | <a href="README-en.md">English</a> | <a href="README-ja.md">日本語</a></p>

<p align="center"><img src="docs/assets/hero.gif" alt="ReelForge v7 showcase" width="720"></p>

<p align="center"><strong>ReelForge는 브리프 한 줄을 시네마틱 모션그래픽 영상으로 바꾸는 키리스 AI 영상 생성 시스템입니다.</strong></p>

위 GIF가 데모가 아니라 산출물입니다 — v7 파이프라인이 직접 만든 22.9초 공식 쇼케이스.
슬라이드 문법(카드·패널·불릿)은 시스템 차원에서 금지되어 있고, 검증된 안무 갤러리가
타이포그래피·카메라·데이터·전환 연출을 공급합니다.

## [loop] 코어 루프 (v7 — Gallery-First)

```
브리프 한 줄
  → D1 컨셉         카피보다 연출이 먼저다: 지배 오브젝트·세계 은유·씬별 시각 사건 명명
  → D2 아크         intensity 0~100 곡선 + 아크 프리셋(ramp/double-peak/cliff/steady-pulse) + 비트 그리드
  → D3 라우팅       씬마다 갤러리 결정테이블(ROUTING.md)로 안무를 배정 — 빈 캔버스 창작 금지
  → D4 카피         동결된 연출 위에 카피를 얹는다 (슬롯 예산 준수)
  → D5 동결         direction-lint 게이트(RF-DIR-001~008) 통과 시에만 저작 시작
  → 씬 스웜          워커는 검증된 프래그먼트를 keep/mutate 계약으로 변형만 한다
  → Pilot Gate      피크 씬 1개 단독 렌더 통과 없이는 전체 컴파일이 거부됨 (엔진 강제)
  → 렌더·스트립 QC   결정론 렌더 → 1fps 전수 기계검사+육안 심사 → 실패 씬만 국소 재저작
  → 재수확           QC를 통과한 새 안무는 갤러리로 입고된다 (플라이휠)
```

핵심 원칙: **검증 안 된 것은 어휘가 아니다.** 갤러리의 모든 안무는 3개 프리셋
실렌더(공백·모션동결·저대비 검사)를 통과한 것만 스탬프됩니다.

## [showcase] 공식 쇼케이스

히어로 GIF의 풀버전이 [`demos/v7-showcase`](demos/v7-showcase)입니다 —
12씬 22.9초, 160bpm 비트 그리드 위에서 갤러리 기법 13종이 돌아갑니다:
글자 폭풍 수렴 → 스트라이프 리빌 → 취소선 드로우온 → 카운터 스텝 폭주 →
오버슛 슬램 → 멀티플레인 돌리 → 글자 속으로 카메라 돌진(줌 포탈) →
글리치 「딸깍」 스왑 → 3깊이 패럴랙스 → 체크마크 봉인.

이 영상의 모든 프레임은 프로젝트별 디자인 규칙 문서
([`demos/v7-showcase/direction/DESIGN-RULES.md`](demos/v7-showcase/direction/DESIGN-RULES.md))의
지배를 받습니다 — 타이포 3단 스케일, 박스/카드/패널 전면 금지, 데이터 위젯 금지
(화면 자체가 그래프), 씬당 액센트 1곳, 성공색은 마지막 봉인 1회.

## [quick-start] Quick Start

에이전트 경로(권장): Claude Code에서 이 레포를 열고 `skills/reelforge/SKILL.md`를 스킬로 등록한 뒤,
"ReelForge로 30초 브랜드 인트로 만들어줘"처럼 요청합니다.
스킬이 D1 컨셉부터 스트립 QC·재수확까지 위 루프를 그대로 태웁니다.

로컬 스모크(파이프라인 확인용):

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

## [gallery] 안무 갤러리 — 이 시스템의 심장

[`skills/reelforge/references/gallery/`](skills/reelforge/references/gallery/)에
**실렌더 검증 스탬프를 받은 안무 31종**이 있습니다
(typo 9 · camera 4 · data 3 · object 4 · atmo 2 · seal 2 · 전환 pairs 4쌍).

- 어휘 사전: [`references/grammar/`](skills/reelforge/references/grammar/00-INDEX.md) —
  AE식 모션 문법 8도메인 101기법을 GSAP 코어 계약으로 번역
- 선택 문법: [`gallery/ROUTING.md`](skills/reelforge/references/gallery/ROUTING.md) —
  씬 의도 × intensity × 무드 결정테이블
- 검증 실물: `gallery/fragments/` + `gallery-index.json` — 입고는
  `scripts/gallery-verify.mjs`(3프리셋 실렌더 → 스탬프) 단독 경로
- 게이트: `scripts/direction-lint.mjs` — 미등록 어휘 차단, 밴드·슬롯 예산·아크 정합·
  전환쌍 인접성 검사. 스케치 저작은 허용하되 "sketch-authored"로 소리내어 표시

## [rules] 품질은 입법된다

씬 워커의 감각에 맡기지 않습니다. 프로젝트마다 디자인 규칙 문서를 동결하고
(타이포 스케일·그리드·색·박스/데이터 표현 금지 조항·비트 그리드·핸드오프),
규칙 전문이 모든 씬 워커의 프롬프트에 실립니다. 렌더 후에는 1fps 전수 스트립을
기계검사(공백·저대비·모션 동결)와 육안 심사로 이중 판정하고, 실패 씬만 사유와 함께
재디스패치합니다(씬당 최대 2라운드). 렌더는 seek 기반 결정론 —
같은 입력이면 같은 픽셀이며, render-lint가 Math.random·Date.now·fetch를 거부합니다.

## [demos] 데모

| 데모 | 내용 |
|---|---|
| [v7-showcase](demos/v7-showcase) | **공식 쇼케이스** — 12씬 맥시멀 컷, 히어로 GIF의 원본 |
| [pilot-usage-v7](demos/pilot-usage-v7) | A/B 판정 파일럿 — 동일 카피·타이밍에서 연출만 교체, opus 3인 심사 3:0 승 |
| [docs/baseline](docs/baseline) | before/after 1fps 스트립 증거쌍 (구 슬라이드형 vs v7) |

v0.1.0 릴리스의 d1~d3 데모는 구 파이프라인 산출물로, 역사 기록으로만 남깁니다.

## [reference] 설정 레퍼런스

CLI와 설정은 [docs/usage.md](docs/usage.md), Studio는 [docs/studio.md](docs/studio.md),
파이프라인 재개는 [docs/pipeline.md](docs/pipeline.md), 컴파일러 계약은
[docs/compiler.md](docs/compiler.md), 프리셋 카탈로그는 [docs/design-presets.md](docs/design-presets.md),
갤러리 운영 규칙은 [GALLERY.md](skills/reelforge/references/gallery/GALLERY.md)를 봅니다.

## [omo] OmO / Senpi 스킬 패키지 (이 포크)

이 포크는 [gongnyang의 원본 ReelForge](https://github.com/gongnyang/reelforge)(Apache-2.0)를 OmO/Senpi git 스킬
패키지로 제공합니다. `package.json`의 `pi.skills`가 기존 `skills/reelforge`(전체 연출 루프)와 새 `skills/reelforge-shorts`
(원커맨드 9:16 쇼츠 어댑터)를 등록합니다. 엔진 코드는 바꾸지 않았습니다. `~/.omo/agent/settings.json`의 `packages`에 추가:

```json
"packages": ["git:github.com/Heoooooon/reelforge@omo-package"]
```

```bash
npm ci
bash skills/reelforge-shorts/scripts/make-sample.sh   # 인터뷰 예시 미디어 로컬 생성(macOS say)
node skills/reelforge-shorts/scripts/run.mjs --input skills/reelforge-shorts/examples/interview/input.json --out omo-out/interview
node scripts/verify.mjs                               # 실제 Senpi 로더 발견 검사
```

입력은 브리프(장면 헤드라인·나레이션) 또는 인터뷰 영상 + 자막(SRT/VTT) + B-roll 클립, 출력은 `shorts.mp4`(1080×1920)와
컨택트시트입니다. 계약: [skills/reelforge-shorts/references/io.md](skills/reelforge-shorts/references/io.md).

## [license-disclaimer] 라이선스와 면책

코드는 Apache-2.0입니다. 폰트, 음원, 이미지, TTS 산출물은 각자 라이선스와 서비스 조건을 따르며,
공개 배포 또는 상업 사용 전에는 프로젝트별 provenance를 확인해야 합니다.
쇼케이스 BGM은 자체 키리스 생성 파이프라인 산출물입니다.
