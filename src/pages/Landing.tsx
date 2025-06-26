
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Mic, Volume2, Smartphone, Globe, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { useMobile } from '../hooks/useMobile';

const Landing = () => {
  const { isMobile } = useMobile();

  const features = [
    {
      icon: <MessageCircle className="h-8 w-8 text-purple-600" />,
      title: "Smart Conversations",
      description: "Engage in natural, intelligent conversations with our advanced AI assistant."
    },
    {
      icon: <Mic className="h-8 w-8 text-purple-600" />,
      title: "Voice Input",
      description: "Speak naturally and let our speech recognition convert your words to text instantly."
    },
    {
      icon: <Volume2 className="h-8 w-8 text-purple-600" />,
      title: "Text-to-Speech",
      description: "Listen to responses with high-quality, natural-sounding voice synthesis."
    },
    {
      icon: <Smartphone className="h-8 w-8 text-purple-600" />,
      title: "Mobile Optimized",
      description: "Perfect experience across all devices - web, iOS, and Android."
    },
    {
      icon: <Globe className="h-8 w-8 text-purple-600" />,
      title: "Always Connected",
      description: "Seamless synchronization across all your devices and platforms."
    },
    {
      icon: <Zap className="h-8 w-8 text-purple-600" />,
      title: "Lightning Fast",
      description: "Optimized for speed with instant responses and minimal loading times."
    }
  ];

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Header */}
        <header className={`${isMobile ? 'p-4' : 'p-6'} bg-white/80 backdrop-blur-sm border-b border-purple-100`}>
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-purple-600" />
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
                Bubbly Talk
              </h1>
            </div>
            <Link to="/chat">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Start Chatting
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className={`${isMobile ? 'py-12 px-4' : 'py-20 px-6'} text-center`}>
          <div className="max-w-4xl mx-auto">
            <h2 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold text-gray-900 mb-6`}>
              Your AI-Powered
              <span className="text-purple-600"> Conversation</span> Partner
            </h2>
            <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-600 mb-8 max-w-3xl mx-auto`}>
              Experience the future of communication with our intelligent chat assistant. 
              Speak naturally, get instant responses, and enjoy seamless conversations 
              across all your devices.
            </p>
            <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row space-x-4'} justify-center`}>
              <Link to="/chat">
                <Button 
                  size="lg" 
                  className={`bg-purple-600 hover:bg-purple-700 text-white ${isMobile ? 'w-full' : ''}`}
                >
                  Get Started Free
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className={`border-purple-200 text-purple-600 hover:bg-purple-50 ${isMobile ? 'w-full' : ''}`}
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className={`${isMobile ? 'py-12 px-4' : 'py-20 px-6'} bg-white/50`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 mb-4`}>
                Powerful Features
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Everything you need for intelligent, natural conversations
              </p>
            </div>
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'}`}>
              {features.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl text-center">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={`${isMobile ? 'py-12 px-4' : 'py-20 px-6'} bg-gradient-to-r from-purple-600 to-blue-600 text-white`}>
          <div className="max-w-4xl mx-auto text-center">
            <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-6`}>
              Ready to Start Talking?
            </h3>
            <p className={`${isMobile ? 'text-lg' : 'text-xl'} mb-8 opacity-90`}>
              Join thousands of users who are already enjoying smarter conversations
            </p>
            <Link to="/chat">
              <Button 
                size="lg" 
                className={`bg-white text-purple-600 hover:bg-gray-50 ${isMobile ? 'w-full' : ''}`}
              >
                Start Your First Conversation
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className={`${isMobile ? 'py-8 px-4' : 'py-12 px-6'} bg-gray-900 text-white`}>
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <MessageCircle className="h-6 w-6" />
              <span className="text-lg font-semibold">Bubbly Talk</span>
            </div>
            <p className="text-gray-400">
              Powered by advanced AI technology for natural conversations
            </p>
          </div>
        </footer>
      </div>
    </MobileLayout>
  );
};

export default Landing;
