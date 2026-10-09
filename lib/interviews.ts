export const INTERVIEW_STATUSES = [
  '已投递',
  '笔试中',
  '一面中',
  '二面中',
  '三面中',
  '终面中',
  '等待结果',
  '简历未通过',
  '笔试挂',
  '一面挂',
  '二面挂',
  '三面挂',
  '终面挂',
  '通过',
  '已获 Offer',
  '已接受 Offer',
  '已撤回',
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
export type Interview = {
  id: number;
  company: string;
  role: string;
  status: InterviewStatus;
  interview_date: string;
  notes: string;
  created_at: number;
  updated_at: number;
};
export function interviewOutcome(status: string) {
  if (['通过', '已获 Offer', '已接受 Offer'].includes(status)) return 'passed';
  if (status.endsWith('挂') || status === '简历未通过') return 'rejected';
  if (status === '已撤回') return 'withdrawn';
  return 'ongoing';
}
