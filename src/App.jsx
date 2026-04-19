// ==========================================
// 1. SEMUA IMPORT HARUS DI PALING ATAS
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { createClient } from '@supabase/supabase-js';
import {
  Trash2, Printer, Share2, Download, ChevronLeft,
  FileText, Search, PlusCircle, Loader2, Save, Wrench,
  FileDown, AlertTriangle, Package, Settings as SettingsIcon
} from 'lucide-react';
import ThermalPrint from "./ThermalPrint";
import Inventory from './Inventory';
import Settings from './Settings';
import LoginView from './LoginView';
import UpdatePasswordForm from './UpdatePasswordForm';
import { showToast, showAlert } from './utils/alert';
import axios from 'axios';

// ==========================================
// 2. CONFIGURATION & INSTANCE CLIENT
// ==========================================
const isNative = Capacitor.isNativePlatform();
const SUPABASE_URL = 'https://bqciggzshqdychtgongv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c6kaD77-nCUbmhlIxfFeOA_2f9c2BKg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 3. HELPER FUNCTIONS (DI LUAR KOMPONEN)
// ==========================================

// Pengecekan Koneksi
const checkConnection = async () => {
  const status = await Network.getStatus();
  return status.connected;
};

// --- Helper Pending Data ---
const getPending = async () => {
  const { value } = await Preferences.get({ key: 'pending_notas' });
  return value ? JSON.parse(value) : [];
};

const savePending = async (data) => {
  const existing = await getPending();
  await Preferences.set({
    key: 'pending_notas',
    value: JSON.stringify([...existing, data])
  });
};

const clearPending = async () => {
  await Preferences.remove({ key: 'pending_notas' });
};

// --- Helper Local Data ---
const getFromLocal = async () => {
  const { value } = await Preferences.get({ key: 'notas' });
  return value ? JSON.parse(value) : [];
};

const saveToLocal = async (data) => {
  await Preferences.set({
    key: 'notas',
    value: JSON.stringify(data)
  });
};

// --- Helper Bluetooth ---
const getBluetooth = () => {
  if (!window.bluetoothSerial) {
    console.warn("BluetoothSerial belum ready");
    return null;
  }
  return window.bluetoothSerial;
};

// ==========================================
// 4. MAIN COMPONENT (FUNGSI UTAMA APP)
// ==========================================
export default function App() {

  // --- REFS ---
  const thermalRef = useRef();
  const notaRef = useRef(null);

  // --- STATE ---
  const [session, setSession] = useState(null);
  const [isOnlineState, setIsOnlineState] = useState(true);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [currentNota, setCurrentNota] = useState({
    customer_name: '',
    phone: '',
    items: [], // WAJIB ADA agar .map() tidak error
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [currentQris, setCurrentQris] = useState(null);
  const [cart, setCart] = useState([]);
  const [shopSettings, setShopSettings] = useState({
    shop_name: 'Loading...',
    shop_address: '',
    shop_info: '',
    shop_bio: ''
  });
  const [currentPage, setCurrentPage] = useState('login'); // Default ke login
  const [qrisImage, setQrisImage] = useState("");


  // --- LIFECYCLE (USE EFFECT) ---
  useEffect(() => {
    // 1. Ambil sesi saat ini saat aplikasi pertama kali dibuka
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Gabungkan listener Auth menjadi satu pintu
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔥 Supabase Auth Event:", event); // Biar gampang debbuging
      setSession(session);

      if (event === "PASSWORD_RECOVERY") {
        // Jika dari link email, paksa masuk ke halaman ganti password
        setCurrentPage('update-password');
      } else if (event === "SIGNED_OUT") {
        setCurrentPage('login');
      }
    });

    // 3. Pastikan listener dibersihkan saat komponen unmount
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let backHandler; // Buat variabel penampung

    CapApp.addListener('appBackButton', (data) => {
      if (view !== 'list') {
        setView('list'); // Jika sedang di edit/detail, balik ke list
      } else {
        CapApp.exitApp(); // Jika sudah di list, baru keluar
      }
    }).then(handle => {
      backHandler = handle; // Simpan handle setelah promise selesai
    });

    return () => {
      // Cek apakah backHandler sudah ada sebelum di-remove
      if (backHandler) backHandler.remove();
    };
  }, [view]);

  // Ambil data saat aplikasi dibuka
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from('settings').select('*').single();
      if (!error && data) setShopSettings(data);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    // Load html2canvas
    const s1 = document.createElement('script');
    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s1.async = true;
    document.body.appendChild(s1);

    // Load jsPDF for PDF generation
    const s2 = document.createElement('script');
    s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s2.async = true;
    document.body.appendChild(s2);

    const interval = setInterval(() => {
      // Pastikan fungsi syncPendingData ada di bawah kode ini nantinya
      if (typeof syncPendingData === 'function') syncPendingData();
    }, 60000);

    const syncPendingData = async () => {
      const isOnline = isOnlineState;
      const client = getSupabase();

      if (!isOnline || !client) return;

      const pending = await getPending();
      if (pending.length === 0) return;

      console.log("🔥 Syncing data...");

      try {
        for (const item of pending) {
          if (item.type === 'insert') {
            await client.from('notas').insert([item.data]).select().single();
          }

          if (item.type === 'update') {
            const { data, error } = await client
              .from('notas')
              .update(item.data)
              .eq('id', item.data.id)
              .select().single();

            if (!error && data) {
              setNotas(prev => {
                const updated = prev.map(n => n.id === data.id ? { ...data, isLocal: false } : n);
                saveToLocal(updated);
                return updated;
              });
            }
          }

          if (item.type === 'delete') {
            await client.from('notas').delete().eq('id', item.id);
          }
        }

        await clearPending();
        await fetchNotas(); // Refresh total dari server
        console.log("✅ Sync Berhasil");
      } catch (err) {
        console.error("❌ Sync Gagal:", err.message);
      }
    };

    document.addEventListener('deviceready', async () => {
      console.log("🔥 Device ready");
      fetchNotas();

      const bt = getBluetooth();
      if (bt) {
        try {
          await bt.enable();
          await autoConnectPrinter();
        } catch (e) {
          console.log("Bluetooth tidak aktif");
        }
      }
    }, false);

    const initNetwork = async () => {
      const status = await Network.getStatus();
      setIsOnlineState(status.connected);
    };

    initNetwork();

    // Listener perubahan koneksi 🔥
    let networkHandler;

    Network.addListener('networkStatusChange', (status) => {
      setIsOnlineState(status.connected);
      if (status.connected && typeof syncPendingData === 'function') {
        syncPendingData();
      }
    }).then(handle => {
      networkHandler = handle; // Simpan handle
    });

    const bt = getBluetooth();
    if (bt) {
      bt.enable(
        () => console.log("Bluetooth berhasil diaktifkan"),
        () => console.log("Bluetooth gagal diaktifkan / tidak aktif") // Hapus parameter err jika tidak dipakai
      );
    }

    return () => {
      clearInterval(interval);
      if (networkHandler) networkHandler.remove(); // Bersihkan dengan aman
    };
  }, []);

  const handleUpdatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      showAlert("Gagal update!", error.message, "error");
    } else {
      showAlert("Mantap!", "Password baru berhasil disimpan.", "success");
      // JANGAN arahkan ke login. Arahkan ke aplikasi utama
      setCurrentPage('app'); // Kembalikan state page ke default aplikasi
      setView('list');       // Tampilkan daftar nota
    }
  };

  // --- HELPER DI DALAM KOMPONEN ---
  const currentUserId = session ? session.user.id : null;
  const generateId = () => {
    return crypto?.randomUUID?.() || Date.now() + '-' + Math.random();
  };

  const goToSettings = () => {
    console.log("Tombol setting diklik, merubah view ke: settings");
    setView('settings');
  }

  const getSupabase = () => supabase;

  // --- LOGIC DATABASE ---
  const fetchNotas = async () => {
    setLoading(true);
    const isOnline = isOnlineState;
    const client = getSupabase();

    try {
      let serverData = [];

      if (isOnline && client) {
        const { data, error } = await client
          .from('notas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const seen = new Set();
        serverData = (data || []).filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      }

      const localData = await getFromLocal();
      const pending = await getPending();

      let merged = [...serverData];

      localData.forEach(local => {
        if (!merged.find(s => s.id === local.id)) {
          merged.push(local);
        }
      });

      const deletedIds = pending
        .filter(p => p.type === 'delete')
        .map(p => p.id);

      const finalData = merged.filter(n => !deletedIds.includes(n.id));

      setNotas(finalData);
      await saveToLocal(finalData);

    } catch (err) {
      console.log("Fallback ke offline:", err.message);
      const localData = await getFromLocal();
      setNotas(localData);
    }

    setLoading(false);
  };

  // --- LOGIC PRINTER & BLUETOOTH ---
  const savePrinter = async (mac) => {
    await Preferences.set({ key: 'printer_mac', value: mac });
  };

  const getPrinter = async () => {
    const { value } = await Preferences.get({ key: 'printer_mac' });
    return value;
  };

  const scanPrinter = async () => {
    const bt = getBluetooth();
    if (!bt) {
      showAlert("Bluetooth belum ready atau plugin tidak terinstal");
      return;
    }

    try {
      const devices = await new Promise((resolve, reject) => {
        bt.list(resolve, reject);
      });

      console.log("Device:", devices);
      const printer = devices.find(d => d.name?.toLowerCase().includes("printer"));

      if (printer) {
        await savePrinter(printer.id);
        showToast("Printer tersimpan: " + printer.name);
      } else {
        showAlert("Printer tidak ditemukan");
      }
    } catch (err) {
      console.error("Gagal scan printer:", err);
    }
  };

  const autoConnectPrinter = async () => {
    const bt = getBluetooth();
    if (!bt) return false;

    try {
      const mac = await getPrinter();
      if (!mac) return false;

      return new Promise((resolve) => {
        bt.isConnected(
          () => resolve(true),
          () => {
            bt.connect(mac,
              () => {
                console.log("✅ Connected");
                resolve(true);
              },
              (err) => {
                console.error("❌ Gagal connect:", err);
                resolve(false);
              }
            );
          }
        );
      });
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const generateQRIS = async (amount) => {
    try {
      const res = await fetch("http://192.168.1.111/create-qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      return data.qr_string;
    } catch (err) {
      console.error("QRIS error:", err);
      return null;
    }
  };

  // --- THERMAL FORMATTING HELPERS ---
  const generateESCPosQR = (data) => {
    const storeLen = data.length + 3;
    const pL = storeLen % 256;
    const pH = Math.floor(storeLen / 256);

    return (
      '\n' +
      '\x1D(k' + String.fromCharCode(pL, pH) + '\x31\x50\x30' + data +
      '\x1D(k\x03\x00\x31\x45\x30' +
      '\x1D(k\x03\x00\x31\x43\x06' +
      '\x1D(k\x03\x00\x31\x51\x30'
    );
  };

  const ESC = '\x1B';
  const GS = '\x1D';
  const alignLeft = ESC + 'a' + '\x00';
  const alignCenter = ESC + 'a' + '\x01';
  const alignRight = ESC + 'a' + '\x02';
  const boldOn = ESC + 'E' + '\x01';
  const boldOff = ESC + 'E' + '\x00';
  const sizeNormal = GS + '!' + '\x00';
  const sizeDouble = GS + '!' + '\x11';
  const cut = GS + 'V' + '\x00';
  const LINE_WIDTH = 32;

  const centerText = (text) => {
    const space = Math.floor((LINE_WIDTH - text.length) / 2);
    return ' '.repeat(space > 0 ? space : 0) + text;
  };

  const leftRight = (left, right) => {
    const space = LINE_WIDTH - left.length - right.length;
    return left + (space > 0 ? ' '.repeat(space) : '') + right;
  };

  const divider = () => '-'.repeat(LINE_WIDTH);
  const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num || 0);

  // Perintah standar ESC/POS untuk cetak QR Code
  const qrCommand = (data) => {
    // Logika ini biasanya tergantung library printer yang kamu pakai
    // Tapi intinya kita butuh data dari qrisString Xendit
    return data;
  };

  const generateQRIS = async (amount) => {
    try {
      const res = await axios.post('/api/create-qris', { amount });
      // Kita butuh dua data: 
      // 1. qr_string (untuk printer bluetooth)
      // 2. qr_url atau qr_string yang di-convert jadi gambar (untuk layar/PDF)
      return res.data;
    } catch (err) {
      console.error("Gagal generate QRIS", err);
      return null;
    }
  };

  const generateStrukText = (nota, totals, qrisCode) => {
    let s = '';
    s += alignCenter;
    s += boldOn + shopSettings.shop_name + '\n' + boldOff;
    s += shopSettings.shop_address + '\n';
    s += shopSettings.shop_bio + '\n';
    s += divider() + '\n';
    s += alignLeft;
    s += `Nama : ${nota.customer_name || '-'}\n`;
    s += `Tgl  : ${nota.date}\n`;
    s += divider() + '\n';

    (nota.items || []).forEach(item => {
      const name = item.name.substring(0, 32);
      const qty = `${item.qty} x ${formatRp(item.price)}`;
      const total = formatRp(item.qty * item.price);
      s += name + '\n';
      s += leftRight(qty, total) + '\n';
    });

    s += divider() + '\n';
    s += leftRight('Subtotal', formatRp(totals.subTotal)) + '\n';
    s += leftRight('Jasa', formatRp(nota.serviceFee)) + '\n';
    s += divider() + '\n';
    s += boldOn + sizeDouble;
    s += leftRight('TOTAL', formatRp(totals.grandTotal)) + '\n';
    s += sizeNormal + boldOff;
    s += leftRight('Bayar', formatRp(nota.amountPaid)) + '\n';

    const label = totals.diff < 0 ? 'Kurang' : 'Kembali';
    s += leftRight(label, formatRp(Math.abs(totals.diff))) + '\n';
    s += divider() + '\n';
    s += alignCenter;
    s += shopSettings.shop_info + '\n\n';
    s += alignCenter;

    if (qrisCode) {
      s += '--- SCAN QRIS UNTUK BAYAR ---\n\n';

      // PERINTAH CETAK QR (Tergantung library Bluetooth/Printer kamu)
      // Contoh jika library mendukung perintah .qr():
      s += encodeQR(qrisCode); // <--- Masukkan string dari Xendit di sini

      s += '\n' + shopSettings.shop_info + '\n';
    } else {
      s += '\n' + shopSettings.shop_info + '\n';
    }

    s += '\n\n\n';
    s += cut;
    return s;
  };

  const printThermalBluetooth = async () => {
    const bt = getBluetooth();
    if (!bt) {
      showAlert("Bluetooth belum ready");
      return;
    }

    if (!currentNota) return;

    const connected = await autoConnectPrinter();
    if (!connected) {
      showAlert("Printer belum connect");
      return;
    }

    await new Promise(r => setTimeout(r, 500));

    // Pastikan calculateTotals ada di sisa kodemu di bawah
    const totals = calculateTotals(currentNota);

    // 1. Ambil QRIS dari Xendit dulu
    const qrisData = await generateQRIS(totals.grandTotal);
    const qrisString = qrisData?.qr_string; // String panjang untuk printer
    setCurrentQris(qrString);

    let text = generateStrukText(currentNota, totals, qrisString);
    if (qrString) {
      text += generateESCPosQR(qrString);
    }
    text += '\n\n\n';

    bt.write(
      text,
      () => console.log("✅ Print sukses"),
      (err) => console.error("❌ Print gagal", err)
    );
  };

  // --- HANDLERS ---
  const handleBayar = async () => {
    const qrisData = await generateQRIS(totals.grandTotal);
    // Gunakan API pembuat QR gratis untuk mengubah string jadi gambar
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrisData.qr_string}`;
    setQrisImage(qrImageUrl);
  };

  const handleCreateNewNota = () => {
    const newNota = {
      id: generateId(),
      isLocal: true,
      customer_name: '',
      customer_phone: '',
      date: new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      items: [{ id: Date.now(), name: '', qty: 1, price: 0 }],
      serviceFee: 0,
      amountPaid: 0
    };

    setCurrentNota(newNota);
    setView('edit');
  };

  // HANDLER TAMBAH KE KERANJANG
  const handleAddToCart = (product) => {
    setCart(currentCart => {
      const isExist = currentCart.find(item => item.id === product.id);
      const currentQty = isExist ? (isExist.quantity || 0) : 0;

      // VALIDASI STOK: Jika qty di keranjang sudah sama dengan stok, jangan tambah lagi
      if (currentQty >= product.stock) {
        showAlert(`Stok tidak mencukupi! Maksimal: ${product.stock}`);
        return currentCart;
      }

      if (isExist) {
        return currentCart.map(item =>
          item.id === product.id ? { ...item, quantity: currentQty + 1 } : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  // HANDLER HAPUS DARI KERANJANG
  const handleRemoveFromCart = (productId) => {
    setCart(currentCart => {
      const item = currentCart.find(i => i.id === productId);
      if (item.quantity > 1) {
        return currentCart.map(i => i.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return currentCart.filter(i => i.id !== productId);
    });
  };

  // ==========================================
  // 1. CALCULATIONS & FORMATTERS (Bantuan)
  // ==========================================
  const calculateTotals = (nota) => {
    if (!nota) return { subTotal: 0, grandTotal: 0, diff: 0, isLunas: false };
    const items = Array.isArray(nota.items) ? nota.items : [];
    const subTotal = items.reduce((sum, item) => sum + (item.qty * (parseInt(item.price) || 0)), 0);
    const sFee = parseFloat(nota.serviceFee || 0);
    const aPaid = parseFloat(nota.amountPaid || 0);

    const grandTotal = subTotal + sFee;
    const diff = aPaid - grandTotal;
    const isLunas = aPaid >= grandTotal && grandTotal > 0;

    return { subTotal, grandTotal, diff, isLunas };
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0);
  };

  const formatAngka = (num) => new Intl.NumberFormat('id-ID').format(num);

  const formatInput = (num) => {
    if (!num && num !== 0) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseInput = (str) => {
    if (typeof str !== 'string') return str;
    return parseInt(str.replace(/\./g, '')) || 0;
  };

  // ==========================================
  // 2. DATA HANDLERS (Buka, Simpan, Hapus, Sync)
  // ==========================================
  const handleOpenNota = (nota) => {
    setCurrentNota({
      ...nota,
      items: Array.isArray(nota.items) ? nota.items : [],
      serviceFee: nota.service_fee,
      amountPaid: nota.amount_paid,
      customer_phone: nota.customer_phone || ''
    });
    setView('edit');
  };

  const handleSaveData = async () => {
    const isOnline = isOnlineState;
    const client = getSupabase();

    setIsSaving(true);

    const { grandTotal, isLunas } = calculateTotals(currentNota);

    let payload = {
      ...currentNota,
      customer_name: currentNota?.customer_name || 'Pelanggan Umum',
      customer_phone: currentNota?.customer_phone || '',
      items: currentNota?.items,
      service_fee: currentNota?.serviceFee || 0,
      total: grandTotal,
      amount_paid: currentNota?.amountPaid || 0,
      status: isLunas ? 'lunas' : 'hutang',
      date: currentNota?.date,
      updated_at: new Date().toISOString()
    };

    try {
      if (isOnline && client) {
        let result;

        if (currentNota.id && !currentNota.isLocal) {
          result = await client
            .from('notas')
            .update(payload)
            .eq('id', currentNota.id)
            .select()
            .single();
        } else {
          result = await client
            .from('notas')
            .insert([payload])
            .select()
            .single();
        }

        if (result.error) throw result.error;

        payload = { ...result.data, isLocal: false };

      } else {
        payload.id = currentNota.id || generateId();
        payload.isLocal = true;

        await savePending({
          type: currentNota.id ? 'update' : 'insert',
          data: payload
        });
      }

      showToast("Nota berhasil disimpan!");

    } catch (err) {
      console.error("Gagal simpan:", err.message);
    }

    setIsSaving(false);

    setNotas(prev => {
      const exists = prev.find(n => n.id === payload.id);
      let updated;
      if (exists) {
        updated = prev.map(n => n.id === payload.id ? payload : n);
      } else {
        updated = [payload, ...prev];
      }
      saveToLocal(updated);
      return updated;
    });

    setView('list');
  };

  const confirmDelete = (id, name, e) => {
    e.stopPropagation(); // Mencegah klik baris tabel tembus ke tombol hapus
    setDeleteConfirm({ show: true, id, name });
  };

  const executeDelete = async () => {
    const isOnline = isOnlineState;
    const client = getSupabase();

    try {
      if (isOnline && client) {
        const { error } = await client.from('notas').delete().eq('id', deleteConfirm.id);
        if (error) throw error;
      } else {
        await savePending({ type: 'delete', id: deleteConfirm.id });
      }

      setNotas(prev => {
        const updated = prev.filter(n => n.id !== deleteConfirm.id);
        saveToLocal(updated);
        return updated;
      });

      setDeleteConfirm({ show: false, id: null, name: '' });

    } catch (err) {
      console.error("Gagal hapus:", err.message);
    }
  };

  // HANDLER Hapus Item
  const removeItem = (idx) => {
    const newItems = currentNota.items.filter((_, i) => i !== idx);
    // Pastikan minimal ada 1 baris item
    if (newItems.length === 0) {
      setCurrentNota({ ...currentNota, items: [{ id: Date.now(), name: '', qty: 1, price: 0 }] });
    } else {
      setCurrentNota({ ...currentNota, items: newItems });
    }
  };
  // ==========================================
  // 3. EXPORT & SHARE HANDLERS (WA, PDF, PNG, Print)
  // ==========================================
  const handleShareWA = async () => {
    const { grandTotal } = calculateTotals(currentNota);

    const formatMessage = (nota, daftarItem, total, formatter) => {
      const ongkos = nota.service_fee || 0;
      const uangMuka = nota.amountPaid || 0;
      const sisa = total - uangMuka;

      let text = shopSettings.shop_name + '\n';
      text += `Tanggal: ${nota.date}\n`;
      text += `Pelanggan: ${nota.customer_name || '-'}\n\n`;
      text += `Detail:\n`;

      daftarItem.forEach(item => {
        text += `- ${item.name} (${item.qty}x): ${formatter(item.price * item.qty)}\n`;
      });

      text += `Ongkos: ${formatter(ongkos)}\n`;
      text += `--------------------------\n`;
      text += `*Total: ${formatter(total)}*\n`;
      text += `Uang Muka: ${formatter(uangMuka)}\n`;
      text += `*Sisa: ${formatter(sisa)}*\n\n`;
      text += `_Terima kasih telah servis di ${shopSettings.shop_name}_`;

      return encodeURIComponent(text);
    };

    let phone = currentNota.customer_phone || '';
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    const messageEncoded = formatMessage(currentNota, currentNota.items || [], grandTotal, formatRupiah);

    if (isNative) {
      const message = decodeURIComponent(messageEncoded);
      const waDirect = phone.length > 5
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waDirect, '_system');
    } else {
      const waUrl = phone.length > 5
        ? `https://api.whatsapp.com/send?phone=${phone}&text=${messageEncoded}`
        : `https://api.whatsapp.com/send?text=${messageEncoded}`;
      window.open(waUrl, '_blank');
    }
  };

  const downloadImage = async () => {
    if (!notaRef.current || !window.html2canvas) return;
    setDownloadingType('png');

    try {
      const hideElements = notaRef.current.querySelectorAll('.print\\:hidden, button');
      hideElements.forEach(el => el.style.visibility = 'hidden');

      const canvas = await window.html2canvas(notaRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      hideElements.forEach(el => el.style.visibility = 'visible');
      const image = canvas.toDataURL("image/png", 1.0);

      if (isNative) {
        const base64Data = image.split(',')[1];
        const fileName = `VP-nota-${currentNota?.customer_name || 'Customer'}.png`;

        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Simpan Nota PNG',
          url: result.uri,
        });
      } else {
        const link = document.createElement('a');
        link.href = image;
        link.download = `VP-nota-${currentNota?.customer_name || 'Customer'}.png`;
        link.click();
      }
    } catch (err) {
      showAlert("Gagal mengunduh gambar: " + err.message);
      console.error("Gagal PNG:", err.message);
    } finally {
      setDownloadingType(null);
    }
  };

  const downloadPDF = async () => {
    if (!window.html2canvas || !window.jspdf) {
      alert("Sistem belum siap, tunggu sebentar...");
      return;
    }
    setDownloadingType('pdf');

    try {
      const { jsPDF } = window.jspdf;
      const hideElements = notaRef.current.querySelectorAll('.print\\:hidden, button');
      hideElements.forEach(el => el.style.visibility = 'hidden');

      const canvas = await window.html2canvas(notaRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      hideElements.forEach(el => el.style.visibility = 'visible');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `VP-nota-${currentNota?.customer_name || 'Customer'}.pdf`;

      if (isNative) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];

        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Simpan Nota PDF',
          url: result.uri,
        });
      } else {
        pdf.save(fileName);
      }
    } catch (err) {
      showAlert("Gagal mengunduh PDF: " + err.message);
      console.error("Gagal PDF:", err.message);
    } finally {
      setDownloadingType(null);
    }
  };

  const handleAutoPrint = () => {
    if (!thermalRef.current) return;
    const printWindow = window.open('', '', 'width=900,height=600');
    const content = thermalRef.current.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print</title>
          <style>
            body {
              font-family: monospace;
              font-size: 10px;
              margin: 0;
              padding: 10px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // HANDLER CHECKOUT: Dari keranjang ke nota baru
  const handleCheckout = () => {
    if (cart.length === 0) return alert("Keranjang masih kosong!");

    // 1. Hitung total belanja dari keranjang sebelum dikosongkan
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 2. Siapkan data nota (Pastikan mapping key-nya benar)
    const newItems = cart.map(item => ({
      name: item.name,
      qty: item.quantity, // Pakai 'quantity' sesuai data dari keranjang
      price: item.price,
      total: item.price * item.quantity // Tambahkan subtotal per item jika perlu
    }));

    setCurrentNota({
      id: generateId(),
      date: new Date().toLocaleDateString('id-ID'),
      customer_name: '',
      customer_phone: '',
      items: newItems,
      subtotal: subtotal, // Simpan total kotor
      serviceFee: 0,
      amountPaid: 0,
      isLocal: true
    });

    // 3. Reset dan Pindah Halaman
    setCart([]);
    setView('edit');
  };

  // --- RENDER LOGIC ---

  // 1. PRIORITAS TERTINGGI: Cek apakah sedang proses reset password
  if (currentPage === 'update-password') {
    return (
      <UpdatePasswordForm
        onUpdate={handleUpdatePassword}
        onBack={async () => {
          // Jika user batal ganti password dan klik "Back"
          setCurrentPage('login');
          await supabase.auth.signOut(); // Wajib sign out karena link reset = auto login
        }}
      />
    );
  }

  // 2. Jika tidak ada sesi aktif, paksa ke LoginView
  if (!session) {
    return <LoginView />;
  }

  // 3. Jika sesi aktif dan minta ke Settings
  if (view === 'settings') {
    return (
      <Settings
        session={session}
        settings={shopSettings}
        onSave={(newVal) => setShopSettings(newVal)}
        onBack={() => setView('list')}
      />
    );
  }

  // VIEW LIST (Riwayat)
  if (view === 'list') {
    const validNotas = (notas || []).filter(n => n !== null);
    const filtered = validNotas.filter(n =>
      (n.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-slate-50 pb-24 font-sans">
        {/* MODAL DELETE */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">Hapus Nota?</h3>
                <p className="text-[11px] text-slate-500 mb-6">Nota milik "{deleteConfirm.name}" akan dihapus permanen.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm({ show: false })} className="flex-1 py-3 bg-slate-100 rounded-2xl font-bold text-[10px]">BATAL</button>
                  <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold text-[10px]">HAPUS</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER LIST */}
        <div className="bg-slate-800 text-white p-4 relative overflow-hidden">
          {/* Variasi hiasan background */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-sky-700/10 rounded-full blur-3xl"></div>

          <div className="max-w-md mx-auto flex justify-between items-end relative z-10">
            <div>
              <img src="logo1.png" alt="logo_vona" className='h-10 mb-0' />
              <p className="text-[9px] font-bold text-slate-400 ms-3 mt-1 tracking-[0.2em]">V-2.4.0</p>
            </div>

            <div className="flex items-center gap-3 mb-3 align-middle">

              {/* TOMBOL SETTINGS BARU */}
              <button
                onClick={goToSettings} // Pastikan fungsi ini dikirim lewat props dari App.jsx
                className="p-1 text-slate-50 bg-slate-700 rounded-md active:scale-90 transition-all"
              >
                <SettingsIcon size={20} />
              </button>

              {/* Point 7: Perbaikan Logic Warna Badge */}
              <div className={`flex items-center gap-1 text-[8px] font-bold px-1 py-0.5 rounded-full border shadow-sm ${isOnlineState
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${isOnlineState ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
                {isOnlineState ? 'Online' : 'Offline'}
              </div>

            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4">
          {/* SEARCH */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text" placeholder="Cari pelanggan..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* LIST ITEMS */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                <FileText className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-slate-400 text-sm">Belum ada data.</p>
              </div>
            ) : (
              filtered.map(nota => {
                const { grandTotal, isLunas } = calculateTotals(nota);
                return (
                  <div key={nota.id} onClick={() => handleOpenNota(nota)} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center active:scale-[0.98] transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm">{nota.customer_name || 'Tanpa Nama'}</h3>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${isLunas ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{isLunas ? 'Lunas' : 'Belum Lunas'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{nota.date} • <span className="text-slate-900 font-bold">{formatRupiah(grandTotal)}</span></p>
                    </div>
                    <button onClick={(e) => confirmDelete(nota.id, nota.customer_name, e)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* BOTTOM NAV */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 gap-3 max-w-md mx-auto">
          <button onClick={handleCreateNewNota} className="flex-[2] bg-slate-900 text-white flex items-center justify-center gap-3 py-4 rounded-2xl shadow-2xl font-bold text-[10px] tracking-widest">
            <PlusCircle size={18} className="text-orange-400" /> BUAT NOTA
          </button>
          <button onClick={() => setView('inventory')} className="flex-1 bg-white text-slate-900 border border-slate-200 flex flex-col items-center justify-center py-4 rounded-2xl shadow-xl font-bold text-[9px]">
            <Package size={18} className="text-blue-500" /> ETALASE
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW INVENTORY (Etalase Produk)
  // ========================================== 
  if (view === 'inventory') {
    return (
      <div className="text-center text-slate-400">
        <Inventory
          session={session}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
          cart={cart}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          onBack={() => setView('list')}
          onCheckout={handleCheckout}
        />
      </div>
    );
  }

  // ==========================================
  // RENDER EDIT VIEW (Halaman Detail Nota)
  // ==========================================
  const { subTotal, grandTotal, amountPaid, diff, isLunas } = calculateTotals(currentNota);

  return (
    <>
      <div className="min-h-screen bg-slate-200 p-0 sm:p-6 font-sans">
        <div className="max-w-md mx-auto bg-white min-h-screen relative pb-40 shadow-2xl sm:rounded-3xl overflow-hidden">

          {/* NAVBAR */}
          <div className="flex items-center justify-between px-3 py-1 bg-white border-b sticky top-0 z-40">
            <button onClick={() => setView('list')} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {/* TOMBOL PRINTER (Point 8) */}
              <button className="p-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-[10px] flex items-center gap-1">
                <Printer size={14} /> HUBUNGKAN
              </button>
              <button onClick={handleSaveData} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-[11px] uppercase">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} SIMPAN
              </button>
            </div>
          </div>

          {/* NOTA CONTENT */}
          <div className="relative" ref={notaRef}>

            {/* STEMPEL LUNAS/Hutang (Point 3) */}
            <div className="absolute top-80 left-1/2 -translate-x-1/2 -rotate-12 pointer-events-none opacity-20 z-10">
              <div className={`border-8 px-8 py-2 rounded-xl text-5xl font-black uppercase ${isLunas ? 'border-green-600 text-green-600' : ''}`}>
                {isLunas ? 'LUNAS' : ''}
              </div>
            </div>

            {/* Header Toko (Point 5: Full kesamping) */}
            <div className="bg-slate-900 text-white p-4 border-b-[6px] border-orange-500 mb-6">
              <h1 className="text-3xl font-bold italic uppercase tracking-tighter">{shopSettings.shop_name}</h1>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{shopSettings.shop_address}</p>
              <p className="text-[10px] text-orange-500">{shopSettings.shop_bio}</p>
            </div>

            <div className="px-5">
              {/* Form Pelanggan & WA (Point 9) */}
              <div className="grid grid-cols-1 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl border flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Nama Pelanggan</p>
                    <input
                      value={currentNota.customer_name}
                      onChange={(e) => setCurrentNota({ ...currentNota, customer_name: e.target.value })}
                      className="bg-transparent font-bold text-sm w-full outline-none" placeholder="Input nama..."
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Tanggal</p>
                    <p className="font-bold text-xs">{currentNota.date}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">WhatsApp (Customer)</p>
                  <input
                    type="number"
                    value={currentNota.customer_phone}
                    onChange={(e) => setCurrentNota({ ...currentNota, customer_phone: e.target.value })}
                    className="bg-transparent font-bold text-sm w-full outline-none" placeholder="628..."
                  />
                </div>
              </div>

              {/* Table Items */}
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="text-slate-400 uppercase border-b text-[10px]">
                    <th className="py-2 text-left">Deskripsi Item</th>
                    <th className="py-2 text-center w-12">Qty</th>
                    <th className="py-2 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentNota.items?.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="py-4">
                        <input
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...currentNota.items];
                            newItems[idx].name = e.target.value;
                            setCurrentNota({ ...currentNota, items: newItems });
                          }}
                          className="w-full font-bold outline-none text-slate-800" placeholder="Item/Jasa..."
                        />
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                          <span>Harga:</span>
                          <input
                            value={formatInput(item.price)}
                            onChange={(e) => {
                              const newItems = [...currentNota.items];
                              newItems[idx].price = parseInput(e.target.value);
                              setCurrentNota({ ...currentNota, items: newItems });
                            }}
                            className="bg-slate-100 px-1.5 py-0.5 rounded outline-none w-24 font-medium text-slate-600"
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <input
                          type="number" value={item.qty}
                          onChange={(e) => {
                            const newItems = [...currentNota.items];
                            newItems[idx].qty = parseInt(e.target.value) || 0;
                            setCurrentNota({ ...currentNota, items: newItems });
                          }}
                          className="w-10 py-1 text-center bg-slate-50 rounded-lg outline-none font-bold border"
                        />
                      </td>
                      <td className="text-right font-bold text-slate-900">{formatRupiah(item.qty * item.price)}</td>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-100 rounded-md transition-all mt-5 ms-3 p-2"
                      >
                        <Trash2 size={13} />
                      </button>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={() => setCurrentNota({ ...currentNota, items: [...currentNota.items, { id: Date.now(), name: '', qty: 1, price: 0 }] })}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50 transition-colors uppercase mb-8"
              >
                + TAMBAH ITEM BARU
              </button>

              {/* Totals Section (Point 4: Sisa/Kembali) */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold items-center text-slate-400 uppercase tracking-widest">
                  <span>Biaya Jasa</span>
                  <input
                    value={formatInput(currentNota.serviceFee)}
                    onChange={(e) => setCurrentNota({ ...currentNota, serviceFee: parseInput(e.target.value) })}
                    className="w-28 text-right bg-white/10 border border-white/20 rounded-lg p-1.5 outline-none text-white font-bold"
                  />
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-black italic text-orange-400">TOTAL AKHIR</span>
                  <span className="text-2xl font-black">{formatRupiah(grandTotal)}</span>
                </div>

                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold text-blue-300">DIBAYAR / DP</span>
                  <input
                    value={formatInput(currentNota.amountPaid)}
                    onChange={(e) => setCurrentNota({ ...currentNota, amountPaid: parseInput(e.target.value) })}
                    className="w-28 text-right bg-transparent font-black text-lg text-white outline-none"
                  />
                </div>

                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{diff < 0 ? 'SISA TAGIHAN' : 'KEMBALIAN'}</span>
                  <span className={`font-bold ${diff <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatRupiah(Math.abs(diff))}
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* INFO NOTA */}
          <div className="px-5 mt-8 mb-20 text-center">
            <p className="text-[12px] text-slate-500 font-bold">{shopSettings.shop_info}</p>
            <div className="flex flex-col items-center justify-center gap-2 mt-4">
              <span className="text-[12px] text-slate-400">
                Powered by
              </span>
              <img src="logo2.png" alt="logo_vona" className="h-4 w-auto object-contain" />
            </div>
          </div>

          {/* BOTTOM ACTIONS (Point 2: Tombol Berfungsi) */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t flex gap-2 max-w-md mx-auto z-50">
            <button onClick={downloadImage} className="flex-1 flex flex-col items-center py-3 bg-slate-800 text-white rounded-2xl font-bold text-[9px] active:scale-95 transition-all">
              <Download size={20} className="mb-1 text-orange-400" />PNG
            </button>
            <button onClick={downloadPDF} className="flex-1 flex flex-col items-center py-3 bg-orange-600 text-white rounded-2xl font-bold text-[9px] active:scale-95 transition-all">
              <FileDown size={20} className="mb-1" />PDF
            </button>
            <button onClick={handleAutoPrint} className="flex-1 flex flex-col items-center py-3 bg-blue-600 text-white rounded-2xl font-bold text-[9px] active:scale-95 transition-all">
              <Printer size={20} className="mb-1" />PRINT
            </button>
            <button onClick={handleShareWA} className="flex-1 flex flex-col items-center py-3 bg-emerald-600 text-white rounded-2xl font-bold text-[9px] active:scale-95 transition-all">
              <Share2 size={20} className="mb-1" />WA
            </button>
          </div>
        </div>
      </div>


      {/* --- PRINT & CAPTURE AREA (OFF-SCREEN) --- */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
        <div ref={notaRef} style={{ width: '380px', background: 'white', padding: '20px' }}>
          {currentNota && ( // Tambahkan pengecekan agar tidak error saat currentNota null
            <ThermalPrint
              ref={thermalRef}
              nota={currentNota}
              // Lebih baik hitung totals sekali saja di atas atau gunakan useMemo
              totals={calculateTotals(currentNota)}
              formatAngka={formatAngka}
              qrisString={currentQris} // Pastikan ini URL Gambar (https://...)
              shopSettings={shopSettings}
            />
          )}
        </div>
      </div>
    </>
  );

  return null; // Fallback jika view tidak dikenali
}