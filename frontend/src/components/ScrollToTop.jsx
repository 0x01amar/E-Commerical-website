import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Immediate scroll to top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Fallback for cases where layout shifts or animations might happen after mount
    // Especially important for mobile browsers and page transitions
    const timeouts = [10, 50, 100, 200].map(ms => 
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, ms)
    );

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [location]);

  return null;
}
