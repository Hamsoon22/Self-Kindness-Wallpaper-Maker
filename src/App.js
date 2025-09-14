import React, { useEffect, useMemo, useRef, useState } from "react";

// Self-Kindness Wallpaper Maker (Mobile Optimized, flicker-free)
const BASE_LINE_HEIGHT = 1.8; // 줄간격 고정
const PADDING_RATIO = 0.06;   // 가로폭의 6% 패딩

const PRESET_SIZES = [
  { label: "iPhone 15/14 Pro (1179×2556)", w: 1179, h: 2556 },
  { label: "iPhone 15/14 (1170×2532)", w: 1170, h: 2532 },
  { label: "Galaxy S24 (1080×2340)", w: 1080, h: 2340 },
  { label: "Pixel 8 (1080×2400)", w: 1080, h: 2400 },
  { label: "2K Tall (1440×3200)", w: 1440, h: 3200 },
  { label: "Custom…", w: 1242, h: 2688 },
];

const FONT_FAMILIES = [
  { name: "Pretendard (Sans)", css: "800 48px Pretendard, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans KR, Helvetica, Arial" },
  { name: "Serif", css: "700 48px ui-serif, Georgia, Cambria, 'Times New Roman'" },
  { name: "Rounded", css: "800 48px 'SF Pro Rounded', 'Nunito', ui-sans-serif, system-ui" },
  { name: "Nanum Pen Script (Hand)", css: "700 48px 'Nanum Pen Script', cursive" },
  { name: "Poor Story (Hand)", css: "700 48px 'Poor Story', cursive" },
];

const WARM_PROMPTS_KO = [
  "오늘도 충분히 잘하고 있어요.",
  "자신의 꿈을 믿으세요.",
  "오늘 하루도 너무 수고했어",
  "나는 할 수 있어요. 진짜 해낼 수 있어요.",
  "괜찮아, 잠시 쉬어가도 돼.",
  "지금 너무너무 잘하고 있어.",
  "내가 얼마나 대단한지 절대 잊지말자",
  "나는 매일 조금 더 단단해진다.",
  "다른 사람이 나의 이야기를 대신 쓰게 만들지 마세요. 내 인생의 작가는 나입니다.",
  "우리는 완벽하지 않으며, 완벽하지 않은것이 당연해.",
];

const PALETTES = [
  ["#FFE6E0", "#FFD2A4", "#0B1220"],
  ["#EAF4F2", "#D5EAE4", "#0B1220"],
  ["#E9F2FF", "#CFE0FF", "#0B1020"],
  ["#F1EAFF", "#E4D6FF", "#0B1020"],
  ["#F7F4EF", "#EAE4DB", "#0B1220"],
  ["#FFE6EE", "#FFD3E3", "#0B1220"],
  ["#EFFFF8", "#D9F3EC", "#0B1220"],
  ["#0F172A", "#111827", "#FFFFFF"],
  ["#FFF3D6", "#FBD1A7", "#0B1220"],
  ["#DFF3FF", "#BFE4FF", "#0B1220"],
];

/* ---------- Color helpers for stronger gradients ---------- */
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function rgbToHex(r, g, b) {
  const to = (v) => v.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function rgbToHsl(r, g, b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max===min) { h=0; s=0; }
  else {
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
      default: h=0;
    }
    h/=6;
  }
  return { h: h*360, s: s*100, l: l*100 };
}
function hslToRgb(h, s, l) {
  h/=360; s/=100; l/=100;
  if (s===0){ const v = l*255; return {r:v,g:v,b:v}; }
  const hue2rgb = (p,q,t) => {
    if (t<0) t+=1; if (t>1) t-=1;
    if (t<1/6) return p+(q-p)*6*t;
    if (t<1/2) return q;
    if (t<2/3) return p+(q-p)*(2/3 - t)*6;
    return p;
  };
  const q = l<0.5 ? l*(1+s) : l + s - l*s;
  const p = 2*l - q;
  const r = hue2rgb(p,q,h+1/3), g = hue2rgb(p,q,h), b = hue2rgb(p,q,h-1/3);
  return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) };
}
function hslToHex(h,s,l){ const {r,g,b}=hslToRgb(h,s,l); return rgbToHex(r,g,b); }

/** 더 또렷한 그라디언트용으로 시작/중간/끝 3색을 만들어 준다 */
function enhanceGradient(hex1, hex2) {
  const { r:r1,g:g1,b:b1 } = hexToRgb(hex1);
  const { r:r2,g:g2,b:b2 } = hexToRgb(hex2);
  const c1 = rgbToHsl(r1,g1,b1);
  const c2 = rgbToHsl(r2,g2,b2);
  const s1 = hslToHex(c1.h, clamp(c1.s + 6, 0, 100), clamp(c1.l - 6, 0, 100));
  const s2 = hslToHex(c2.h, clamp(c2.s + 6, 0, 100), clamp(c2.l + 6, 0, 100));
  const midH = (c1.h + c2.h) / 2;
  const midL = clamp((c1.l + c2.l) / 2, 0, 100);
  const midS = clamp(((c1.s + c2.s)/2) + 10, 0, 100);
  const mid = hslToHex(midH, midS, midL);
  return [s1, mid, s2];
}

function useImage(url) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    if (!url) return setImg(null);
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.src = url;
    return () => { try { URL.revokeObjectURL(url); } catch (e) {} };
  }, [url]);
  return img;
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
      if (width > maxWidth && line) { lines.push(line); line = w; }
      else { line = test; }
    }
    lines.push(line);
  }
  const height = lines.length * lineHeight;
  return { lines, height };
}

export default function App() {
  // --- State ---
  const [message, setMessage] = useState("");
  const [sizeIdx, setSizeIdx] = useState(0);
  const [customW, setCustomW] = useState(1242);
  const [customH, setCustomH] = useState(2688);
  const [bgMode, setBgMode] = useState("gradient"); // 'gradient' | 'solid' | 'image'
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [solidColor, setSolidColor] = useState("#111827");
  const [overlay, setOverlay] = useState(0.08);
  const [fontIdx, setFontIdx] = useState(0);
  const [fontSize, setFontSize] = useState(84);
  const [textColor, setTextColor] = useState("#0B1220");
  const [bgFileUrl, setBgFileUrl] = useState("");
  const [grain, setGrain] = useState(0.06);

  // viewport 감지 (lg 이상이면 데스크톱)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const canvasRef = useRef(null);
  const previewFrameRef = useRef(null);

  const size = useMemo(() => {
    const preset = PRESET_SIZES[sizeIdx];
    return {
      w: preset.label === "Custom…" ? customW : preset.w,
      h: preset.label === "Custom…" ? customH : preset.h,
      label: preset.label,
    };
  }, [sizeIdx, customW, customH]);

  const bgImg = useImage(bgFileUrl);

  // 프레임 실측 크기 변화를 감지해서만 리드로우 (주소창 토글로 인한 깜빡임 방지)
  useEffect(() => {
    if (!previewFrameRef.current) return;
    let lastWidth = 0;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const cr = entry.contentRect;
      const w = Math.round(cr.width);
      if (w !== lastWidth) {
        lastWidth = w;
        draw(false);
      }
    });
    ro.observe(previewFrameRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 주요 상태 변화 시 그리기
  useEffect(() => {
    draw(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, size, bgMode, paletteIdx, solidColor, overlay, fontIdx, fontSize, textColor, bgImg, grain]);

  // actions
  function handlePickPrompt() {
    const pick = WARM_PROMPTS_KO[Math.floor(Math.random() * WARM_PROMPTS_KO.length)];
    setMessage(pick);
  }
  function handleRandomPalette() {
    const i = Math.floor(Math.random() * PALETTES.length);
    setPaletteIdx(i);
    setTextColor(PALETTES[i][2]);
  }
  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setBgFileUrl(url);
    setBgMode("image");
  }
  function useDeviceSize() {
    const w = Math.round(((window.screen && window.screen.width) || window.innerWidth) * (window.devicePixelRatio || 2));
    const h = Math.round(((window.screen && window.screen.height) || window.innerHeight) * (window.devicePixelRatio || 2));
    setSizeIdx(PRESET_SIZES.length - 1);
    setCustomW(w);
    setCustomH(h);
  }

  // drawing
  function draw(isExport) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const frame = previewFrameRef.current;
    const dpr = window.devicePixelRatio || 1;

    // 프리뷰: 프레임 실측 크기 사용 (모바일 주소창 변화에도 안정)
    const targetW = isExport
      ? size.w
      : Math.max(320, Math.round(frame?.clientWidth || 360));
    // 미리보기 frame은 aspect-[9/19.5]라 가드만 추가
    const targetH = isExport
      ? size.h
      : Math.max(Math.round(targetW * (19.5 / 9)), Math.round(frame?.clientHeight || 720));

    // CSS 크기와 내부 픽셀 크기 분리 + DPR 스케일
    canvas.style.width = `${targetW}px`;
    canvas.style.height = `${targetH}px`;
    canvas.width = Math.round(targetW * dpr);
    canvas.height = Math.round(targetH * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    if (bgMode === "gradient") {
      const [c1, c2] = PALETTES[paletteIdx];
      const [g0, gMid, g1] = enhanceGradient(c1, c2);
      const grad = ctx.createLinearGradient(0, 0, targetW, targetH);
      grad.addColorStop(0, g0);
      grad.addColorStop(0.5, gMid);
      grad.addColorStop(1, g1);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (bgMode === "solid") {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (bgMode === "image" && bgImg) {
      const img = bgImg;
      const rImg = img.width / img.height;
      const rCan = targetW / targetH;
      let dw = targetW, dh = targetH, dx = 0, dy = 0;
      if (rImg > rCan) { dh = targetH; dw = dh * rImg; dx = -(dw - targetW) / 2; }
      else { dw = targetW; dh = dw / rImg; dy = -(dh - targetH) / 2; }
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, targetW, targetH);
    }

    // Overlay
    if (overlay > 0) {
      ctx.fillStyle = `rgba(0,0,0,${overlay})`;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    // Subtle grain
    const grainAmt = isExport ? Math.min(0.12, grain) : Math.min(0.06, grain);
    if (grainAmt > 0) {
      const step = 2;
      for (let y = 0; y < targetH; y += step) {
        for (let x = 0; x < targetW; x += step) {
          const v = Math.random() * grainAmt;
          ctx.fillStyle = `rgba(255,255,255,${v.toFixed(3)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Text (정렬은 항상 중앙)
    const scale = isExport ? 1 : (targetW / size.w);
    const fSize = Math.max(10, Math.round(fontSize * scale));
    const fPad  = Math.max(16, Math.round(targetW * PADDING_RATIO));
    const fLH   = Math.round(fSize * BASE_LINE_HEIGHT);

    ctx.font = FONT_FAMILIES[fontIdx].css.replace("48px", `${fSize}px`);
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const maxWidth = targetW - fPad * 2;
    const x = targetW / 2;

    const { lines, height } = wrapText(ctx, message, maxWidth, fLH);
    let y = (targetH - height) / 2 + fLH / 2; // 세로 중앙 고정

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    for (const line of lines) {
      ctx.fillText(line, x, y, maxWidth);
      y += fLH;
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(true);
    const link = document.createElement("a");
    link.download = `self-kindness-${size.w}x${size.h}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    requestAnimationFrame(() => draw(false));
  }

  return (
    <div className="min-h-screen w-full bg-stone-50 text-stone-900 pb-10" style={{ overscrollBehavior: "contain" }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <header className="mb-4 sm:mb-6 flex items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Self-Kindness Wallpaper Maker</h1>
          <div className="hidden sm:block text-sm text-stone-500">한 번에 예쁜 문구 배경화면 만들기 ✨</div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Controls */}
          <div className="space-y-4 sm:space-y-5">
            {/* Message */}
            <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">메시지</span>
                <button className="text-xs px-2 py-1 rounded-full bg-stone-100 hover:bg-stone-200" onClick={handlePickPrompt}>랜덤 문구</button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="오늘 나에게 따뜻한 메세지를 보내보세요."
                className="w-full resize-y rounded-xl border border-stone-200 p-2 sm:p-3
                focus:outline-none focus:ring-2 focus:ring-stone-400 text-sm sm:text-base
                placeholder:text-stone-400 placeholder:italic"
              />
            </div>

            {/* Mobile: preview under message + buttons */}
            {!isDesktop && (
              <div className="mt-3">
                <div className="bg-white rounded-3xl shadow p-3 flex flex-col items-center">
                  <div className="w-full text-sm text-stone-500 mb-2">미리보기</div>
                  <div
                    ref={previewFrameRef}
                    className="relative w-full max-w-[430px] aspect-[9/19.5] rounded-[2rem] border-8 border-stone-900 overflow-hidden shadow-2xl"
                    style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                  >
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-2 bg-stone-900/90 rounded-full" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={useDeviceSize} className="px-3 py-2 rounded-xl bg-stone-100 text-sm">내 기기 해상도</button>
                  <button onClick={handleDownload} className="flex-1 px-4 py-2 rounded-xl bg-stone-900 text-white">PNG 다운로드</button>
                </div>
              </div>
            )}

            {/* Background */}
            <div className="bg-white rounded-2xl shadow p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">배경</span>
                <div className="flex flex-wrap gap-1 sm:gap-2 text-xs">
                  <button className={`px-2 sm:px-3 py-1 rounded-full border ${bgMode==='gradient'?"bg-stone-900 text-white border-stone-900":"border-stone-300"}`} onClick={()=>setBgMode('gradient')}>그라디언트</button>
                  <button className={`px-2 sm:px-3 py-1 rounded-full border ${bgMode==='solid'?"bg-stone-900 text-white border-stone-900":"border-stone-300"}`} onClick={()=>setBgMode('solid')}>단색</button>
                  <button className={`px-2 sm:px-3 py-1 rounded-full border ${bgMode==='image'?"bg-stone-900 text-white border-stone-900":"border-stone-300"}`} onClick={()=>setBgMode('image')}>이미지</button>
                </div>
              </div>

              {bgMode === "gradient" && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {PALETTES.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setPaletteIdx(i); setTextColor(p[2]); }}
                      className={`rounded-xl h-8 sm:h-9 border ${paletteIdx===i?"ring-2 ring-stone-900 border-stone-900":"border-stone-200"}`}
                      style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }}
                    />
                  ))}
                </div>
              )}

              {bgMode === "solid" && (
                <div className="flex items-center gap-3 mt-2">
                  <label className="text-xs text-stone-500">색상</label>
                  <input type="color" value={solidColor} onChange={(e)=>setSolidColor(e.target.value)} />
                </div>
              )}

              {bgMode === "image" && (
                <div className="flex items-center gap-3 mt-2">
                  <input type="file" accept="image/*" onChange={onFile} className="text-xs sm:text-sm" />
                  <span className="text-xs text-stone-500">세로 사진 권장</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="text-xs text-stone-500 w-24">어둡게(대비)</label>
                <input type="range" min={0} max={0.5} step={0.01} value={overlay} onChange={(e)=>setOverlay(parseFloat(e.target.value))} className="w-full" />
                <span className="text-xs w-10 text-right">{overlay.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-stone-500 w-24">종이 질감</label>
                <input type="range" min={0} max={0.12} step={0.01} value={grain} onChange={(e)=>setGrain(parseFloat(e.target.value))} className="w-full" />
                <span className="text-xs w-10 text-right">{grain.toFixed(2)}</span>
              </div>
            </div>

            {/* Text Style */}
            <div className="bg-white rounded-2xl shadow p-4 sm:p-5 space-y-3">
              <div className="font-semibold">텍스트 스타일</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-500">폰트</label>
                  <select className="w-full mt-1 rounded-lg border border-stone-300 p-2 text-sm" value={fontIdx} onChange={(e)=>setFontIdx(parseInt(e.target.value))}>
                    {FONT_FAMILIES.map((f, i) => (
                      <option key={i} value={i}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-500">크기</label>
                  <input className="w-full mt-1 rounded-lg border border-stone-300 p-2" type="number" value={fontSize} onChange={(e)=>setFontSize(parseInt(e.target.value||'0')||1)} />
                </div>
                <div>
                  <label className="text-xs text-stone-500">텍스트 색</label>
                  <input className="w-full mt-1" type="color" value={textColor} onChange={(e)=>setTextColor(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Size & Export */}
            <div className="bg-white rounded-2xl shadow p-4 sm:p-5 space-y-3">
              <div className="font-semibold">크기 & 내보내기</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-500">해상도</label>
                  <select className="w-full mt-1 rounded-lg border border-stone-300 p-2" value={sizeIdx} onChange={(e)=>setSizeIdx(parseInt(e.target.value))}>
                    {PRESET_SIZES.map((s, i) => (
                      <option key={i} value={i}>{s.label}</option>
                    ))}
                  </select>
                </div>
                {PRESET_SIZES[sizeIdx].label === "Custom…" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-stone-500">너비</label>
                      <input className="w-full mt-1 rounded-lg border border-stone-300 p-2" type="number" value={customW} onChange={(e)=>setCustomW(parseInt(e.target.value||'0')||1)} />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500">높이</label>
                      <input className="w-full mt-1 rounded-lg border border-stone-300 p-2" type="number" value={customH} onChange={(e)=>setCustomH(parseInt(e.target.value||'0')||1)} />
                    </div>
                  </div>
                )}
              </div>
              {isDesktop && (
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={useDeviceSize} className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-sm">내 기기 해상도 추정</button>
                  <button onClick={handleDownload} className="px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-black">PNG로 다운로드</button>
                  <span className="text-xs text-stone-500">다운로드 후 휴대폰에서 배경화면으로 설정하세요.</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop-only preview */}
          {isDesktop && (
            <div className="bg-white rounded-3xl shadow p-3 sm:p-5 flex flex-col items-center lg:sticky lg:top-2 h-fit">
              <div className="w-full text-sm text-stone-500 mb-2">미리보기</div>
              <div
                ref={previewFrameRef}
                className="relative w-full max-w-[430px] aspect-[9/19.5] rounded-[2rem] sm:rounded-[3rem] border-8 border-stone-900 overflow-hidden shadow-2xl"
                style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
              >
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-2 bg-stone-900/90 rounded-full"/>
              </div>
              <div className="mt-3 sm:mt-4 text-xs text-stone-500 text-center leading-relaxed">
                미리보기는 축소되어 보일 수 있습니다. 실제 저장 파일은 선택한 해상도로 선명하게 생성됩니다.
              </div>
            </div>
          )}
        </div>

        <footer className="mt-16 sm:mt-8 text-center text-xs text-stone-500">
          © Self-Kindness — created with love. 배경 이미지는 저작권을 확인하고 사용하세요.
        </footer>
      </div>
    </div>
  );
}
