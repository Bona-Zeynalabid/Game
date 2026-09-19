"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users, Crown, ArrowLeft, Globe } from "lucide-react";
import Button from "@/components/Button";
import SoloBoard from "@/components/SoloBoard";

export default function PlayPage() {
  const [mode, setMode] = useState(null);
  const router = useRouter();

  const showGame = (selectedMode) => {
    setMode(selectedMode);
  };

  const goBack = () => {
    setMode(null);
  };

  if (mode === "solo") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center">
        <button
          onClick={goBack}
          className="self-start mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <SoloBoard />
      </div>
    );
  }

  if (mode === "league") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <button
          onClick={goBack}
          className="self-start mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h2 className="text-2xl font-semibold mb-4">League Mode Coming Soon</h2>
        <p className="text-gray-400">This mode is not yet implemented.</p>
      </div>
    );
  }

  // Mode selection
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <h2 className="text-3xl font-bold mb-8">Choose Game Mode</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
        {/* Solo Card */}
        <div className="bg-dark-800 p-6 md:p-8 rounded-2xl border border-dark-600 flex flex-col items-center hover:border-yellow-bright/50 hover:shadow-lg hover:shadow-yellow-bright/10 transition-all duration-300">
          <div className="p-4 rounded-full bg-yellow-bright/10 mb-4">
            <User className="w-12 h-12 md:w-16 md:h-16 text-yellow-bright" />
          </div>
          <h3 className="text-xl md:text-2xl font-semibold mb-2">Solo</h3>
          <p className="text-gray-400 text-center text-sm md:text-base mb-6">
            Play against AI
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => showGame("solo")}
            className="mt-auto"
          >
            Start Solo
          </Button>
        </div>

        {/* Online Card (replaces Pair) */}
        <div className="bg-dark-800 p-6 md:p-8 rounded-2xl border border-dark-600 flex flex-col items-center hover:border-yellow-bright/50 hover:shadow-lg hover:shadow-yellow-bright/10 transition-all duration-300">
          <div className="p-4 rounded-full bg-yellow-bright/10 mb-4">
            <Globe className="w-12 h-12 md:w-16 md:h-16 text-yellow-bright" />
          </div>
          <h3 className="text-xl md:text-2xl font-semibold mb-2">Online</h3>
          <p className="text-gray-400 text-center text-sm md:text-base mb-6">
            Challenge another player
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.push("/online")}
            className="mt-auto"
          >
            Find Players
          </Button>
        </div>

        {/* League Card */}
        <div className="bg-dark-800 p-6 md:p-8 rounded-2xl border border-dark-600 flex flex-col items-center hover:border-yellow-bright/50 hover:shadow-lg hover:shadow-yellow-bright/10 transition-all duration-300">
          <div className="p-4 rounded-full bg-yellow-bright/10 mb-4">
            <Crown className="w-12 h-12 md:w-16 md:h-16 text-yellow-bright" />
          </div>
          <h3 className="text-xl md:text-2xl font-semibold mb-2">League</h3>
          <p className="text-gray-400 text-center text-sm md:text-base mb-6">
            Compete in ranked leagues
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.push("/league")}
            className="mt-auto"
          >
            Join League
          </Button>
        </div>
      </div>
    </div>
  );
}
