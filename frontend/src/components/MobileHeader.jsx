import { Link } from "react-router-dom";

function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-dark/5 px-6 py-4 flex items-center justify-center">
      <Link to="/" className="flex items-center">
        <div className="h-8 w-auto">
          <svg className="h-full w-auto" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="40,10 75,30 75,70 40,90 5,70 5,30" fill="#4A5D4E" />
            <path d="M20 65 V35 L40 55 L60 35 V65" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <text x="95" y="55" fontFamily="Playfair Display, serif" fontWeight="bold" fontSize="36" fill="#1A1A1A">Maa Sheela</text>
            <text x="95" y="82" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="#1A1A1A" opacity="0.6" letterSpacing="6">IRON ARTS</text>
          </svg>
        </div>
      </Link>
    </header>
  );
}

export default MobileHeader;
