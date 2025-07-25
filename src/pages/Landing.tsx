import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ConnectGoogleButton from "@/components/ConnectGoogleButton";
import { useAuthStore } from "../store/authStore";
const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleGetStarted = () => {
    navigate("/chat");
  };
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Deana.AI Logo and Google Connect Button */}
      <header className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex-1"></div>
        <img
          src="/lovable-uploads/efb1c112-c79e-44ff-89be-4cf33f21c7f4.png"
          alt="Deana.AI"
          className="h-10 md:h-20 object-contain"
        />
        <div className="flex-1 flex justify-end">
          <ConnectGoogleButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8 relative">
            {/* Portrait Image with Fade Effect */}
            <div className="relative inline-block">
              <img
                src="/lovable-uploads/ff72edbe-57cf-4675-bddc-7865b13e2364.png"
                alt="Deana AI"
                className="w-80 h-100 mx-auto object-cover rounded-none"
              />
              {/* White fade overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
            </div>
          </div>

          {/* Text positioned to overlap with image bottom */}
          <div className="relative -mt-12 z-10">
            <h2 className="md:text-6xl font-bold text-gray-900 mb-6 text-3xl">
              Your personal AI Assistant
            </h2>
          </div>

          <p className="text-3xl md:text-4xl font-semibold text-gray-800 mb-12"></p>

          <p className="text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed text-base">
            Artificial Intelligence designed to help you in your everyday life
          </p>

          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                ✅ Connected as {user.email}
              </p>
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 bg-[#232a41] text-sm py-[23px] px-[125px]"
              >
                Start Chatting!
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 bg-[#232a41] text-sm py-[23px] px-[125px]"
            >
              Let's go!
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm"></footer>
    </div>
  );
};
export default Landing;
