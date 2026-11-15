let video;
let handModel;
let bodyModel;
let ws;

let hands = [];
let lastHandResult = -Infinity;
let lastSendTime = -Infinity;

const bodyState = {};
const handState = [null, null];

let fingerMasked = false;
let enterStartedAt = null;
let exitStartedAt = null;

let latestData = [];
let latestMetrics = null;

// ======================================================
// 1. 디버깅 설정: 우선 이 부분만 조절하면 됩니다.
// ======================================================

const CFG = {
  // ---------- 통신 ----------

  // Wekinator 전송 간격.
  // 100 = 최대 초당 10회.
  // 낮추면 전송이 빨라지지만, 모델 추적 자체가 빨라지지는 않음.
  // 높이면 통신량이 줄지만 반응이 느려질 수 있음.
  SEND_INTERVAL_MS: 100,

  // ---------- 관절 검출 ----------

  // 몸 관절을 사용할 최소 신뢰도.
  // 높이면 부정확한 점을 더 많이 버리지만 검출이 자주 끊길 수 있음.
  // 낮추면 더 많은 점을 사용하지만 잘못된 위치가 섞일 수 있음.
  BODY_MIN_CONFIDENCE: 0.4,

  // 모델이 손 전체에 제공하는 신뢰도 기준.
  // 손가락 하나하나의 정확도를 보장하는 값은 아님.
  HAND_MIN_CONFIDENCE: 0.5,

  // 관절을 잠깐 놓쳤을 때 마지막 좌표를 유지하는 시간.
  // 높이면 덜 깜빡이지만, 손을 치워도 예전 위치가 오래 남음.
  // 낮추면 실제 누락을 빨리 반영하지만 입력이 자주 끊길 수 있음.
  BODY_HOLD_MS: 600,
  HAND_HOLD_MS: 200,

  // 손 모델의 결과가 너무 오래 갱신되지 않으면 사용하지 않음.
  // 계산 속도가 느린 컴퓨터에서 너무 낮으면 손이 계속 사라질 수 있음.
  HAND_RESULT_TIMEOUT_MS: 600,

  // ---------- 좌표 부드럽게 만들기 ----------

  // 범위: 0 초과 ~ 1.
  // 높이면 새 위치를 빠르게 따라가지만 떨림이 더 보임.
  // 낮추면 부드러워지지만 움직임을 늦게 따라감.
  // 1이면 좌표를 부드럽게 만드는 효과가 없음.
  BODY_SMOOTHING: 0.4,
  HAND_SMOOTHING: 0.4,

  // 어깨너비가 이 픽셀값보다 작으면 몸 기준을 사용하지 않음.
  // 높이면 멀리 있는 사람이나 몸이 옆으로 돌아간 자세를 더 많이 제외함.
  MIN_SHOULDER_WIDTH_PX: 35,

  // ---------- 손가락 입력 가리기 ----------

  // true: 팔 자세에 따라 손가락 입력을 가림.
  // false: 가리기 기능을 끄고 항상 사용 가능한 손가락 입력을 전송.
  ENABLE_MASK: true,

  // 조건이 이 시간 동안 계속 맞아야 손가락 입력을 가림.
  // 높이면 잠깐 손을 모은 동작에는 반응하지 않음.
  // 낮추면 빠르게 가리지만 우연한 동작에도 작동할 수 있음.
  MASK_ENTER_MS: 300,

  // 해제 조건이 이 시간 동안 계속 유지돼야 손가락 입력을 복구.
  // 높이면 MASKED 상태가 안정적이지만 다른 동작으로 전환이 늦음.
  // 낮추면 빨리 복구되지만 경계에서 켜졌다 꺼질 수 있음.
  MASK_EXIT_MS: 500,

  // 거리와 위치는 어깨너비를 1로 보는 단위입니다.
  //
  // 예: 어깨너비가 200px일 때 0.6 = 약 120px.
  //
  // 양손목 거리가 이 값 이하일 때 진입 후보.
  // 높이면 손이 덜 모여도 가림.
  // 낮추면 손목이 더 가까워야 가림.
  ENTER_WRIST_GAP: 0.6,

  // 이미 가린 상태에서 이 값보다 벌어지면 해제 후보.
  // ENTER_WRIST_GAP보다 크게 유지하세요.
  // 높이면 손을 더 벌려야 복구됨.
  // 낮추면 조금만 벌려도 복구됨.
  EXIT_WRIST_GAP: 0.9,

  // 양손목 중간 지점이 몸 중심에서 얼마나 옆으로 가도 허용할지.
  // 높이면 몸 옆에서 손을 모아도 진입 가능.
  // 낮추면 몸 중앙에서 모았을 때만 진입.
  ENTER_CENTRE_X: 0.65,
  EXIT_CENTRE_X: 0.95,

  // 손목 중간 지점의 높이.
  // 어깨 중심이 0, 아래쪽이 +, 위쪽이 -.
  //
  // ENTER_Y_MIN을 낮추면 손을 더 높이 들어도 허용.
  // ENTER_Y_MAX를 높이면 손을 더 낮게 내려도 허용.
  ENTER_Y_MIN: -0.35,
  ENTER_Y_MAX: 1.5,

  // 해제 범위는 진입 범위보다 넓게 잡아 깜빡임을 줄임.
  EXIT_Y_MIN: -0.6,
  EXIT_Y_MAX: 1.85,

  // 팔꿈치 각도 / 180도.
  // 1 = 팔을 곧게 편 상태, 0.5 = 약 90도.
  //
  // 높이면 팔을 덜 굽혀도 진입 가능.
  // 낮추면 양팔을 더 많이 굽혀야 진입.
  ENTER_MAX_ELBOW: 0.88,
  EXIT_MAX_ELBOW: 0.97,

  // ---------- 손가락 특징값 ----------

  // 손목~손가락 끝 거리를 이 값으로 나눔.
  // 높이면 전송되는 숫자가 작아짐.
  // 낮추면 숫자가 커지고 1에 쉽게 도달함.
  // 픽셀 기준이므로 카메라와의 거리에도 영향을 받음.
  FINGER_DISTANCE_SCALE: 250,

  // 엄지~검지 끝 거리 정규화 기준.
  PINCH_DISTANCE_SCALE: 150
};

const INPUT_COUNT = 38;

const BODY_NAMES = [
  "left_shoulder", "right_shoulder",
  "left_elbow", "right_elbow",
  "left_wrist", "right_wrist"
];

const FEATURE_JOINTS = [
  "left_elbow", "right_elbow",
  "left_wrist", "right_wrist"
];

const ARM_LINES = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"]
];

const FINGER_LINES = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20]
];

// ======================================================
// 2. モデルの準備
// ======================================================

function preload() {
  handModel = ml5.handPose({
    maxHands: 2,
    flipped: false
  });

  bodyModel = ml5.bodyPose("BlazePose", {
    modelType: "lite",
    flipped: false
  });
}

function setup() {
  createCanvas(640, 480);
  pixelDensity(1);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  bodyModel.detectStart(video, updateBody);

  handModel.detectStart(video, results => {
    hands = results;
    lastHandResult = millis();
    updateHands(results);
  });

  connectBridge();
}

// ======================================================
// 3. Node.js 브릿지
// ======================================================

function connectBridge() {
  ws = new WebSocket("ws://localhost:8080");

  ws.onopen = () => {
    console.log("Connected. Wekinator inputs:", INPUT_COUNT);
  };

  ws.onerror = () => {
    console.log("Check the Node.js bridge on port 8080.");
  };

  ws.onclose = () => {
    setTimeout(connectBridge, 2000);
  };
}

// ======================================================
// 4. 몸 관절 추적
// ======================================================

function validPoint(p) {
  return p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y);
}

function updateBody(results) {
  const pose = results[0];
  if (!pose || !pose.keypoints) return;

  const now = millis();

  for (const name of BODY_NAMES) {
    const p = pose.keypoints.find(point => point.name === name);

    if (!validPoint(p)) continue;
    if ((p.confidence ?? 0) < CFG.BODY_MIN_CONFIDENCE) continue;

    const old = bodyState[name];

    if (!old || now - old.seenAt > CFG.BODY_HOLD_MS) {
      bodyState[name] = { x: p.x, y: p.y, seenAt: now };
    } else {
      old.x = lerp(old.x, p.x, CFG.BODY_SMOOTHING);
      old.y = lerp(old.y, p.y, CFG.BODY_SMOOTHING);
      old.seenAt = now;
    }
  }
}

function getJoint(name) {
  const p = bodyState[name];

  if (!p || millis() - p.seenAt > CFG.BODY_HOLD_MS) {
    return null;
  }

  return p;
}

function getReference() {
  const left = getJoint("left_shoulder");
  const right = getJoint("right_shoulder");

  if (!left || !right) return null;

  const scale = dist(left.x, left.y, right.x, right.y);
  if (scale < CFG.MIN_SHOULDER_WIDTH_PX) return null;

  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    scale
  };
}

function relativeXY(p, ref) {
  return [
    constrain((p.x - ref.x) / ref.scale, -3, 3),
    constrain((p.y - ref.y) / ref.scale, -3, 3)
  ];
}

function elbowAngle(a, b, c) {
  if (!a || !b || !c) return null;

  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const bx = c.x - b.x;
  const by = c.y - b.y;

  const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (denominator < 1) return null;

  const cosine = constrain(
    (ax * bx + ay * by) / denominator,
    -1,
    1
  );

  return Math.acos(cosine) / Math.PI;
}

// ガード条件とWekinatorの両方で使う姿勢の特徴
function getMetrics() {
  const ref = getReference();
  const ls = getJoint("left_shoulder");
  const rs = getJoint("right_shoulder");
  const le = getJoint("left_elbow");
  const re = getJoint("right_elbow");
  const lw = getJoint("left_wrist");
  const rw = getJoint("right_wrist");

  if (!ref || !ls || !rs || !le || !re || !lw || !rw) {
    return null;
  }

  const leftAngle = elbowAngle(ls, le, lw);
  const rightAngle = elbowAngle(rs, re, rw);

  if (leftAngle === null || rightAngle === null) return null;

  return {
    gap: dist(lw.x, lw.y, rw.x, rw.y) / ref.scale,
    centreX: ((lw.x + rw.x) / 2 - ref.x) / ref.scale,
    centreY: ((lw.y + rw.y) / 2 - ref.y) / ref.scale,
    maxElbow: Math.max(leftAngle, rightAngle)
  };
}

// ======================================================
// 5. 손가락 입력 가리기: 진입/해제 조건과 유지 시간
// ======================================================

function updateMask(metrics) {
  const now = millis();

  if (!CFG.ENABLE_MASK) {
    fingerMasked = false;
    enterStartedAt = null;
    exitStartedAt = null;
    return;
  }

  if (!fingerMasked) {
    // 아직 가리지 않은 상태: 좁은 진입 조건 사용
    const enterCondition = metrics &&
      metrics.gap <= CFG.ENTER_WRIST_GAP &&
      Math.abs(metrics.centreX) <= CFG.ENTER_CENTRE_X &&
      metrics.centreY >= CFG.ENTER_Y_MIN &&
      metrics.centreY <= CFG.ENTER_Y_MAX &&
      metrics.maxElbow <= CFG.ENTER_MAX_ELBOW;

    if (enterCondition) {
      if (enterStartedAt === null) enterStartedAt = now;

      if (now - enterStartedAt >= CFG.MASK_ENTER_MS) {
        fingerMasked = true;
        enterStartedAt = null;
        exitStartedAt = null;
      }
    } else {
      // 조건이 끊기면 진입 타이머를 처음부터 다시 시작
      enterStartedAt = null;
    }
  } else {
    // 이미 가린 상태: 더 넓은 유지 범위 사용
    const stayCondition = metrics &&
      metrics.gap <= CFG.EXIT_WRIST_GAP &&
      Math.abs(metrics.centreX) <= CFG.EXIT_CENTRE_X &&
      metrics.centreY >= CFG.EXIT_Y_MIN &&
      metrics.centreY <= CFG.EXIT_Y_MAX &&
      metrics.maxElbow <= CFG.EXIT_MAX_ELBOW;

    if (!stayCondition) {
      if (exitStartedAt === null) exitStartedAt = now;

      if (now - exitStartedAt >= CFG.MASK_EXIT_MS) {
        fingerMasked = false;
        exitStartedAt = null;
        enterStartedAt = null;
      }
    } else {
      // 유지 범위 안으로 돌아오면 해제 타이머 취소
      exitStartedAt = null;
    }
  }
}

// ======================================================
// 6. 손가락 특징 추출
// ======================================================

function rawHandFeatures(hand) {
  const p = hand.keypoints;
  const wrist = p[0];

  const values = [
    constrain(wrist.x / width, 0, 1),
    constrain(wrist.y / height, 0, 1)
  ];

  for (const index of [4, 8, 12, 16, 20]) {
    values.push(
      constrain(
        dist(wrist.x, wrist.y, p[index].x, p[index].y) /
          CFG.FINGER_DISTANCE_SCALE,
        0,
        1
      )
    );
  }

  values.push(
    constrain(
      dist(p[4].x, p[4].y, p[8].x, p[8].y) /
        CFG.PINCH_DISTANCE_SCALE,
      0,
      1
    )
  );

  return values;
}

function usableHand(hand) {
  return hand.keypoints &&
    hand.keypoints.length >= 21 &&
    hand.keypoints.every(validPoint) &&
    (hand.confidence ?? 1) >= CFG.HAND_MIN_CONFIDENCE;
}

function updateHands(results) {
  const now = millis();

  // Left/Right 라벨의 뒤집힘을 피하기 위해 화면 X순으로 배치.
  // A = 화면 왼쪽, B = 화면 오른쪽.
  // 실제 사람의 왼손/오른손을 의미하지 않음.
  const detected = results
    .filter(usableHand)
    .sort((a, b) => a.keypoints[0].x - b.keypoints[0].x)
    .slice(0, 2);

  const assigned = [null, null];

  if (detected.length === 2) {
    assigned[0] = detected[0];
    assigned[1] = detected[1];
  } else if (detected.length === 1) {
    const ref = getReference();
    const centreX = ref ? ref.x : width / 2;
    const slot = detected[0].keypoints[0].x < centreX ? 0 : 1;
    assigned[slot] = detected[0];
  }

  for (let i = 0; i < 2; i++) {
    if (!assigned[i]) continue;

    const values = rawHandFeatures(assigned[i]);
    const previous = handState[i];

    if (!previous || now - previous.seenAt > CFG.HAND_HOLD_MS) {
      handState[i] = { values, seenAt: now };
    } else {
      previous.values = values.map((value, index) =>
        lerp(previous.values[index], value, CFG.HAND_SMOOTHING)
      );
      previous.seenAt = now;
    }
  }
}

function getHandFeatures(slot) {
  // 가리는 중에는 검출 여부까지 포함해 9개를 모두 0으로 통일.
  // 그래서 손 인식의 깜빡임이 학습 입력에 반영되지 않음.
  // "가려서 0"인지 "미검출이라 0"인지는 마지막 mask 입력으로 구분.
  if (fingerMasked) return Array(9).fill(0);

  const state = handState[slot];

  if (
    !state ||
    millis() - state.seenAt > CFG.HAND_HOLD_MS ||
    millis() - lastHandResult > CFG.HAND_RESULT_TIMEOUT_MS
  ) {
    return Array(9).fill(0);
  }

  // 사용 가능 여부 1개 + 손 특징 8개
  return [1, ...state.values];
}

// ======================================================
// 7. 몸 자세 입력 19개
// ======================================================

function getBodyFeatures() {
  const ref = getReference();
  if (!ref) return Array(19).fill(0);

  const values = [];

  for (const name of FEATURE_JOINTS) {
    const p = getJoint(name);
    values.push(...(p ? [1, ...relativeXY(p, ref)] : [0, 0, 0]));
  }

  const ls = getJoint("left_shoulder");
  const rs = getJoint("right_shoulder");
  const le = getJoint("left_elbow");
  const re = getJoint("right_elbow");
  const lw = getJoint("left_wrist");
  const rw = getJoint("right_wrist");

  const bothWrists = Boolean(lw && rw);

  const gap = bothWrists
    ? constrain(dist(lw.x, lw.y, rw.x, rw.y) / ref.scale, 0, 6)
    : 0;

  const midpoint = bothWrists
    ? relativeXY({
        x: (lw.x + rw.x) / 2,
        y: (lw.y + rw.y) / 2
      }, ref)
    : [0, 0];

  values.push(
    gap,
    elbowAngle(ls, le, lw) ?? 0,
    elbowAngle(rs, re, rw) ?? 0,
    midpoint[0],
    midpoint[1],
    bothWrists ? 1 : 0,
    1
  );

  return values;
}

// ======================================================
// 8. 시각화
// ======================================================

function drawTracking() {
  push();

  stroke(255, 190, 40);
  strokeWeight(4);

  for (const [nameA, nameB] of ARM_LINES) {
    const a = getJoint(nameA);
    const b = getJoint(nameB);
    if (a && b) line(a.x, a.y, b.x, b.y);
  }

  noStroke();
  fill(255, 190, 40);

  for (const name of BODY_NAMES) {
    const p = getJoint(name);
    if (p) circle(p.x, p.y, 12);
  }

  // 가리는 중에도 손 모델은 계속 실행함.
  // 회색으로 표시해 "추적 중이지만 전송에는 사용 안 함"을 보여줌.
  if (millis() - lastHandResult < CFG.HAND_RESULT_TIMEOUT_MS) {
    const colour = fingerMasked
      ? color(140, 140, 140)
      : color(0, 230, 200);

    for (const hand of hands.filter(usableHand)) {
      const points = hand.keypoints;

      stroke(colour);
      strokeWeight(2);

      for (const finger of FINGER_LINES) {
        for (let i = 0; i < finger.length - 1; i++) {
          const a = points[finger[i]];
          const b = points[finger[i + 1]];
          line(a.x, a.y, b.x, b.y);
        }
      }

      noStroke();
      fill(colour);
      for (const p of points) circle(p.x, p.y, 6);
    }
  }

  pop();
}

function drawDebug(metrics) {
  push();
  noStroke();
  fill(0, 200);
  rect(0, 0, width, 132);

  fill(fingerMasked ? color(255, 130, 100) : color(0, 230, 200));
  textSize(17);
  text(
    fingerMasked
      ? "MASKED: finger inputs disabled"
      : "ACTIVE: available finger inputs enabled",
    12, 23
  );

  fill(255);
  textSize(13);

  const connected = ws && ws.readyState === WebSocket.OPEN;
  text(`Inputs: 38 | Bridge: ${connected ? "ON" : "OFF"}`, 12, 44);

  if (metrics) {
    text(
      `Gap: ${metrics.gap.toFixed(2)} | Centre X: ${
        metrics.centreX.toFixed(2)
      } | Y: ${metrics.centreY.toFixed(2)} | Elbow: ${
        metrics.maxElbow.toFixed(2)
      }`,
      12, 65
    );
  } else {
    text("Mask check unavailable: keep shoulders, elbows and wrists visible.", 12, 65);
  }

  const enterTime = enterStartedAt === null
    ? 0 : millis() - enterStartedAt;
  const exitTime = exitStartedAt === null
    ? 0 : millis() - exitStartedAt;

  text(
    `Enter: ${Math.round(enterTime)}/${CFG.MASK_ENTER_MS} ms | Exit: ${
      Math.round(exitTime)
    }/${CFG.MASK_EXIT_MS} ms`,
    12, 86
  );

  text("Orange: body | Green: fingers used | Grey: fingers masked", 12, 106);
  text("Press D to print features and mask measurements.", 12, 124);

  pop();
}

// ======================================================
// 9. 메인 실행
// ======================================================

function draw() {
  background(30);
  image(video, 0, 0, width, height);

  latestMetrics = getMetrics();
  updateMask(latestMetrics);

  latestData = [
    ...getBodyFeatures(),   // 1~19: 몸 자세
    ...getHandFeatures(0),  // 20~28: 화면 왼쪽 손
    ...getHandFeatures(1),  // 29~37: 화면 오른쪽 손
    fingerMasked ? 1 : 0    // 38: 손가락 입력 가리기 상태
  ];

  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    ws.bufferedAmount === 0 &&
    millis() - lastSendTime >= CFG.SEND_INTERVAL_MS
  ) {
    ws.send(JSON.stringify(latestData));
    lastSendTime = millis();
  }

  drawTracking();
  drawDebug(latestMetrics);
}

function keyPressed() {
  if (key === "d" || key === "D") {
    console.log("Mask measurements:", latestMetrics);
    console.log("Finger masked:", fingerMasked);
    console.log("Wekinator inputs:", latestData);
  }
}