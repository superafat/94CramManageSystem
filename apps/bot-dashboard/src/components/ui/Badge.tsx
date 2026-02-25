type BadgeVariant = 'active' | 'inactive' | 'expired' | 'pending' | 'success' | 'failed';

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-[#A8B5A2]/20 text-[#6B7D64]',
  inactive: 'bg-[#d8d3de]/30 text-[#7b7387]',
  expired: 'bg-[#C4A4A0]/20 text-[#8B6E6A]',
  pending: 'bg-[#C8BFA9]/20 text-[#8B8270]',
  success: 'bg-[#A8B5A2]/20 text-[#6B7D64]',
  failed: 'bg-[#C4A4A0]/20 text-[#8B6E6A]',
};

const variantLabels: Record<BadgeVariant, string> = {
  active: '啟用中',
  inactive: '未啟用',
  expired: '已過期',
  pending: '等待中',
  success: '成功',
  failed: '失敗',
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
}

export default function Badge({ variant, label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}
    >
      {label ?? variantLabels[variant]}
    </span>
  );
}
