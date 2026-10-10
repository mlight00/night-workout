# 야간 운동

치닝디핑·실내 자전거로 하는 하루 25~30분 주간 루틴을 음성과 3D 자세 모델로 안내하는 개인용 웹앱.

## 주소

**https://mlight00.github.io/night-workout/**

폰 크롬에서 열고 **메뉴 → 홈 화면에 추가**.

## 무엇을 하나

- **근력 → 자전거 → 근력 …** 번갈아 매일. 6일 연속이면 휴식을 권한다.
- **근력 날**: 매달리기 · 팔굽혀펴기 · 스쿼트 · 딥스 · 다리 들기, 종목마다 레벨 사다리.
- **자전거 날**: 목표 심박 105~120, 레벨이 오르면 시간이 늘고 언덕 구간이 붙는다.
- **시작 신호는 비프음** `삐·삐·삐·삐이—`. 종목 안내는 휴식 초반에 미리 하고, 끝나기 6초 전부터는 말하지 않는다.
- **레벨업**: 같은 레벨을 2번 연속 성공하면 버튼이 켜진다. 다음 운동 때 피곤하면 직전 성공은 무효.
- **컨디션 체크**: 피곤하면 가볍게(근력 2세트·자전거 ⅔), 아프면 스트레칭만.
- **3D 자세**: 휴식 중에 다음 동작의 바른 자세가 나온다. 「자세 보기」에서 피해야 할 자세, 뼈대 투시, 관절 확대, 실측값.
- **기록**: 체중(주 1회), 자전거 평균 심박, 근력 레벨 그래프. 기록은 폰 안에만 있고 파일로 내보낼 수 있다.

## 개발

빌드 도구가 없다.

```bash
node tools/serve.mjs 8124      # 로컬 확인 (http://localhost:8124/?speed=30 은 30배 빨리감기)
node --test                    # 테스트 (Windows에서 node --test tests/ 는 실패)
```

- 루틴 숫자: `js/program.js`
- 3D 동작: `js/body3d/poses.js` — 바꾼 뒤 `python tools/shot.py 이름 "deadhang:ok:0.5:62,..."` 로 렌더링해 확인
- 앱 화면 캡처: `python tools/appshot.py rest 412 860 30`

## 문서

- v2 설계: `docs/superpowers/specs/2026-10-10-weekly-routine-v2-design.md`
- v1 설계·계획: `docs/superpowers/specs/2026-07-21-night-workout-design.md`, `docs/superpowers/plans/2026-07-21-phase1-timer-app.md`
