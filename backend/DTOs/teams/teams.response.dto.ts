export interface TeamView {
  id: number;
  name: string;
  code: string;
  lead: string | null;
  member_count: number;
}

export interface TeamPage {
  items: TeamView[];
}
