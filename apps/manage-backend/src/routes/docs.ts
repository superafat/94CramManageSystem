/**
 * API Documentation - OpenAPI/Swagger 註解
 * 
 * 為現有路由提供 OpenAPI 3.0 規格文檔
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: 使用者登入
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecureP@ssw0rd
 *     responses:
 *       200:
 *         description: 登入成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 550e8400-e29b-41d4-a716-446655440000
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         role:
 *                           type: string
 *                           example: user
 *       400:
 *         description: 請求格式錯誤
 *       401:
 *         description: 認證失敗
 */

/**
 * @openapi
 * /api/auth/firebase:
 *   post:
 *     summary: Firebase Token 認證
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firebaseToken
 *             properties:
 *               firebaseToken:
 *                 type: string
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4...
 *     responses:
 *       200:
 *         description: Firebase 認證成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     userId:
 *                       type: string
 *       401:
 *         description: Firebase token 無效
 */

/**
 * @openapi
 * /api/auth/telegram:
 *   post:
 *     summary: Telegram 登入
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - first_name
 *               - auth_date
 *               - hash
 *             properties:
 *               id:
 *                 type: number
 *                 example: 123456789
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               username:
 *                 type: string
 *                 example: johndoe
 *               auth_date:
 *                 type: number
 *                 example: 1640000000
 *               hash:
 *                 type: string
 *                 example: abc123def456...
 *     responses:
 *       200:
 *         description: Telegram 登入成功
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: 取得所有使用者列表
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 使用者列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未授權
 *   post:
 *     summary: 建立新使用者
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecureP@ss123
 *               role:
 *                 type: string
 *                 enum: [super_admin, admin, user]
 *                 example: user
 *     responses:
 *       201:
 *         description: 使用者建立成功
 *       400:
 *         description: 請求格式錯誤
 *       403:
 *         description: 權限不足
 */

/**
 * @openapi
 * /api/users/{id}/role:
 *   put:
 *     summary: 更新使用者角色
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 使用者 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [super_admin, admin, user]
 *                 example: admin
 *     responses:
 *       200:
 *         description: 角色更新成功
 *       403:
 *         description: 權限不足或嘗試修改自己的角色
 *       404:
 *         description: 使用者不存在
 */

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: 基礎健康檢查
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: 系統健康
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: healthy
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       example: 3600.5
 *                     database:
 *                       type: string
 *                       example: connected
 *       503:
 *         description: 服務不健康
 */

/**
 * @openapi
 * /api/health/ready:
 *   get:
 *     summary: 就緒探針
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: 服務就緒
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ready
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       503:
 *         description: 服務未就緒
 */

/**
 * @openapi
 * /api/health/live:
 *   get:
 *     summary: 存活探針
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: 服務存活
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: alive
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       example: 3600.5
 */

/**
 * @openapi
 * /api/enrollment/leads:
 *   get:
 *     summary: 取得招生名單
 *     tags:
 *       - Enrollment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, contacted, trial_scheduled, trial_completed, enrolled, lost]
 *         description: 篩選特定狀態
 *     responses:
 *       200:
 *         description: 招生名單列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   name:
 *                     type: string
 *                     example: 王小明家長
 *                   phone:
 *                     type: string
 *                     example: 0912345678
 *                   student_name:
 *                     type: string
 *                     example: 王小明
 *                   student_grade:
 *                     type: string
 *                     example: 國一
 *                   status:
 *                     type: string
 *                     example: new
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *   post:
 *     summary: 新增招生名單
 *     tags:
 *       - Enrollment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - student_name
 *               - student_grade
 *             properties:
 *               name:
 *                 type: string
 *                 example: 王小明家長
 *               phone:
 *                 type: string
 *                 example: 0912345678
 *               student_name:
 *                 type: string
 *                 example: 王小明
 *               student_grade:
 *                 type: string
 *                 example: 國一
 *               interest_subjects:
 *                 type: string
 *                 example: 數學, 英文
 *     responses:
 *       201:
 *         description: 名單新增成功
 *       400:
 *         description: 請求格式錯誤
 */

/**
 * @openapi
 * /api/enrollment/funnel:
 *   get:
 *     summary: 取得招生漏斗數據
 *     tags:
 *       - Enrollment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 招生漏斗統計
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stage:
 *                     type: string
 *                     example: new
 *                   count:
 *                     type: number
 *                     example: 50
 *                   percentage:
 *                     type: number
 *                     example: 100
 */

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             code:
 *               type: string
 */

export const apiDocumentation = {
  openapi: '3.0.0',
  info: {
    title: '94Manage API',
    version: '1.0.0',
    description: '補習班管理系統 API 文檔',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: '開發環境',
    },
  ],
}
