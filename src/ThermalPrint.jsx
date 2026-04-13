import React, { forwardRef } from "react";

const ThermalPrint = forwardRef(({ nota, totals, formatAngka, qrisString }, ref) => {
  if (!nota) return null;
  const totalItems = nota.items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div ref={ref} className="thermal-root">
      <style>
        {`
  .thermal-root {
  width: 58mm;
  margin: 0 auto;
  font-family: "Courier New", monospace;
  font-size: 10px;
  color: black;
}

.bold {
  font-weight: bold;
}

.small {
  font-size: 9px;
}

.divider {
  border-top: 1px dashed black;
  margin: 4px 0;
}

.text-center {
  text-align: center;
}

.flex {
  display: flex;
  justify-content: space-between;
}

@media print {
  @page {
    size: 58mm auto;
    margin: 0;
  }

  body {
    margin: 0;
  }

  .thermal-root {
    width: 58mm;
    max-width: 58mm;
  }
}
`}
      </style>
      <div className="text-center bold">BENGKEL BIRRU MOTOR</div>
      <div className="text-center small">Sumberjati Wetan - Wedoro - Pandaan</div>
      <div className="text-center small">No. WA: 083117583901</div>

      <div className="divider" />

      <div>Nama : {nota.customer_name}</div>
      <div>Tgl  : {nota.date}</div>

      <div className="divider" />

      <div className="flex justify-between bold">
        <span>Nama Barang/Jasa</span>
        <span>Jumlah</span>
      </div>

      <div className="divider" />

      {nota.items.map((item, i) => (
        <div key={i}>
          <div>{item.name}</div>
          <div className="flex justify-between small">
            <span>{item.qty} x {formatAngka(item.price)}</span>
            <span>{formatAngka(item.qty * item.price)}</span>
          </div>
        </div>
      ))}

      <div className="flex justify-between">
        <span>Ongkos Jasa</span>
        <span>{formatAngka(nota.serviceFee)}</span>
      </div>

      <div className="divider" />

      <div className="flex justify-between bold border-t mt-2">
        <span>Total Items:</span>
        <span>{totalItems}</span>
      </div>

      {/* <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatAngka(totals.subTotal)}</span>
      </div>

      <div className="divider" /> */}

      <div className="flex justify-between bold">
        <span>TOTAL</span>
        <span>{formatAngka(totals.grandTotal)}</span>
      </div>

      <div className="flex justify-between">
        <span>Diterima</span>
        <span>{formatAngka(nota.amountPaid)}</span>
      </div>

      <div className="flex justify-between">
        <span>{totals.diff < 0 ? "Kurang" : "Kembali"}</span>
        <span>{formatAngka(Math.abs(totals.diff))}</span>
      </div>

      <div className="divider" />

      {/* QRIS */}
      <div className="text-center">
        {qrisString ? (
          <img
            src="https://drive.google.com/file/d/1dtWznsVYkMd9k62AfVGS3EaOf8wrW8id/view?usp=sharing"
            alt="QRIS BRI"
            className="mx-auto"
            style={{ width: '120px', height: '120px' }}
          />,
          <div className="small">A/N: NURUL ANWAR</div>
        ) : (
          <div className="small">QR tidak tersedia</div>
        )}
        <div className="small">Scan QR untuk bayar</div>
      </div>

      <div className="divider" />

      <div className="text-center small">
        Terima kasih 🙏
      </div>
    </div>
  );
});

export default ThermalPrint;