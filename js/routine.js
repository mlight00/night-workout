// 운동 프로그램 정의 — 루틴을 바꾸려면 이 파일의 숫자만 고치면 된다.
// type 'hold' = 시간 버티기, type 'reps' = 횟수 반복(limitSeconds는 안전 상한)

export const ROUTINE = {
  readySeconds: 3, // 세트 시작 전 "준비" 카운트다운

  warmup: [
    { name: '어깨 회전', seconds: 40 },
    { name: '팔목·발목 돌리기', seconds: 40 },
    { name: '제자리 걷기', seconds: 50 },
    { name: '맨몸 스쿼트 10회', seconds: 50 },
  ],

  main: [
    { id: 'deadhang', name: '데드행', type: 'hold', seconds: 25, sets: 3, restSeconds: 60 },
    { id: 'pushup', name: '팔굽혀펴기', type: 'reps', reps: 12, limitSeconds: 60, sets: 3, restSeconds: 90 },
    { id: 'dips', name: '딥스 버티기', type: 'hold', seconds: 20, sets: 3, restSeconds: 60 },
    { id: 'legraise', name: '다리 들고 버티기', type: 'hold', seconds: 20, sets: 3, restSeconds: 60 },
  ],

  cooldown: [
    { name: '가슴 스트레칭', seconds: 60 },
    { name: '광배근 스트레칭', seconds: 60 },
    { name: '어깨 후면 스트레칭', seconds: 60 },
  ],
};
