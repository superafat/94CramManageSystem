import { BotDetailPage } from '../../../components/BotDetailPage'

export default function AiTutorPage() {
  return (
    <BotDetailPage
      config={{
        botType: 'ai-tutor',
        name: '神算子',
        icon: '📐',
        platform: 'telegram',
        audience: '學生課業助教',
      }}
    />
  )
}
