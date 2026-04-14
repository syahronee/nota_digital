import React, { useState, useEffect } from 'react';
import {
    Plus, Camera, Trash2, Package, Minus, ShoppingBag, MoreVertical,
    ChevronLeft, Loader2, Save, X, ChevronRight, Search, Edit3
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from './supabase';

const Inventory = ({ onBack, onAddToCart, onRemoveFromCart, cartCount, onCheckout, cart = [] }) => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

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

    // FUNGSI SIMPAN BARANG BARU
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
            resetForm();
            fetchProducts();
        } catch (err) { alert("Gagal: " + err.message); }
        finally { setIsSaving(false); }
    };

    // FUNGSI UPDATE BARANG (SIMPAN PERUBAHAN EDIT)
    const handleUpdateProduct = async () => {
        setIsSaving(true);
        try {
            let finalImageUrl = formData.image_url;

            // Jika ada foto baru yang diambil saat edit
            if (tempImage) {
                const filePath = `products/${Date.now()}.png`;
                const byteCharacters = atob(tempImage);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
                await supabase.storage.from('product-image').upload(filePath, new Uint8Array(byteNumbers), { contentType: 'image/png' });
                const { data: { publicUrl } } = supabase.storage.from('product-image').getPublicUrl(filePath);
                finalImageUrl = publicUrl;
            }

            const { error } = await supabase.from('products').update({
                name: formData.name,
                price: parseInt(formData.price),
                stock: parseInt(formData.stock),
                image_url: finalImageUrl
            }).eq('id', editingProduct.id);

            if (error) throw error;
            setEditingProduct(null);
            resetForm();
            fetchProducts();
        } catch (err) { alert("Update Gagal: " + err.message); }
        finally { setIsSaving(false); }
    };

    // FUNGSI HAPUS BARANG
    const handleDeleteProduct = async (id) => {
        if (!confirm("Hapus barang ini?")) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            setEditingProduct(null);
            fetchProducts();
        }
    };

    const resetForm = () => {
        setFormData({ name: '', price: '', stock: '', image_url: '' });
        setTempImage(null);
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
                        const qtyInCart = cart.find(i => i.id === product.id)?.quantity || 0;
                        return (
                            <div key={product.id} onClick={() => product.stock > qtyInCart && onAddToCart(product)} className="bg-white rounded-[24px] p-3 shadow-sm border border-slate-100 active:scale-95 transition-all relative">
                                {/* Tombol Menu Opsi */}
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProduct(product);
                                    setFormData({ name: product.name, price: product.price, stock: product.stock, image_url: product.image_url });
                                }} className="absolute top-2 left-2 z-20 p-1.5 bg-white/90 shadow-sm rounded-full text-slate-400">
                                    <MoreVertical size={16} />
                                </button>

                                {qtyInCart > 0 && <div className="absolute top-2 right-2 bg-orange-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold z-20 border-2 border-white">{qtyInCart}</div>}

                                <div className="w-full h-32 bg-slate-50 rounded-[18px] mb-3 overflow-hidden flex items-center justify-center">
                                    {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <Package className="text-slate-200" size={40} />}
                                </div>

                                <h3 className="font-bold text-sm truncate">{product.name}</h3>
                                <p className="text-blue-600 font-extrabold text-sm">Rp {product.price?.toLocaleString()}</p>

                                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                    <span className={`text-[10px] font-bold ${product.stock <= qtyInCart ? 'text-red-500' : 'text-slate-400'}`}>STOK: {product.stock}</span>
                                    <div className="p-1 bg-blue-50 text-blue-600 rounded-lg"><Plus size={14} /></div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal Edit / Opsi Barang */}
            {editingProduct && (
                <div className="fixed inset-0 z-[120] flex items-end bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full rounded-t-[32px] p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-lg">Kelola Barang</h2>
                            <button onClick={() => { setEditingProduct(null); resetForm(); }}><X /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Ganti Foto */}
                            <div onClick={takePhoto} className="relative w-full h-40 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed">
                                {tempImage ? (
                                    <img src={`data:image/png;base64,${tempImage}`} className="w-full h-full object-cover" />
                                ) : formData.image_url ? (
                                    <img src={formData.image_url} className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="text-slate-300" />
                                )}
                                <div className="absolute bottom-2 right-2 bg-blue-600 p-2 rounded-full text-white shadow-lg"><Edit3 size={16} /></div>
                            </div>

                            <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-blue-600" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />

                            <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl">
                                <button onClick={() => setFormData({ ...formData, stock: Math.max(0, parseInt(formData.stock) - 1) })} className="p-3 bg-white rounded-xl text-red-500"><Minus /></button>
                                <input type="number" className="flex-1 text-center bg-transparent font-bold text-lg" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                <button onClick={() => setFormData({ ...formData, stock: parseInt(formData.stock) + 1 })} className="p-3 bg-white rounded-xl text-blue-500"><Plus /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button onClick={() => handleDeleteProduct(editingProduct.id)} className="p-4 border-2 border-red-50 text-red-500 rounded-2xl font-bold flex justify-center gap-2"><Trash2 size={18} /> Hapus</button>
                                <button onClick={handleUpdateProduct} disabled={isSaving} className="p-4 bg-blue-600 text-white rounded-2xl font-bold flex justify-center gap-2">
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah Barang Baru */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6">
                        <div className="flex justify-between mb-4">
                            <h2 className="text-lg font-bold">Barang Baru</h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }}><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div onClick={takePhoto} className="w-full h-40 bg-slate-50 border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden">
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

            {/* FAB Tambah Barang (Hanya satu yang aktif) */}
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 z-40 transition-all">
                <Plus size={28} />
            </button>

            {/* Floating Checkout Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-24 left-6 right-6 z-50">
                    <button onClick={onCheckout} className="w-full bg-slate-900 text-white py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold">{cartCount}</div>
                            <span className="text-xs font-bold uppercase tracking-widest">Lanjut ke Nota</span>
                        </div>
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Modal Keranjang Detail */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[100] flex items-end bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full rounded-t-[32px] p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between mb-4">
                            <h2 className="font-bold text-lg">Keranjang Saya</h2>
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
                        {cartCount > 0 && (
                            <button onClick={() => { setIsCartOpen(false); onCheckout(); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex justify-between px-6 items-center">
                                <span>Lanjut ke Nota</span>
                                <ChevronRight />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;