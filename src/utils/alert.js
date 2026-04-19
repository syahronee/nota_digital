import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Fungsi untuk menampilkan toast notifikasi
export const showToast = (title, icon = 'success') => {
  MySwal.fire({
    title,
    icon,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#ffffff',
    customClass: {
      popup: 'rounded-[24px] shadow-xl border border-slate-100',
      title: 'text-sm font-bold text-slate-800'
    }
  });
};

// Fungsi untuk menampilkan alert dengan opsi yang lebih lengkap
export const showAlert = async (title, text, icon = 'info') => {
  return MySwal.fire({
    title,
    text,
    icon,
    padding: '2rem',
    color: '#1e293b',
    background: '#ffffff',
    confirmButtonColor: '#2563eb',
    confirmButtonText: 'Oke, Mengerti!',
    buttonsStyling: true,
    customClass: {
      popup: 'rounded-[40px] border-none shadow-2xl',
      title: 'text-2xl font-black tracking-tighter italic',
      htmlContainer: 'text-slate-600 font-medium',
      confirmButton: 'px-8 py-3 rounded-2xl font-bold transition-all active:scale-95'
    }
  });
};

// Fungsi untuk menampilkan konfirmasi sebelum melakukan aksi yang berisiko
export const showConfirm = async (title, text) => {
  return MySwal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Ya, Yakin!',
    cancelButtonText: 'Batal',
    customClass: {
      popup: 'rounded-[40px]',
      confirmButton: 'px-6 py-3 rounded-2xl font-bold mr-2',
      cancelButton: 'px-6 py-3 rounded-2xl font-bold'
    }
  });
};