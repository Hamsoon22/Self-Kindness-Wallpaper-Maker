import React, { useEffect, useMemo, useRef, useState } from "react";

// 최소 옵션: 해상도/다운로드만 유지, 나머지 자동
const BASE_LINE_HEIGHT = 1.8; // 라인하이트 고정
const PADDING_RATIO = 0.06;   // 가로폭의 6% 패딩

const PRESET_SIZES = [
  { label: "iPhone 15/14 Pro (1179×2556)", w: 1179, h: 2556 },
  { label: "iPhone 15/14 (1170×2532)", w: 1170, h: 2532 },
  { label: "Galaxy S24 (1080×2340)", w: 1080, h: 2340 },
  { label: "Pixel 8 (1080×2400)", w: 1080, h: 2400 },
  { label: "2K Tall (1440×3200)", w: 1440, h: 3200 },
  { label: "Custom…", w: 1242, h: 2688 },
];

// 고정 폰트(가독성 좋은 굵은 산세리프)
const FONT_CSS =
  "800 84px Pretendard, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans KR', Helvetica, Arial";

// 부드러운 텍스트 표현을 위한 얇은 오버레이/그레인
const DEFAULT_OVERLAY = 0.08;
const DEFAULT_GRAIN = 0.05;

function usePreloadedImages(urls = []) {
  const [images, setImages] = useState([]);
  useEffect(() => {
    let mounted = true;
    const loaders = urls.map(
      (url) =>
        new Promise((res) => {
          const img = new Image();
          img.crossOrigin = "anonymous"; // 동일 출처면 문제 없음
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = url;
        })
    );
    Promise.all(loaders).then((imgs) => {
      if (!mounted) return;
      setImages(imgs.filter(Boolean));
    });
    return () => {
      mounted = false;
    };
  }, [urls]);
  return images;
}

function wrapText(ctx, text, maxWidth, lineHeight) {
  const lines = [];
  const paragraphs = (text || "").split(/\n/);
  for (const p of paragraphs) {
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      const width = ctx.measureText(test).width;
      if (width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  const height = lines.length * lineHeight;
  return { lines, height };
}

export default function WallpaperMaker({
  initialMessage = "",
  prompts = [], // App에서 내려온 문구 배열
  backgroundImages = [], // 문자열 URL 배열
}) {
  // 메시지 & 더티: 사용자 입력을 부모 값으로 덮어쓰지 않기
  const [message, setMessage] = useState(initialMessage || "");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setMessage(initialMessage || "");
  }, [initialMessage, dirty]);

  const [sizeIdx, setSizeIdx] = useState(0);
  const [customW, setCustomW] = useState(1242);
  const [customH, setCustomH] = useState(2688);

  const [bgIdx, setBgIdx] = useState(() =>
    Math.floor(Math.random() * Math.max(1, backgroundImages.length))
  );
  const imgs = usePreloadedImages(backgroundImages);

  // 데스크톱 여부(레이아웃 클래스만 제어; 렌더 조건 분기로 캔버스 교체하지 않음)
  // const [isDesktop, setIsDesktop] = useState(() =>
  //   typeof window !== "undefined" &&
  //   window.matchMedia("(min-width: 1024px)").matches
  // );
  // useEffect(() => {
  //   const mq = window.matchMedia("(min-width: 1024px)");
  //   const onChange = (e) => setIsDesktop(e.matches);
  //   mq.addEventListener("change", onChange);
  //   return () => mq.removeEventListener("change", onChange);
  // }, []);

  const canvasRef = useRef(null);
  const previewFrameRef = useRef(null);

  // 오프스크린 버퍼 & rAF 스케줄링 & 그레인 패턴
  const bufferRef = useRef(null);
  const [pendingDraw, setPendingDraw] = useState(false);
  const grainPatternRef = useRef(null);

  function ensureBuffer(w, h) {
    let buf = bufferRef.current;
    if (!buf) {
      buf = document.createElement("canvas");
      bufferRef.current = buf;
    }
    if (buf.width !== w || buf.height !== h) {
      buf.width = w;
      buf.height = h;
    }
    return buf;
  }

  function scheduleDraw(isExport = false) {
    if (pendingDraw) return;
    setPendingDraw(true);
    requestAnimationFrame(() => {
      draw(isExport);
      setPendingDraw(false);
    });
  }

  const size = useMemo(() => {
    const preset = PRESET_SIZES[sizeIdx];
    return {
      w: preset.label === "Custom…" ? customW : preset.w,
      h: preset.label === "Custom…" ? customH : preset.h,
      label: preset.label,
    };
  }, [sizeIdx, customW, customH]);

  // 프레임 리사이즈 시 rAF로 묶어서 리드로우 + 임계값
  useEffect(() => {
    if (!previewFrameRef.current) return;
    let lastW = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (Math.abs(w - lastW) < 2) return; // 1~2px 변화 무시
      lastW = w;
      scheduleDraw(false);
    });
    ro.observe(previewFrameRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 주요 상태 변화 시 rAF로 리드로우
  useEffect(() => {
    scheduleDraw(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, size, bgIdx, imgs.length]);

  function nextBackground() {
    if (!imgs.length) return;
    setBgIdx((i) => (i + 1) % imgs.length);
  }

  function useDeviceSize() {
    const w = Math.round(
      ((window.screen && window.screen.width) || window.innerWidth) *
        (window.devicePixelRatio || 2)
    );
    const h = Math.round(
      ((window.screen && window.screen.height) || window.innerHeight) *
        (window.devicePixelRatio || 2)
    );
    setSizeIdx(PRESET_SIZES.length - 1);
    setCustomW(w);
    setCustomH(h);
  }

  function draw(isExport) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const frame = previewFrameRef.current;
    const dpr = window.devicePixelRatio || 1;

    const targetW = isExport
      ? size.w
      : Math.max(320, Math.round(frame?.clientWidth || 360));
    const targetH = isExport
      ? size.h
      : Math.max(
          Math.round(targetW * (19.5 / 9)),
          Math.round(frame?.clientHeight || 720)
        );

    // 1) 보이는 캔버스 CSS 크기만 반영
    if (canvas.style.width !== `${targetW}px`) canvas.style.width = `${targetW}px`;
    if (canvas.style.height !== `${targetH}px`) canvas.style.height = `${targetH}px`;

    // 2) 내부 픽셀 크기는 변경시에만 반영 (자주 바꾸면 깜빡임)
    const needResizePixels =
      canvas.width !== Math.round(targetW * dpr) ||
      canvas.height !== Math.round(targetH * dpr);
    if (needResizePixels) {
      canvas.width = Math.round(targetW * dpr);
      canvas.height = Math.round(targetH * dpr);
    }

    const ctx = canvas.getContext("2d");
    // 화면에는 스케일 없이 원본 픽셀로만 복사
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // === 오프스크린 버퍼에 먼저 전부 그림 ===
    const buf = ensureBuffer(canvas.width, canvas.height);
    const bctx = buf.getContext("2d");

    // 초기화
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, buf.width, buf.height);

    // 버퍼 좌표계에 DPR 반영
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // --- Background (이미지 cover) ---
    if (imgs.length) {
      const img = imgs[Math.min(bgIdx, imgs.length - 1)];
      const rImg = img.width / img.height;
      const rCan = targetW / targetH;
      let dw = targetW,
        dh = targetH,
        dx = 0,
        dy = 0;
      if (rImg > rCan) {
        dh = targetH;
        dw = dh * rImg;
        dx = -(dw - targetW) / 2;
      } else {
        dw = targetW;
        dh = dw / rImg;
        dy = -(dh - targetH) / 2;
      }
      bctx.drawImage(img, dx, dy, dw, dh);
    } else {
      bctx.fillStyle = "#111827";
      bctx.fillRect(0, 0, targetW, targetH);
    }

    // --- Overlay ---
    if (DEFAULT_OVERLAY > 0) {
      bctx.fillStyle = `rgba(0,0,0,${DEFAULT_OVERLAY})`;
      bctx.fillRect(0, 0, targetW, targetH);
    }

    // --- Grain ---
    if (isExport) {
      const grainAmt = Math.min(0.12, DEFAULT_GRAIN);
      if (grainAmt > 0) {
        const step = 2;
        for (let y = 0; y < targetH; y += step) {
          for (let x = 0; x < targetW; x += step) {
            const v = Math.random() * grainAmt;
            bctx.fillStyle = `rgba(255,255,255,${v.toFixed(3)})`;
            bctx.fillRect(x, y, 1, 1);
          }
        }
      }
    } else {
      // 프리뷰: 가벼운 패턴 1회 생성 후 재사용
      if (!grainPatternRef.current) {
        const p = document.createElement("canvas");
        p.width = 64;
        p.height = 64;
        const pctx = p.getContext("2d");
        const amt = Math.min(0.06, DEFAULT_GRAIN);
        for (let y = 0; y < p.height; y += 2) {
          for (let x = 0; x < p.width; x += 2) {
            const v = Math.random() * amt;
            pctx.fillStyle = `rgba(255,255,255,${v.toFixed(3)})`;
            pctx.fillRect(x, y, 1, 1);
          }
        }
        grainPatternRef.current = bctx.createPattern(p, "repeat");
      }
      if (grainPatternRef.current) {
        bctx.fillStyle = grainPatternRef.current;
        bctx.fillRect(0, 0, targetW, targetH);
      }
    }

    // --- Text ---
    const scale = isExport ? 1 : targetW / size.w;
    const fontSize = Math.max(14, Math.round(84 * scale));
    const pad = Math.max(16, Math.round(targetW * PADDING_RATIO));
    const lineH = Math.round(fontSize * BASE_LINE_HEIGHT);

    bctx.font = FONT_CSS.replace("84px", `${fontSize}px`);
    bctx.fillStyle = "#FFFFFF";
    bctx.textAlign = "center";
    bctx.textBaseline = "alphabetic";

    const maxWidth = targetW - pad * 2;
    const x = targetW / 2;

    const { lines, height } = wrapText(bctx, message, maxWidth, lineH);
    let y = (targetH - height) / 2 + lineH / 2;

    bctx.shadowColor = "rgba(0,0,0,0.25)";
    bctx.shadowBlur = Math.round(fontSize * 0.06);
    bctx.shadowOffsetX = 0;
    bctx.shadowOffsetY = 0;

    for (const line of lines) {
      bctx.fillText(line, x, y, maxWidth);
      y += lineH;
    }

    // === 마지막에 한 번만 화면으로 복사 ===
    ctx.drawImage(buf, 0, 0);
  }

  // App에서 내려온 prompts로 랜덤 선택
  const pickRandomFromPrompts = () => {
    if (!prompts.length) return;
    const i = Math.floor(Math.random() * prompts.length);
    setMessage(prompts[i]);
    setDirty(true);
  };

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 내보내기: 즉시 그린 뒤 다운로드
    draw(true);
    const link = document.createElement("a");
    link.download = `self-kindness-${size.w}x${size.h}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    // 프리뷰 복원은 rAF 스케줄
    scheduleDraw(false);
  }

  return (
    <div
      className="min-h-screen w-full bg-stone-50 text-stone-900 pb-10"
      style={{ overscrollBehavior: "contain" }}
    >
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <header className="mb-4 sm:mb-6 flex items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Self-Kindness Wallpaper
          </h1>
          <div className="hidden sm:block text-sm text-stone-500">
            예쁜 풍경 배경 + 따뜻한 문구 ✨
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left: Controls (최소화) */}
          <div className="space-y-4 sm:space-y-5">
            {/* Message */}
            <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">메시지</span>
                <button
                  className="text-xs px-2 py-1 rounded-full bg-stone-100 hover:bg-stone-200"
                  onClick={pickRandomFromPrompts}
                >
                  랜덤 문구
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setDirty(true);
                }}
                rows={4}
                placeholder="문구를 적어보세요. (엔터로 줄바꿈)"
                className="w-full resize-y rounded-xl border border-stone-200 p-2 sm:p-3
                  focus:outline-none focus:ring-2 focus:ring-stone-400 text-sm sm:text-base
                  placeholder:text-stone-400 placeholder:italic"
              />
            </div>

            {/* Size & Export (최소 유지) */}
            <div className="bg-white rounded-2xl shadow p-4 sm:p-5 space-y-3">
              <div className="font-semibold">크기 & 내보내기</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-500">해상도</label>
                  <select
                    className="w-full mt-1 rounded-lg border border-stone-300 p-2"
                    value={sizeIdx}
                    onChange={(e) => setSizeIdx(parseInt(e.target.value))}
                  >
                    {PRESET_SIZES.map((s, i) => (
                      <option key={i} value={i}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                {PRESET_SIZES[sizeIdx].label === "Custom…" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-stone-500">너비</label>
                      <input
                        className="w-full mt-1 rounded-lg border border-stone-300 p-2"
                        type="number"
                        value={customW}
                        onChange={(e) =>
                          setCustomW(parseInt(e.target.value || "0") || 1)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500">높이</label>
                      <input
                        className="w-full mt-1 rounded-lg border border-stone-300 p-2"
                        type="number"
                        value={customH}
                        onChange={(e) =>
                          setCustomH(parseInt(e.target.value || "0") || 1)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={nextBackground}
                  className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-sm"
                >
                  다른 배경 보기
                </button>
                <button
                  onClick={useDeviceSize}
                  className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-sm"
                >
                  내 기기 해상도 추정
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-black"
                >
                  PNG로 다운로드
                </button>
                <span className="text-xs text-stone-500">
                  다운로드 후 휴대폰에서 배경화면으로 설정하세요.
                </span>
              </div>
            </div>
          </div>

          {/* Right: Preview — 항상 1개만 렌더 (언마운트 금지!) */}
          <div className="bg-white rounded-3xl shadow p-3 sm:p-5 flex flex-col items-center lg:sticky lg:top-2 h-fit">
            <div className="w-full text-sm text-stone-500 mb-2">미리보기</div>
            <div
              ref={previewFrameRef}
              className="relative w-full max-w-[430px] aspect-[9/19.5] rounded-[2rem] sm:rounded-[3rem] border-8 border-stone-900 overflow-hidden shadow-2xl"
              style={{
                WebkitTransform: "translateZ(0)",
                willChange: "transform",
                backfaceVisibility: "hidden",
                contain: "paint layout size",
              }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ backgroundColor: "transparent", display: "block" }}
              />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-2 bg-stone-900/90 rounded-full" />
            </div>

            <div className="mt-3 sm:mt-4 text-xs text-stone-500 text-center leading-relaxed">
              미리보기는 축소되어 보일 수 있습니다. 실제 저장 파일은 선택한 해상도로 선명하게 생성됩니다.
            </div>
          </div>
        </div>

        <footer className="mt-16 sm:mt-8 text-center text-xs text-stone-500">
          © Self-Kindness — created with love. 배경 이미지는 저작권을 확인하고 사용하세요.
        </footer>
      </div>
    </div>
  );
}
