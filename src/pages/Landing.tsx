import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
const Landing = () => {
  const navigate = useNavigate();
  const handleGetStarted = () => {
    navigate('/chat');
  };
  return <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center">
            <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 border-2 border-white rounded-sm transform rotate-45"></div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-medium text-gray-900">
              Write with{' '}
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent font-bold">
                Deana.AI
              </span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <img src="/lovable-uploads/802cd2ff-ea60-4a9b-8e68-fc6517c9522c.png" alt="Deana AI" className="w-32 h-32 rounded-full mx-auto mb-8 object-cover shadow-lg" />
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">Your personal
AI Assistent</h2>
          
          <p className="text-3xl md:text-4xl font-semibold text-gray-800 mb-12">
            It's Deana, What's up?
          </p>
          
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">Artificial Intelegence design to help you in your everyday life</p>
          
          <Button onClick={handleGetStarted} size="lg" className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500 text-white px-12 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            Let's go!
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>Powered by AI • Ready to assist you 24/7</p>
      </footer>
    </div>;
};
export default Landing;