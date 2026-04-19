import React, { useState } from 'react';
import { supabase } from './supabase';
import { Mail, Lock, Loader2, Rocket, ArrowRight } from 'lucide-react';
import { showToast, showAlert } from './utils/alert';

const LoginView = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false); // State baru

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showToast('Cek email kamu untuk verifikasi pendaftaran!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      showAlert('Opps!', 'Email atau Password kamu salah!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI LUPA PASSWORD
  const handleForgotPassword = async (email) => {
    if (!email) {
      showAlert('Waduh!', "Masukkan email kamu dulu di kolom atas ya!");
      return;
    }

    // Mencegah klik ganda jika proses sedang jalan
    if (resetLoading) return;

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:5173/update-password',
      });

      if (error) {
        showAlert("Gagal!", error.message, "error");
      } else {
        showAlert("Berhasil!", "Cek email kamu untuk link reset password.", "success");
      }
    } catch (err) {
      showAlert("Opps!", "Terjadi kesalahan sistem.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center p-6">
      <div className="max-w-md mx-auto w-full space-y-8">

        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-600 rounded-[28px] shadow-xl shadow-blue-200 flex items-center justify-center mx-auto mb-6 transform rotate-3">
            <Rocket className="text-white" size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
            {isSignUp ? 'BUAT AKUN' : 'SELAMAT DATANG'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {isSignUp ? 'Mulai kelola tokomu dengan lebih profesional' : 'Kelola transaksi tokomu jadi lebih mudah'}
          </p>
        </div>

        {/* Form Kartu */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 transition-all font-medium"
                  placeholder="nama@toko.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* TOMBOL LUPA PASSWORD */}
            {!isSignUp && (
              <div className="flex justify-end px-1">
                <button
                  type="button"
                  disabled={resetLoading} // Disable saat loading
                  onClick={() => handleForgotPassword(email)}
                  className={`text-[11px] font-bold transition-all tracking-tight flex items-center gap-1.5 ${resetLoading ? 'text-blue-400 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'
                    }`}
                >
                  {resetLoading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      MENGIRIM LINK...
                    </>
                  ) : (
                    'LUPA PASSWORD?'
                  )}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  {isSignUp ? 'Daftar Sekarang' : 'Masuk Aplikasi'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-blue-600 hover:underline transition-all"
          >
            {isSignUp ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar gratis'}
          </button>
        </div>

      </div >
    </div >
  );
};

export default LoginView;