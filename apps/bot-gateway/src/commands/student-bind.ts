import { getStudentInvite, useStudentInvite } from '../firestore/student-invites';
import { bindStudent } from '../firestore/student-bindings';

export async function handleStudentBind(
  platformUserId: string,
  platform: 'telegram' | 'line',
  code: string
): Promise<string> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return '❌ 格式錯誤，請輸入：/bind <邀請碼>';
  }

  const invite = await getStudentInvite(trimmedCode);
  if (!invite) {
    return '邀請碼無效或已過期，請向老師索取新的邀請碼。';
  }

  if (invite.usedBy) {
    return '邀請碼無效或已過期，請向老師索取新的邀請碼。';
  }

  const expiresAt = invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
  if (expiresAt < new Date()) {
    return '邀請碼無效或已過期，請向老師索取新的邀請碼。';
  }

  await bindStudent({
    tenantId: invite.tenantId,
    studentId: invite.studentId,
    platform,
    platformUserId,
    studentName: invite.studentName,
    boundAt: new Date(),
  });

  await useStudentInvite(trimmedCode, platformUserId);

  return `綁定成功！你好 ${invite.studentName}，我是神算子 AI 助教，有什麼課業問題都可以問我！`;
}
