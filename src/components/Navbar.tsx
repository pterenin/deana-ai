import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useChatStore } from "../store/chatStore";
import { Volume2, VolumeX } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isMuted, toggleMute } = useChatStore();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/lovable-uploads/efb1c112-c79e-44ff-89be-4cf33f21c7f4.png"
                alt="Deana.AI"
                className="h-8 w-auto"
              />
              <span className="sr-only">Deana.AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-1 ml-2">
              <NavLink to="/" className={linkClass} end>
                Home
              </NavLink>
              <NavLink to="/chat" className={linkClass}>
                Chat
              </NavLink>
              <NavLink to="/settings" className={linkClass}>
                Settings
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute toggle (desktop) */}
            <button
              onClick={toggleMute}
              className="hidden md:inline-flex p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={isMuted ? "Enable sound" : "Disable sound"}
              title={isMuted ? "Enable sound" : "Disable sound"}
            >
              {isMuted ? (
                <VolumeX size={18} className="text-gray-600" />
              ) : (
                <Volume2 size={18} className="text-gray-600" />
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Toggle navigation menu"
              aria-expanded={isOpen}
              onClick={() => setIsOpen((v) => !v)}
            >
              {isOpen ? (
                // X icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                // Hamburger icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay drawer (does not push content) */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed top-14 inset-x-0 bottom-0 bg-black/30 z-40 md:hidden"
            onClick={closeMenu}
          />
          {/* Drawer panel */}
          <div className="fixed top-14 right-0 bottom-0 w-64 max-w-[80vw] bg-white border-l shadow-lg z-50 md:hidden">
            <div className="p-3 flex flex-col gap-2">
              {/* Mute toggle (mobile) */}
              <button
                onClick={() => {
                  toggleMute();
                }}
                className="self-start p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label={isMuted ? "Enable sound" : "Disable sound"}
                title={isMuted ? "Enable sound" : "Disable sound"}
              >
                <span className="inline-flex items-center gap-2 text-gray-700 text-sm">
                  {isMuted ? (
                    <VolumeX size={18} className="text-gray-600" />
                  ) : (
                    <Volume2 size={18} className="text-gray-600" />
                  )}
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </button>

              <NavLink
                to="/"
                className={({ isActive }) => `block ${linkClass({ isActive })}`}
                end
                onClick={closeMenu}
              >
                Home
              </NavLink>
              <NavLink
                to="/chat"
                className={({ isActive }) => `block ${linkClass({ isActive })}`}
                onClick={closeMenu}
              >
                Chat
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) => `block ${linkClass({ isActive })}`}
                onClick={closeMenu}
              >
                Settings
              </NavLink>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
