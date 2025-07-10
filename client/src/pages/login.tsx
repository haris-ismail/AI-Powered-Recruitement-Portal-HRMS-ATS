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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-32 h-16 mx-auto rounded-lg shadow-md bg-white flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-primary">HR</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">NASTP Recruitment Portal</h1>
          <p className="text-gray-600 mt-2">Job Portal & HRMS Platform</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="candidate" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Candidate
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="admin-email">Email Address</Label>
                    <Input
                      id="admin-email"
                      name="email"
                      type="email"
                      defaultValue="harisismail68@gmail.com"
                      required
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      name="password"
                      type="password"
                      defaultValue="12345678"
                      required
                      className="mt-2"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In as Admin"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="candidate">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="candidate-email">Email Address</Label>
                        <Input
                          id="candidate-email"
                          name="email"
                          type="email"
                          placeholder="your.email@example.com"
                          required
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="candidate-password">Password</Label>
                        <Input
                          id="candidate-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          required
                          className="mt-2"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <Label htmlFor="register-email">Email Address</Label>
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          placeholder="your.email@example.com"
                          required
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          required
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          name="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          required
                          className="mt-2"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}