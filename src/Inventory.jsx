import React, { useState, useEffect } from 'react';
import {
    Plus, Camera, Trash2, Package, Minus, ShoppingBag,
    ChevronLeft, Loader2, Save, X, ChevronRight, Search
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from './supabase';

const Inventory = ({ onBack, onAddToCart, onRemoveFromCart, cartCount, onCheckout, cart = [] }) => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false); // Modal Tambah Barang Baru
    const [isCartOpen, setIsCartOpen] = useState(false);   // Modal Detail Keranjang
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({ name: '', price: '', stock: '', image_url: '' });
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
        try {
            let finalImageUrl = '';
            if (tempImage) {
                const filePath = `products/${Date.now()}.png`;
                const byteCharacters = atob(tempImage);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
                const { error: upError } = await supabase.storage.from('product-image').upload(filePath, new Uint8Array(byteNumbers), { contentType: 'image/png' });
                if (upError) throw upError;
                const { data: { publicUrl } } = supabase.storage.from('product-image').getPublicUrl(filePath);
                finalImageUrl = publicUrl;
            }
            const { error } = await supabase.from('products').insert([{ ...formData, price: parseInt(formData.price), stock: parseInt(formData.stock) || 0, image_url: finalImageUrl }]);
            if (error) throw error;
            setIsModalOpen(false);
            setFormData({ name: '', price: '', stock: '', image_url: '' });
            setTempImage(null);
            fetchProducts();
        } catch (err) { alert("Gagal: " + err.message); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-all"><ChevronLeft /></button>
                    <h1 className="text-xl font-bold text-slate-800">Etalase</h1>
                </div>
                {/* Tombol Keranjang Kecil di Atas */}
                <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-slate-100 rounded-xl">
                    <ShoppingBag size={20} className="text-slate-600" />
                    {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
                </button>
            </div>

            {/* SEARCH BAR */}
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

            {/* PRODUCT GRID */}
            <div className="p-4 grid grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-2 flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-blue-500 mb-2" />
                        <p className="text-xs text-slate-400">Memuat barang...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="col-span-2 text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <Package className="mx-auto text-slate-200 mb-2" size={40} />
                        <p className="text-slate-400 text-sm">Barang tidak ditemukan.</p>
                    </div>
                ) : (
                    filteredProducts.map(product => {
                        // HITUNG QUANTITY DI SINI
                        const itemInCart = cart.find(i => i.id === product.id);
                        const quantityInCart = itemInCart ? itemInCart.quantity : 0;

                        return (
                            <div
                                key={product.id}
                                onClick={() => onAddToCart(product)}
                                className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 active:scale-95 transition-all relative overflow-hidden"
                            >
                                {/* Badge jumlah jika sudah ada di keranjang */}
                                {quantityInCart > 0 && (
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold z-20 border-2 border-white">
                                        {quantityInCart}
                                    </div>
                                )}

                                {/* Indikator Stok Habis */}
                                {product.stock <= 0 && (
                                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">HABIS</span>
                                    </div>
                                )}

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
                                    <div className={`p-1 rounded-lg ${quantityInCart > 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <Plus size={12} />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Floating Action Button - TAMBAH BARANG BARU */}
            <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 z-40">
                <Plus size={28} />
            </button>

            {/* Modal Detail Keranjang (Tinjau Barang) */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[100] flex items-end bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full rounded-t-[32px] p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between mb-4">
                            <h2 className="font-bold text-lg text-slate-800">Keranjang Saya</h2>
                            <button onClick={() => setIsCartOpen(false)}><X /></button>
                        </div>
                        <div className="space-y-4 mb-6">
                            {cart.length === 0 ? <p className="text-center text-slate-400 py-10">Keranjang kosong</p> : cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                                    <div>
                                        <p className="font-bold text-sm">{item.name}</p>
                                        <p className="text-xs text-blue-600">Rp {(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl border">
                                        <button onClick={() => onRemoveFromCart(item.id)} className="p-1 text-red-500"><Minus size={16} /></button>
                                        <span className="font-bold text-sm">{item.quantity}</span>
                                        <button onClick={() => onAddToCart(item)} className="p-1 text-blue-500"><Plus size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button
                            onClick={() => {
                                setIsCartOpen(false); // Tutup modal keranjang dulu
                                onCheckout();        // Pindah ke view Nota
                            }}
                            disabled={cart.length === 0}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex justify-between px-6 items-center"
                        >
                            <span>Lanjut ke Nota</span>
                            <ChevronRight />
                        </button>
                    </div>
                </div>
            )}

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

            {/* Modal Tambah Barang Baru Ke Database */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-lg font-bold">Barang Baru</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div onClick={takePhoto} className="w-full h-40 bg-slate-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center overflow-hidden">
                                {tempImage ? <img src={`data:image/png;base64,${tempImage}`} className="w-full h-full object-cover" /> : <Camera className="text-slate-300" />}
                            </div>
                            <input placeholder="Nama Barang" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            <div className="flex gap-4">
                                <input type="number" placeholder="Harga" className="w-2/3 p-4 bg-slate-50 rounded-2xl outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                <input type="number" placeholder="Stok" className="w-1/3 p-4 bg-slate-50 rounded-2xl outline-none" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                            </div>
                            <button disabled={isSaving} onClick={handleSaveProduct} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Simpan ke Etalase
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;