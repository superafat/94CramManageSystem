import { Hono } from 'hono'
import { botAuth } from '../../middleware/botAuth'
import finance from './finance'
import student from './student'
import data from './data'

type BotExtVariables = { tenantId: string; botRequest: boolean }

const app = new Hono<{ Variables: BotExtVariables }>()

app.use('*', botAuth)
app.route('/finance', finance)
app.route('/student', student)
app.route('/data', data)

export default app
