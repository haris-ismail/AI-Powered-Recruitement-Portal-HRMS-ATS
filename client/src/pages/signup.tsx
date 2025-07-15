import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { setToken } from "@/lib/auth";
import logo from "@/assets/NASTPLogo.png";
import candidateIcon from "@/assets/candidate-icon.svg";
import bgImg from "@/assets/background.jpg";
import "./login-custom.css";

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
      <div className="info-section">
        <h1 className="info-title">NASTP Recruitment Portal</h1>
        <h2 className="info-subtitle">Create Your Account</h2>
        <ul className="info-points">
          <li>Join thousands of candidates finding their dream jobs.</li>
          <li>Create your profile and start applying to opportunities.</li>
          <li>Get matched with jobs that fit your skills and experience.</li>
          <li>Track your applications and interview progress.</li>
        </ul>
      </div>
      <div className="login-container">
        <div className="login-box">
          <img src={logo} alt="Form Logo" className="form-logo" />
          <div className="toggle-switch">
            <div className="toggle-track">
              <button
                type="button"
                className="toggle-btn active"
                disabled
                style={{ 
                  width: '100%', 
                  justifyContent: 'center',
                  backgroundColor: '#03045E',
                  color: 'white'
                }}
              >
                <img src={candidateIcon} alt="Candidate Icon" className="icon" />
                Candidate Registration
              </button>
            </div>
          </div>
          <div className="form-wrapper">
            <form onSubmit={handleRegister} className="form">
              <div className="form-fields">
                <label htmlFor="signup-email" className="form-label">Email Address</label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  className="form-input"
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
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
              <div className="signup-link">
                <a href="/login">Already have an account? Sign in</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 