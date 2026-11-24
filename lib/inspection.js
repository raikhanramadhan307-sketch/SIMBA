// Subquery JSON laporan pemeriksaan untuk sebuah PO (expr = kolom id PO, mis. "r.id")
export const inspectionSql = (expr) => `(SELECT json_build_object(
    'is_match', ir.is_match, 'notes', ir.notes, 'created_at', ir.created_at, 'inspected_by_name', iu.name,
    'items', (SELECT json_agg(json_build_object('product_id', ii.product_id, 'name', p2.name, 'unit', p2.unit,
                'ordered_qty', ii.ordered_qty, 'received_qty', ii.received_qty, 'damaged_qty', ii.damaged_qty) ORDER BY ii.id)
              FROM inspection_items ii JOIN products p2 ON p2.id = ii.product_id WHERE ii.report_id = ir.id))
  FROM inspection_reports ir LEFT JOIN users iu ON iu.id = ir.inspected_by WHERE ir.restock_id = ${expr})`;
