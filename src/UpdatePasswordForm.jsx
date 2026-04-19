import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';

const UpdatePasswordForm = ({ onUpdate }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validasi sederhana
  const isMatch = password === confirmPassword && password.length > 0;
  const isStrong = password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isMatch) return;
    
    setLoading(true);
    await onUpdate(password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-blue-100/50 p-8 border border-slate-100">
        
        {/* Header Ikon Pixar Style */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 relative">
             <div className="absolute inset-0 bg-blue-400 opacity-20 animate-ping rounded-full"></div>
             <Lock className="w-10 h-10 text-blue-600 relative z-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Password Baru</h2>
          <p className="text-slate-500 text-sm text-center mt-2">
            Amankan kembali akun <span className="font-horizon text-blue-600">VONA</span> kamu dengan password yang kuat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Input Password Baru */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type={showPass ? "text" : "password"}
                required
                className="block w-full pl-11 pr-12 py-4 bg-slate-50 border-none rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-blue-500"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Input Konfirmasi Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <CheckCircle2 className={`h-5 w-5 transition-colors ${isMatch ? 'text-green-500' : 'text-slate-300'}`} />
              </div>
              <input
                type={showPass ? "text" : "password"}
                required
                className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Indikator Kekuatan & Match */}
          <div className="flex flex-col gap-2 px-1">
            <div className="flex items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${isStrong ? 'bg-green-400' : 'bg-slate-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${isMatch && isStrong ? 'bg-green-400' : 'bg-slate-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${isMatch && isStrong ? 'bg-green-400' : 'bg-slate-200'}`} />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {!isStrong ? "Minimal 6 karakter" : isMatch ? "Password cocok!" : "Password belum cocok"}
            </p>
          </div>

          {/* Button Submit */}
          <button
            type="submit"
            disabled={!isMatch || !isStrong || loading}
            className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
              isMatch && isStrong 
                ? 'bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700' 
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {loading ? "Menyimpan..." : "Update Password"}
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordForm;