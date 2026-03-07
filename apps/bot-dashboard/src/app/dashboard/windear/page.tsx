import { BotDetailPage } from '../../../components/BotDetailPage'

export default function WindearPage() {
  return (
    <BotDetailPage
      config={{
        botType: 'windear',
        name: '順風耳',
        icon: '👂',
        platform: 'telegram',
        audience: '家長端',
      }}
    />
  )
}
