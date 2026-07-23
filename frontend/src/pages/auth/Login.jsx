import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState(''); // Serves as both admin username or telecaller mobile
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = { username, password };

    console.log(`[DEBUG] Attempting login to: ${api.defaults.baseURL}/api/auth/login`);

    try {
      const res = await api.post('/api/auth/login', payload);
      
      const { token, role, user } = res.data;
      
      // Clear any stale state
      localStorage.clear();
      sessionStorage.clear();

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('user', JSON.stringify(user));

      if (role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/telecaller');
      }
    } catch (err) {
      console.error(`[DEBUG] Login Error:`, err.response?.data || err.message);
      
      if (!err.response) {
        setError('Network error: Could not reach the server.');
      } else if (err.response.status === 401) {
        setError(err.response.data.message || 'Invalid credentials.');
      } else if (err.response.status === 404) {
        setError('Login route not found on the server.');
      } else {
        setError(err.response.data.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden px-4 font-sans">
      
      {/* Animated Abstract Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[150px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
        
        {/* Subtle Cyber Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Glowing Aura Behind Card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 to-violet-500/30 rounded-3xl blur-xl opacity-50"></div>
        
        {/* Glassmorphism Card */}
        <div className="relative bg-[#0f1015]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden">
          
          <div className="p-10 text-center flex flex-col items-center border-b border-white/5">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
              <img src="/logo.png" alt="CRM Pro Logo" className="relative h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-sm">Sign in to your account</p>
          </div>
          
          <div className="p-10 pt-8">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 rounded-xl backdrop-blur-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username or Mobile Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-[#1a1b23]/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500 transition-all shadow-inner"
                    placeholder="Enter username or mobile"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3.5 bg-[#1a1b23]/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500 transition-all shadow-inner"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full group overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                  ) : (
                    <span className="relative z-10">Sign In</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Inline styles for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
};

export default Login;
