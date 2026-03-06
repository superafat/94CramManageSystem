'use client'

import { TuitionWorkbench } from './_components/tuition-workbench'

export default function BillingPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-text">💰 帳務管理</h1>
      <TuitionWorkbench />
    </div>
  )
}
