// Tampilan laporan pemeriksaan fisik barang (dipakai di halaman Restock dan Transaksi)
export default function InspectionReport({ report }) {
  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Laporan Pemeriksaan</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${report.is_match ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {report.is_match ? 'Barang sesuai' : 'Barang tidak sesuai'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="th pl-0">Produk</th><th className="th text-right">Dipesan</th><th className="th text-right">Diterima</th><th className="th text-right">Rusak</th></tr></thead>
          <tbody>
            {report.items.map((i) => (
              <tr key={i.product_id} className="border-t border-slate-200">
                <td className="td pl-0">{i.name}</td>
                <td className="td text-right">{i.ordered_qty} {i.unit}</td>
                <td className="td text-right">{i.received_qty}</td>
                <td className={`td text-right ${i.damaged_qty > 0 ? 'font-semibold text-red-600' : ''}`}>{i.damaged_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.notes && <p className="mt-2 text-sm text-slate-600"><span className="text-slate-400">Catatan:</span> {report.notes}</p>}
      <p className="mt-1 text-xs text-slate-400">Diperiksa oleh {report.inspected_by_name}{report.created_at ? ` · ${report.created_at.slice(0, 16)}` : ''}</p>
    </div>
  );
}
