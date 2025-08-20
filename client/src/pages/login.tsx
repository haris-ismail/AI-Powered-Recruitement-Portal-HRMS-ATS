import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { setCsrfToken, getCurrentUser } from "@/lib/auth";
import "./login-custom.css";
import logo from "@/assets/NASTPLogo.png";
import adminIcon from "@/assets/admin-icon.svg";
import candidateIcon from "@/assets/candidate-icon.svg";
import bgImg from "@/assets/background.jpg";
import pagelogo from "@/assets/logo.png";


export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("admin");
  const [showSignup, setShowSignup] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        if (user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/candidate");
        }
      }
    });
  }, [navigate]);

  const clearErrors = () => {
    setErrorTitle(null);
    setErrorDetails(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    clearErrors();
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorDetails(null);
    setErrorTitle(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      console.log('Attempting login with:', { email });
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);
      
      if (!response.ok) {
        let errorMessage = 'Login failed';
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorDetails = errorData.details || errorData.error || '';
          console.error('Server error details:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Enhanced error messages based on status codes
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid request data. Please check your email and password format.';
            break;
          case 401:
            errorMessage = 'Invalid credentials. Please check your email and password.';
            break;
          case 403:
            errorMessage = 'Access denied. Your account may be locked or suspended.';
            break;
          case 404:
            errorMessage = 'Login service not found. Please contact support.';
            break;
          case 500:
            errorMessage = 'Server error occurred. Please try again later.';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage = `Login failed (${response.status}): ${errorMessage}`;
        }
        
        const fullErrorMessage = errorDetails ? `${errorMessage}\n\nDetails: ${errorDetails}` : errorMessage;
        throw new Error(fullErrorMessage);
      }

      const data = await response.json();
      console.log('Login successful, user data:', data);
      
      // Store CSRF token (safe to store in localStorage)
      setCsrfToken(data.csrfToken);

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Redirect based on role
      if (data.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/candidate/profile");
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Enhanced error categorization
      let errorTitle = "Login failed";
      let errorDescription = "An unexpected error occurred. Please try again.";
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorTitle = "Network Error";
        errorDescription = "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error.message.includes('Failed to fetch')) {
        errorTitle = "Connection Error";
        errorDescription = "The server is not responding. Please try again later or contact support.";
      } else if (error.message.includes('Invalid credentials')) {
        errorTitle = "Authentication Failed";
        errorDescription = "The email or password you entered is incorrect. Please try again.";
      } else if (error.message.includes('Server error')) {
        errorTitle = "Server Error";
        errorDescription = "A server error occurred. Please try again later or contact support.";
      } else if (error.message.includes('Database')) {
        errorTitle = "Database Error";
        errorDescription = "A database error occurred. Please contact support.";
      } else {
        errorDescription = error.message || "Invalid credentials. Please check your email and password.";
      }
      
      // Set error state for display
      setErrorTitle(errorTitle);
      setErrorDetails(errorDescription);
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
      
      // Log detailed error for debugging
      console.error('Detailed login error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
    } finally {
      setLoading(false);
    }
  };

  // Registration handler (from signup.tsx, with password length check)
  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const emailRaw = formData.get("email");
    const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const cnic = formData.get("cnic") as string;

    if (!email) {
      toast({
        title: "Registration failed",
        description: "Email is required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!cnic) {
      toast({
        title: "Registration failed",
        description: "CNIC is required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!/^\d{14}$/.test(cnic)) {
      toast({
        title: "Registration failed",
        description: "CNIC must be exactly 14 digits.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Registration failed",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Registration failed",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        cnic,
      });

      const data = await response.json();
      setCsrfToken(data.csrfToken); // Assuming setCsrfToken is available here

      toast({
        title: "Registration successful",
        description: "Welcome to NASTP Recruitment Portal!",
      });

      navigate("/candidate");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{ backgroundImage: `url(${bgImg})` }}>
      <img src={pagelogo} alt="Page Logo" className="page-logo" />
      <div className="info-section">
        <h1 className="info-title">NASTP Recruitment Portal</h1>
        <h2 className="info-subtitle">Job Portal & HRMS Platform</h2>
        <ul className="info-points">
          <li>Apply smarter, not harder with the NASTP Recruitment Portal.</li>
          <li>Discover jobs tailored to your skills through intelligent matching.</li>
          <li>Simplify your application process with an easy-to-use platform.</li>
          <li>Stay informed at every step, from application to interview.</li>
        </ul>
      </div>
      <div className="login-container">
        <div className="login-box">
          <img src={logo} alt="Form Logo" className={`form-logo${showSignup ? ' signup-logo' : ''}`} />
          <div className="toggle-or-email-area">
            {!showSignup ? (
              <div className="toggle-switch">
                <div className="toggle-track">
                  <div className={`toggle-slider ${activeTab === 'admin' ? 'left' : 'right'}`} />
                  <button
                    type="button"
                    className={`toggle-btn ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => handleTabChange('admin')}
                  >
                    <img src={adminIcon} alt="Admin Icon" className="icon" />
                    Admin
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${activeTab === 'candidate' ? 'active' : ''}`}
                    onClick={() => handleTabChange('candidate')}
                  >
                    <img src={candidateIcon} alt="Candidate Icon" className="icon" />
                    Candidate
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="form-wrapper">
            {showSignup ? (
              <form onSubmit={handleRegister} className="form">
                <div className="form-fields-scrollable">
                  <label htmlFor="signup-email" className="form-label" style={{ width: '100%' }}>Email Address</label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    required
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                  <label htmlFor="signup-cnic" className="form-label">CNIC</label>
                  <input
                    id="signup-cnic"
                    name="cnic"
                    type="text"
                    placeholder="12345678901234"
                    required
                    className="form-input"
                    maxLength={14}
                  />
                  <label htmlFor="signup-password" className="form-label">Password</label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="form-input"
                  />
                  <label htmlFor="signup-confirm-password" className="form-label">Confirm Password</label>
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="form-input"
                  />
                  <label htmlFor="signup-cnic" className="form-label">CNIC</label>
                  <input
                    id="signup-cnic"
                    name="cnic"
                    type="text"
                    placeholder="12345-6789012-3"
                    required
                    className="form-input"
                  />
                  <div className="forgot-password" style={{ visibility: 'hidden' }}>
                    <a>Spacer</a>
                  </div>
                </div>
                  <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>
                <div className="signup-link">
                  <a onClick={() => {
                    setShowSignup(false);
                    clearErrors();
                  }} style={{ cursor: "pointer" }}>Already have an account? Sign in</a>
                </div>
              </form>
            ) : activeTab === 'admin' ? (
              <form onSubmit={handleLogin} className="form">
                {errorTitle && errorDetails && (
                  <div className="error-display" style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    color: '#dc2626'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚠️ {errorTitle}</div>
                    <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{errorDetails}</div>
                  </div>
                )}
                <div className="form-fields">
                  <label htmlFor="admin-email" className="form-label">Email Address</label>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    defaultValue="harisismail68@gmail.com"
                    required
                    className="form-input"
                  />
                  <label htmlFor="admin-password" className="form-label">Password</label>
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    required
                    className="form-input"
                  />
                  <div className="forgot-password" style={{ visibility: "hidden" }}>
                    <a>Spacer</a>
                  </div>
                </div>
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="form">
                {errorTitle && errorDetails && (
                  <div className="error-display" style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    color: '#dc2626'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚠️ {errorTitle}</div>
                    <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{errorDetails}</div>
                  </div>
                )}
                <div className="form-fields">
                  <label htmlFor="candidate-email" className="form-label">Email Address</label>
                  <input
                    id="candidate-email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    required
                    className="form-input"
                  />
                  <label htmlFor="candidate-password" className="form-label">Password</label>
                  <input
                    id="candidate-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="form-input"
                  />
                  <div className="forgot-password">
                    <a href="/forgot-password">Forgot Password?</a>
                  </div>
                </div>
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
                <div className="signup-link">
                  <a onClick={() => {
                    setShowSignup(true);
                    clearErrors();
                  }} style={{ cursor: "pointer" }}>Don’t have an account? Sign up</a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}