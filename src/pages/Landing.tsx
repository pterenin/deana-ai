import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
const Landing = () => {
  const navigate = useNavigate();
  const handleGetStarted = () => {
    navigate('/chat');
  };
  return <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with Deana.AI Logo */}
      <header className="p-6 flex justify-center">
        <img src="/lovable-uploads/efb1c112-c79e-44ff-89be-4cf33f21c7f4.png" alt="Deana.AI" className="h-16 md:h-20 object-contain" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <img src="/lovable-uploads/802cd2ff-ea60-4a9b-8e68-fc6517c9522c.png" alt="Deana AI" className="w-48 h-48 rounded-full mx-auto mb-8 object-cover shadow-lg" />
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">Your personal
AI Assistent</h2>
          
          <p className="text-3xl md:text-4xl font-semibold text-gray-800 mb-12">
        </p>
          
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">Artificial Intelegence design to help you in your everyday life</p>
          
          <Button onClick={handleGetStarted} size="lg" className="bg-slate-700 hover:bg-slate-800 text-white px-12 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0">
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