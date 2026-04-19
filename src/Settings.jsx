import React, { useState } from 'react';
import { ChevronLeft, Save, Loader2, Store, MapPin, Info, LogOut } from 'lucide-react';
import { supabase } from './supabase';
import { showToast, showAlert, showConfirm } from './utils/alert';

// 1. Tambahkan 'session' ke dalam Destructuring Props
const Settings = ({ session, settings, onSave, onBack }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!session?.user?.id) {
            showAlert("Sesi berakhir, silakan login ulang.");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    shop_name: localSettings.shop_name,
                    shop_address: localSettings.shop_address,
                    shop_bio: localSettings.shop_bio,
                    shop_info: localSettings.shop_info,
                    user_id: session.user.id,
                    updated_at: new Date()
                }, { onConflict: 'user_id' }); // Kunci agar 1 user hanya punya 1 baris setting

            if (error) throw error;

            onSave(localSettings);
            showToast("Pengaturan Disimpan!");
        } catch (err) {
            showAlert("Gagal!", err.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    // FUNGSI LOGOUT
    const handleLogout = async () => {
        const confirmLogout = await showConfirm("Yakin mau Keluar?", "Anda harus login kembali nanti.");
        if (confirmLogout) {
            const { error } = await supabase.auth.signOut();
            if (error) alert("Gagal logout: " + error.message);
            // App.jsx akan otomatis mendeteksi perubahan auth dan kembali ke halaman Login
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white p-4 border-b flex items-center gap-4 sticky top-0 z-10">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-600">
                    <ChevronLeft />
                </button>
                <h1 className="text-xl font-bold text-slate-800">Pengaturan Toko</h1>
            </div>

            <div className="p-6 space-y-6 max-w-md mx-auto">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-5">
                    {/* Nama Toko */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase ml-1">
                            <Store size={14} /> Nama Toko
                        </label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 font-bold transition-all"
                            value={localSettings.shop_name}
                            onChange={e => setLocalSettings({ ...localSettings, shop_name: e.target.value })}
                        />
                    </div>

                    {/* Alamat */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase ml-1">
                            <MapPin size={14} /> Alamat Lengkap
                        </label>
                        <textarea
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-sm transition-all"
                            rows="3"
                            value={localSettings.shop_address}
                            onChange={e => setLocalSettings({ ...localSettings, shop_address: e.target.value })}
                        />
                    </div>

                    {/* Info Tambahan */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase ml-1">
                            <Info size={14} /> Bio Nota
                        </label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-sm transition-all"
                            placeholder="WA: 08123456789 | Rek: BCA 1234567890 a.n. Toko ABC"
                            value={localSettings.shop_bio}
                            onChange={e => setLocalSettings({ ...localSettings, shop_bio: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase ml-1">
                            <Info size={14} /> Info Nota
                        </label>
                        <input
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-sm transition-all"
                            placeholder="Contoh: Terima kasih sudah berbelanja! Kunjungi toko kami lagi :)"
                            value={localSettings.shop_info}
                            onChange={e => setLocalSettings({ ...localSettings, shop_info: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-md shadow-blue-200 flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    Simpan Perubahan
                </button>

                <div className="pt-4 border-t border-slate-200">
                    {/* TOMBOL LOGOUT */}
                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold shadow-md shadow-red-200 flex justify-center items-center gap-2 active:scale-95 transition-all border border-red-100"
                    >
                        <LogOut size={20} />
                        Keluar Akun
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4">
                        Logged in as: <br /><b>{session?.user?.email}</b>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;