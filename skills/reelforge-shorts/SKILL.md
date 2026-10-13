---
name: reelforge-shorts
description: ReelForge로 9:16 쇼츠(1080×1920) MP4를 원커맨드로 만든다. 브리프(장면 헤드라인·나레이션·리스트·인용)만 주면 ReelForge 모션그래픽 쇼츠를, 인터뷰 영상+자막(SRT/VTT)+B-roll 클립을 주면 9:16 크롭·B-roll 컷어웨이·자막 캡션·훅/CTA 카드가 붙은 인터뷰 쇼츠를 만든다. 트리거 — "쇼츠 만들어", "인터뷰 쇼츠", "원장님 인터뷰 영상 쇼츠로", "자막 넣어서 세로 영상", "B-roll 넣어서 쇼츠", "브리프로 쇼츠", "ReelForge 쇼츠", "reelforge-shorts". Use for 9:16 shorts from a brief, or from an interview video plus subtitles plus B-roll clips.
---

# reelforge-shorts (OMO)

gongnyang의 Apache-2.0 [ReelForge](https://github.com/gongnyang/reelforge)를 OmO/Senpi에서 쓰는 쇼츠 전용 진입점이다.
전체 연출 루프(D1~D5 방향 고정·갤러리 라우팅·스트립 QC)는 같은 패키지의 [`reelforge`](../reelforge/SKILL.md) 스킬이 담당하고,
이 스킬은 **입력 → 쇼츠 MP4**를 한 번에 끝내는 어댑터다. 업스트림 코드는 수정하지 않는다.

## 경로

모든 경로는 **이 SKILL.md 기준 `../..` = 패키지 루트**다. 명령은 패키지 루트에서 실행한다.
입출력 계약 전체는 [references/io.md](references/io.md).

## 0. 최초 1회 설정

```bash
npm ci                                  # hyperframes 0.7.26 고정(레포 로컬)
./node_modules/.bin/hyperframes doctor  # 브라우저·ffmpeg 확인
```

ffmpeg/ffprobe가 필요하다. 실음성 TTS(`--tts real`)는 `pip install edge-tts`와 네트워크가 필요하고, 기본값 `mock`은 무음 키 없이 동작한다.

## 1. 입력 파일 작성

- **브리프 모드** `mode: "brief"`: `brief.scenes[]`(`headline` ≤18자 권장, `narration`, 선택 `items[]`(2개 이상이면 리스트) 또는
  `quote`+`attribution`(인용)), 선택 `brief.cta`. 장면 목록 대신 `brief.script`(문단=장면)도 받는다.
- **인터뷰 모드** `mode: "interview"`: `interview.video`, `interview.subtitles`(SRT/VTT, `원장:` 같은 화자 라벨 자동 제거),
  `interview.broll[]`(`file`, `at`(인터뷰 기준 초), `duration`, 선택 `src_start`), 선택 `interview.trim{start,end}`,
  `title`(상단 고정 라벨), `hook`(앞 카드), `cta`(끝 카드), `brand.color`.

예시: `examples/brief/input.json`, `examples/interview/input.json`
(인터뷰 예시 미디어는 `bash skills/reelforge-shorts/scripts/make-sample.sh`로 로컬 생성 — macOS `say` 사용).

## 2. 원커맨드 실행

```bash
node skills/reelforge-shorts/scripts/run.mjs --input <input.json> --out <dir> [--quality draft|high] [--tts mock|real]
```

결과: `<dir>/shorts.mp4`(1080×1920 30fps H.264+AAC), `<dir>/contact.png`(2초 간격 컨택트시트), `<dir>/frames/`, `<dir>/result.json`.

## 3. 확인과 보고

- `contact.png`와 `frames/`를 직접 열어 자막 가독성·B-roll 위치·카드 텍스트 줄바꿈을 확인한다.
- 문제가 있으면 입력(자막 문장 길이, B-roll `at`/`duration`, hook/cta 길이)을 고쳐 재실행한다. 빌드 HTML은 직접 고치지 않는다.
- 업로드·게시는 하지 않는다. 산출물 경로와 길이, 남은 문제를 보고한다.

## 원칙

- 인터뷰 원본의 발언을 자막에서 바꾸거나 없는 말을 넣지 않는다. 자막은 입력 SRT/VTT 그대로다.
- 의료·건강 콘텐츠는 효과 보장·최상급 표현을 hook/cta에 쓰지 않는다.
- 렌더는 한 번에 하나씩 돌린다(hyperframes 워커 3개 사용).
