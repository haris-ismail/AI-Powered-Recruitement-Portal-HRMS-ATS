import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { setToken, getCurrentUser } from "@/lib/auth";
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

  const currentUser = getCurrentUser();
  if (currentUser) {
    if (currentUser.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/candidate");
    }
    return null;
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
      });

      const data = await response.json();
      setToken(data.token);

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Redirect based on role
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/candidate");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
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
      setToken(data.token);

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
                    onClick={() => setActiveTab('admin')}
                  >
                    <img src={adminIcon} alt="Admin Icon" className="icon" />
                    Admin
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${activeTab === 'candidate' ? 'active' : ''}`}
                    onClick={() => setActiveTab('candidate')}
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
                <div className="form-fields">
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
                  <a onClick={() => setShowSignup(false)} style={{ cursor: "pointer" }}>Already have an account? Sign in</a>
                </div>
              </form>
            ) : activeTab === 'admin' ? (
              <form onSubmit={handleLogin} className="form">
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
                  <a onClick={() => setShowSignup(true)} style={{ cursor: "pointer" }}>Don’t have an account? Sign up</a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}