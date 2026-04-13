import React, { useState, useEffect } from 'react';
import {
    Plus, Camera, Trash2, Package,
    ChevronLeft, Loader2, Save, X, ChevronRight, Search // Tambahkan Search di sini
} from 'lucide-react'; // Jika lucide-react tidak ketemu, pastikan nama library benar
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from './supabase';

const Inventory = ({ onBack, onAddToCart, cartCount, onCheckout }) => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]); // Pindahkan ke dalam
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock: '',
        image_url: ''
    });
    const [tempImage, setTempImage] = useState(null);
    const getSupabase = () => supabase;

    useEffect(() => {
        fetchProducts();
    }, []);

    // Pindahkan logic filter ke dalam sini
    useEffect(() => {
        if (!searchQuery) {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    const fetchProducts = async () => {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error) setProducts(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const takePhoto = async () => {
        try {
            const image = await CapCamera.getPhoto({
                quality: 80,
                allowEditing: true,
                resultType: CameraResultType.Base64,
                source: CameraSource.Prompt
            });
            setTempImage(image.base64String);
        } catch (e) {
            console.error("User cancelled camera");
        }
    };

    const uploadImage = async (base64, fileName) => {
        const supabase = getSupabase();
        const filePath = `products/${Date.now()}_${fileName.replace(/\s/g, '_')}.png`;

        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        const { data, error } = await supabase.storage
            .from('product-image')
            .upload(filePath, blob);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('product-image')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSaveProduct = async () => {
        if (!formData.name || !formData.price) return alert("Nama dan Harga wajib diisi!");

        setIsSaving(true);
        const supabase = getSupabase();
        let finalImageUrl = '';

        try {
            if (tempImage) {
                finalImageUrl = await uploadImage(tempImage, formData.name);
            }

            const payload = {
                name: formData.name,
                price: parseInt(formData.price),
                stock: parseInt(formData.stock) || 0,
                image_url: finalImageUrl
            };

            const { error } = await supabase.from('products').insert([payload]);
            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ name: '', price: '', stock: '', image_url: '' });
            setTempImage(null);
            fetchProducts();
        } catch (err) {
            alert("Gagal simpan: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b p-4 flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                    <ChevronLeft />
                </button>
                <h1 className="text-xl font-bold text-slate-800">Etalase</h1>
            </div>

            <div className="p-4 bg-white border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl outline-none text-sm"
                        placeholder="Cari barang di etalase..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Gunakan filteredProducts di sini, bukan products */}
            <div className="p-4 grid grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-2 flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-blue-500 mb-2" />
                        <p className="text-xs text-slate-400">Memuat stok...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="col-span-2 text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <Package className="mx-auto text-slate-200 mb-2" size={40} />
                        <p className="text-slate-400 text-sm">Barang tidak ditemukan.</p>
                    </div>
                ) : (
                    filteredProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => onAddToCart(product)}
                            className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 active:scale-95 transition-all relative overflow-hidden"
                        >
                            <div className="w-full h-32 bg-slate-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                                {product.image_url ? (
                                    <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                                ) : (
                                    <Package className="text-slate-300" size={30} />
                                )}
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm truncate">{product.name}</h3>
                            <p className="text-blue-600 font-bold text-sm">Rp {product.price?.toLocaleString('id-ID')}</p>
                            <div className="mt-1 flex justify-between items-center">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Stok: {product.stock}</span>
                                <div className="bg-blue-50 text-blue-600 p-1 rounded-lg">
                                    <Plus size={12} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Floating Checkout Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-24 left-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <button
                        onClick={onCheckout}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold">
                                {cartCount}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Lanjut ke Nota</span>
                        </div>
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Tombol FAB Tambah Barang */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center active:scale-90 transition-all z-40"
            >
                <Plus size={28} />
            </button>

            {/* Modal Tambah Barang */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 transition-all">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold">Tambah Barang</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div
                                onClick={takePhoto}
                                className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all active:bg-slate-100"
                            >
                                {tempImage ? (
                                    <img src={`data:image/png;base64,${tempImage}`} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                                            <Camera size={24} />
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">Ambil Foto Barang</span>
                                    </div>
                                )}
                            </div>

                            <input
                                placeholder="Nama Barang"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />

                            <div className="flex gap-4">
                                <input
                                    type="number" placeholder="Harga"
                                    className="w-2/3 p-4 bg-slate-50 border-none rounded-2xl outline-none text-sm"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                                <input
                                    type="number" placeholder="Stok"
                                    className="w-1/3 p-4 bg-slate-50 border-none rounded-2xl outline-none text-sm"
                                    value={formData.stock}
                                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                />
                            </div>

                            <button
                                disabled={isSaving}
                                onClick={handleSaveProduct}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                {isSaving ? 'Menyimpan...' : 'Simpan Barang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;