# reelforge-shorts OMO 어댑터 — 입력·출력 계약

명령(패키지 루트에서):

```bash
node skills/reelforge-shorts/scripts/run.mjs --input <input.json> --out <dir> [--quality draft|high] [--tts mock|real]
```

| 옵션 | 의미 |
|---|---|
| `--input` | 아래 스키마의 JSON. 미디어 상대 경로는 이 파일 기준 |
| `--out` | 출력 디렉터리(없으면 생성). 기본값 `<input 디렉터리>/out` |
| `--quality` | hyperframes 렌더 품질 `draft`(기본) / `high` |
| `--tts` | `mock`(기본, 무음·키 불필요) / `real`(edge-tts 실음성, `pip install edge-tts`) |

## 공통 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `mode` | `"brief"` · `"interview"` | 필수 |
| `preset` | string | `fixtures/presets/<preset>.json`. 기본 `k-broadcast` |
| `quality` `tts` | string | CLI 옵션 기본값 |

## 브리프 모드

| 필드 | 설명 |
|---|---|
| `brief.scenes[]` | `{ headline, narration, narration_tts?, items?, quote?, attribution?, mood?, subtitleMode? }` |
| └ `items` 2개 이상 | ReelForge `list` 블록 |
| └ `quote` | ReelForge `quote` 블록(`attribution` = 화자) |
| └ 그 외 | `headline_only` |
| `brief.script` | `scenes` 대신 문단 텍스트(문단 = 장면, 헤드라인은 첫 문장 18자) |
| `brief.cta` | 마지막 장면 헤드라인/나레이션 |

흐름: `scene_specs.json`(`vf write` 스키마 검증) → `vf pipeline run --until images` → `vf compile --format 9:16` → `hyperframes render`.
장면 길이는 업스트림 규칙대로 나레이션(TTS 타이밍)에서 나온다.

## 인터뷰 모드

| 필드 | 설명 |
|---|---|
| `interview.video` | A-roll(임의 비율, 9:16 중앙 커버 크롭) |
| `interview.subtitles` | SRT 또는 VTT. 큐 텍스트의 `화자:` 라벨은 제거 |
| `interview.trim` | `{ start, end }` 초 — 이 구간만 사용(자막 시각도 이동) |
| `interview.broll[]` | `{ file, at, duration=2.5, src_start=0 }` — `at`은 원본 인터뷰 기준 초. 인터뷰 음성은 유지하고 화면만 컷어웨이 |
| `title` | 상단 고정 라벨(≤22자) |
| `hook` / `hook_narration` | 앞에 붙는 ReelForge 카드(9:16) |
| `cta` / `cta_narration` | 끝에 붙는 ReelForge 카드(9:16) |
| `min_card_seconds` | hook/cta 카드 최소 길이(기본 2.5초, 마지막 프레임 홀드) |
| `brand.color` | 상단 라벨 색 |

흐름: ffmpeg로 A-roll·B-roll 크롭/트림 → HyperFrames 컴포지션(`body/index.html`: A-roll + B-roll 클립 + 자막 캡션 + 원음)
→ 레포의 고정 hyperframes 0.7.26으로 렌더 → hook/cta는 ReelForge 9:16 컴파일·렌더 → ffmpeg로 정규화 후 이어 붙임.

## 출력 `<dir>/`

| 경로 | 내용 |
|---|---|
| `shorts.mp4` | 최종 1080×1920 30fps H.264 + AAC 48kHz |
| `contact.png` | 2초 간격 6×2 컨택트시트(육안 QC) |
| `frames/fNN.png` | 2초 간격 프레임 |
| `result.json` | `{ ok, mode, shorts, contact_sheet, frames_dir, probe }` |
| `brief/` · `intro/` · `outro/` | ReelForge 프로젝트(`scene_specs.json`, `build/`, `renders/`) |
| `body/` | 인터뷰 본문 HyperFrames 프로젝트와 `body.mp4` |

종료 코드: 0 = 성공, 1 = 입력 오류 또는 단계 실패(실패한 명령을 출력).
