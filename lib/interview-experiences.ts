export type InterviewExperience = {
  id: number;
  title: string;
  company: string;
  role: string;
  round: string;
  interview_date: string;
  source_url: string;
  content: string;
  created_at: number;
  updated_at: number;
};
export type ExperienceDraft = Omit<
  InterviewExperience,
  'id' | 'created_at' | 'updated_at'
>;
export const emptyExperience: ExperienceDraft = {
  title: '',
  company: '',
  role: '',
  round: '',
  interview_date: '',
  source_url: '',
  content: '',
};
