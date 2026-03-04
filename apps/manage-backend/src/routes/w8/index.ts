import { Hono } from 'hono'
import type { RBACVariables } from '../../middleware/rbac'
import { authMiddleware } from '../../middleware/auth'
import { teacherRoutes } from './teachers'
import { courseRoutes } from './courses'
import { scheduleRoutes } from './schedules'
import { salaryRoutes } from './salary'
import { expenseRoutes } from './expenses'
import { notificationRoutes } from './notifications'

export const w8Routes = new Hono<{ Variables: RBACVariables }>()
w8Routes.use('*', authMiddleware)
w8Routes.route('/', teacherRoutes)
w8Routes.route('/', courseRoutes)
w8Routes.route('/', scheduleRoutes)
w8Routes.route('/', salaryRoutes)
w8Routes.route('/', expenseRoutes)
w8Routes.route('/', notificationRoutes)
