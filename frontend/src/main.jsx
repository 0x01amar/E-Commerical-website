import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom"
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'

// IMPORTANT: Replace this with your actual Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = "242855523750-bum23b4rlk7cuvdub6ah3ajmt1cb9c0t.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </GoogleOAuthProvider>
)
