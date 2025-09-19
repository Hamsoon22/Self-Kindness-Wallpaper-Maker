import React, { useState } from "react";
import WallpaperMaker from "./WallpaperMaker";

// 따뜻한 문구들 (단일 소스)
const WARM_PROMPTS_KO = [
  "오늘도 충분히 하고 있어.",
  "오늘 하루도 너무 수고많아",
  "괜찮아, 잠시 쉬어가도 돼.",
  "지금 너무 잘하고 있어.",
  "우리는 완벽하지 않으며, 완벽하지 않은것이 당연해.",
  "이 감정은 흘러가는 구름일 뿐, 나 자체가 아니야.",
  "내가 할 수 있는 건 지금 이 순간 숨 쉬며 존재하는 것, 그것만으로 충분해.",
  "힘들어도 내가 원하는 방향을 향해 작은 발걸음을 뗄 수 있어.",
  "괜찮아, 잠시 쉬어가도 돼. 나는 나를 기다려줄 거야.",
  "Here and now. 진짜 나는 지금, 그리고 여기에 있어.",
  "이 불편함도 내 일부야. 그냥 함께 있어줄 거야.",
  "생각은 파도처럼 오가고, 나는 그 파도를 보고 있는 거야.",
  "불안과 피로가 있어도, 내가 소중히 여기는 방향으로 갈거야.",
  "내가 원하는 삶은 고통이 '없는' 삶이 아니라, 가치가 '있는' 삶",
  "힘든 게 없어지지 않아도 내가 원하는 삶으로 나아갈 수 있어.",
  "내 안의 고통을 안으면서도 내가 소중히 여기는 길을 선택할 수 있어.",
  "내가 겪은 모든 일 때문에 나만이 잡아줄 수 있는 손이 있을 거야.",
  "머릿 속 소음보다 내가 지금 하는 행동이 더 중요해",
  "생각은 지나가지만, 행동은 나를 앞으로 데려갈 거야",
  "과거는 지나갔고, 미래는 아직 오지 않았어. 현재를 느끼고, 현재를 살자.",
  "내 생각과 감정은 생각과 감정일 뿐, 나 자체는 아닐 수도 있어.",
  "나는 충분해",
];

// public/img/ 아래에 bg1.jpg, bg2.jpg, bg3.jpg 두고 사용
const BACKGROUND_IMAGE_URLS = [
  `${process.env.PUBLIC_URL}/img/bg1.jpg`,
  `${process.env.PUBLIC_URL}/img/bg2.jpg`,
  `${process.env.PUBLIC_URL}/img/bg3.jpg`,
];

export default function App() {
  const [step, setStep] = useState("input"); // "input" | "wallpaper"
  const [message, setMessage] = useState("");

  const pickRandomMessage = () => {
    const i = Math.floor(Math.random() * WARM_PROMPTS_KO.length);
    setMessage(WARM_PROMPTS_KO[i]);
  };

  const goWallpaper = () => {
    if (!message.trim()) pickRandomMessage(); // 비었으면 자동 랜덤
    setStep("wallpaper");
  };

  if (step === "input") {
    return (
      <div className="min-h-screen w-full bg-stone-50 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
          나에게 따뜻한 메세지 보내기
        </h1>
        <h2 className="text-sm sm:text-base font-normal tracking-tight mb-2">
          랜덤 풍경 배경에 따뜻한 문구로 배경화면을 만들어보세요.
        </h2>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="직접 적거나, 아래 '랜덤 문구'를 눌러보세요."
          className="w-full max-w-md resize-y rounded-2xl border border-stone-200 p-3
                     focus:outline-none focus:ring-2 focus:ring-stone-400 text-sm sm:text-base
                     placeholder:text-stone-400 placeholder:italic"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={pickRandomMessage}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300"
          >
            랜덤 문구
          </button>
          <button
            onClick={goWallpaper}
            className="px-5 py-3 rounded-xl bg-stone-900 text-white hover:bg-black"
          >
            만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <WallpaperMaker
      initialMessage={message}
      backgroundImages={BACKGROUND_IMAGE_URLS}
      prompts={WARM_PROMPTS_KO}
    />
  );
}
