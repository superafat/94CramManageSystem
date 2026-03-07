import { BotDetailPage } from '../../../components/BotDetailPage'

export default function WentaishiPage() {
  return (
    <BotDetailPage
      config={{
        botType: 'wentaishi',
        name: '聞仲老師',
        icon: '📖',
        platform: 'line',
        audience: 'LINE 客服',
      }}
    />
  )
}
