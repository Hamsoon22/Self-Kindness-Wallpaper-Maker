import React, { useState } from "react";
import WallpaperMaker from "./WallpaperMaker";

export default function App() {
  const [step, setStep] = useState("input"); // "input" | "wallpaper"
  const [message, setMessage] = useState("");

  const goWallpaper = () => {
    if (!message.trim()) return;
    setStep("wallpaper");
  };

  const goBack = () => {
    setStep("input");
  };

  if (step === "input") {
    return (
      <div className="min-h-screen w-full bg-stone-50 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
          나에게 따뜻한 메세지 보내기
        </h1>
        <h2 className="text-sm sm:text-base font-normal tracking-tight mb-2">
          나에게 따뜻한 메세지를 보내고 배경화면으로 만들어보세요.
        </h2>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="오늘 나에게 따뜻한 메세지를 보내보세요."
          className="w-full max-w-md resize-y rounded-2xl border border-stone-200 p-3
                     focus:outline-none focus:ring-2 focus:ring-stone-400 text-sm sm:text-base
                     placeholder:text-stone-400 placeholder:italic"
        />
        <button
          onClick={goWallpaper}
          className="mt-4 px-5 py-3 rounded-xl bg-stone-900 text-white hover:bg-black"
        >
          보내기
        </button>
      </div>
    );
  }

  // 배경화면 생성 페이지
  return <WallpaperMaker initialMessage={message} onBack={goBack} />;
}
