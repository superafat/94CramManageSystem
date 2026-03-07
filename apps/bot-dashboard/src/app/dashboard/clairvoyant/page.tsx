import { BotDetailPage } from '../../../components/BotDetailPage'

export default function ClairvoyantPage() {
  return (
    <BotDetailPage
      config={{
        botType: 'clairvoyant',
        name: '千里眼',
        icon: '🔮',
        platform: 'telegram',
        audience: '行政端 · 管理者',
      }}
    />
  )
}
