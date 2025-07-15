import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { setToken, getCurrentUser } from "@/lib/auth";
import { Shield, User } from "lucide-react";
import "./login-custom.css";
import logo from "@/assets/NASTPLogo.png";
import adminIcon from "@/assets/admin-icon.svg";
import candidateIcon from "@/assets/candidate-icon.svg";
import bgImg from "@/assets/background.jpg";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("admin");

  // Check if already logged in and redirect accordingly
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

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast({
        title: "Registration failed",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
      });

      const data = await response.json();
      setToken(data.token);

      toast({
        title: "Registration successful",
        description: "Welcome to HRConnect!",
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
          <img src={logo} alt="Form Logo" className="form-logo" />
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
          <div className="form-wrapper">
            {activeTab === 'admin' ? (
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
                    defaultValue="12345678"
                    required
                    className="form-input"
                  />
                </div>
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In as Admin"}
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
                  <a onClick={() => navigate("/signup")} style={{ cursor: "pointer" }}>Don’t have an account? Sign up</a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}