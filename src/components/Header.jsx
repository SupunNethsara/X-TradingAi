import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const Logo = () => (
  <div className="flex items-center gap-2">
    <img src="/logo.jpg" alt="X TradingAI Logo" className="h-14 w-auto md:h-20 lg:h-22" />
  </div>
);

const Header = ({ onLogin, onSignup }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const APP_ID = '114864';
  const REDIRECT_URI = `${window.location.origin}/oauth/callback`;
  const SIGNUP_URL = 'https://deriv.com/signup/';

  const handleLogin = () => {
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&response_type=code&redirect_uri=${encodeURIComponent(
      REDIRECT_URI,
    )}`;
    window.location.href = oauthUrl;
    onLogin?.();
  };

  const handleSignup = () => {
    window.location.href = SIGNUP_URL;
    onSignup?.();
  };

  return (
    <header className="h-12 md:h-20 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 flex-shrink-0 relative">
      <div className="flex items-center">
        <Logo />
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" onClick={handleLogin}>
            Log in
          </Button>
          <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleSignup}>
            Sign up
          </Button>
        </div>
        <button
          className="md:hidden p-1"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 h-5 flex flex-col justify-center gap-1">
            <span className="w-full h-0.5 bg-gray-600 rounded"></span>
            <span className="w-full h-0.5 bg-gray-600 rounded"></span>
            <span className="w-full h-0.5 bg-gray-600 rounded"></span>
          </div>
        </button>
      </div>
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg md:hidden z-50">
          <div className="flex flex-col p-3 gap-1.5">
            <Button
              variant="ghost"
              className="justify-start text-left h-10 text-sm"
              onClick={() => {
                handleLogin();
                setIsMenuOpen(false);
              }}
            >
              Log in
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white h-10 justify-start text-sm"
              onClick={() => {
                handleSignup();
                setIsMenuOpen(false);
              }}
            >
              Sign up
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;