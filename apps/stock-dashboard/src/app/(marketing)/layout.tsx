import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#3d4a45]">
      <header className="border-b border-[#d5cec2] bg-[#f4efe7]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-semibold tracking-tight text-[#6f8574]">
            94Stock
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md border border-[#b9c4b2] px-4 py-2 text-sm text-[#4f5f56] transition hover:bg-[#e9e2d8]"
            >
              登入
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[#8fa895] px-4 py-2 text-sm text-white transition hover:bg-[#7a9380]"
            >
              註冊
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[#d5cec2] bg-[#f4efe7]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-[#6c756f] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} 94Stock. All rights reserved.</p>
          <p>專為教育機構打造的庫存管理平台</p>
        </div>
      </footer>
    </div>
  );
}
