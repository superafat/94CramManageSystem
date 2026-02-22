/**
 * W5: Auto Billing Engine
 * Generate monthly invoices from enrollments
 */
import { db } from '../db/index'
import { sql } from 'drizzle-orm'

export interface Invoice {
  id: string
  studentName: string
  period: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  total: number
  status: string
}

interface InvoiceItem {
  subject: string
  monthlyFee: number
  textbookFee: number
  platformFee: number
  subtotal: number
}

/**
 * Generate invoices for all active students in a branch for a given month
 */
export async function generateInvoices(
  tenantId: string,
  branchId: string,
  period: string  // '2026-02'
): Promise<{ generated: number; invoices: Invoice[] }> {
  // Get all active enrollments grouped by student
  const rows = await db.execute(sql`
    SELECT
      s.id as student_id, s.name as student_name,
      e.course_name as subject,
      COALESCE(e.fee_monthly, 0) as monthly_fee,
      COALESCE(e.textbook_fee, 0) as textbook_fee,
      COALESCE(e.platform_fee, 0) as platform_fee
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.tenant_id = ${tenantId}
      AND s.branch_id = ${branchId}
      AND e.status = 'active'
      AND s.status = 'active'
    ORDER BY s.name, e.course_name
  `) as unknown as any[]

  // Group by student
  const studentMap = new Map<string, { name: string; items: InvoiceItem[] }>()
  for (const r of rows) {
    if (!studentMap.has(r.student_id)) {
      studentMap.set(r.student_id, { name: r.student_name, items: [] })
    }
    const item: InvoiceItem = {
      subject: r.subject,
      monthlyFee: Number(r.monthly_fee),
      textbookFee: Number(r.textbook_fee),
      platformFee: Number(r.platform_fee),
      subtotal: Number(r.monthly_fee) + Number(r.textbook_fee) + Number(r.platform_fee),
    }
    studentMap.get(r.student_id)!.items.push(item)
  }

  const invoices: Invoice[] = []

  for (const [studentId, data] of studentMap) {
    const subtotal = data.items.reduce((s, i) => s + i.subtotal, 0)
    const total = subtotal // no discount by default

    // Check if invoice already exists
    const existing = await db.execute(sql`
      SELECT id FROM invoices
      WHERE tenant_id = ${tenantId} AND student_id = ${studentId} AND period = ${period}
    `) as unknown as any[]

    if (existing.length > 0) continue // skip duplicates

    const result = await db.execute(sql`
      INSERT INTO invoices (tenant_id, student_id, branch_id, period, items, subtotal, discount, total, due_date)
      VALUES (${tenantId}, ${studentId}, ${branchId}, ${period},
              ${JSON.stringify(data.items)}::jsonb, ${subtotal}, 0, ${total},
              ${period + '-10'}::date)
      RETURNING id
    `) as unknown as { id: string }[]

    invoices.push({
      id: result[0].id,
      studentName: data.name,
      period,
      items: data.items,
      subtotal,
      discount: 0,
      total,
      status: 'pending',
    })
  }

  return { generated: invoices.length, invoices }
}

/**
 * Get invoices for a period
 */
export async function getInvoices(tenantId: string, branchId: string, period: string) {
  const rows = await db.execute(sql`
    SELECT i.*, s.name as student_name
    FROM invoices i
    JOIN students s ON i.student_id = s.id
    WHERE i.tenant_id = ${tenantId}
      AND i.branch_id = ${branchId}
      AND i.period = ${period}
    ORDER BY s.name
  `)
  return rows
}

/**
 * Mark invoice as paid
 */
export async function markPaid(invoiceId: string, method: string, ref?: string) {
  await db.execute(sql`
    UPDATE invoices SET status = 'paid', paid_at = NOW(),
      payment_method = ${method}, payment_ref = ${ref ?? null}
    WHERE id = ${invoiceId}
  `)
}
