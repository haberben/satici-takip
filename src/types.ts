export type SellerStatus = 'pending' | 'resolved' | 'archived';

export interface NoteHistory {
  timestamp: string;
  previousState: Partial<SellerNote>;
  editedBy?: string;
}

export interface SellerNote {
  id: string;
  storeName: string;
  fromWhom: string;
  subject: string;
  subjectDetail: string;
  internalNote?: string;
  productCount: number;
  sellerName: string;
  phoneNumber: string;
  solution: string;
  requestDate: string;
  solutionDate?: string;
  status: SellerStatus;
  reminderDate?: string;
  reminderSent?: boolean;
  notifyBrowser?: boolean;
  notifyEmail?: boolean;
  history?: NoteHistory[];
  created_at?: string;
  owner_email?: string;
}

export interface GlobalNote {
  id: string;
  content: string;
  updated_at: string;
  owner_email?: string;
}

export interface PanelShare {
  id: string;
  owner_email: string;
  shared_with_email: string;
}

export type IssueStatus = 'pending' | 'resolved' | 'archived';

export interface IssueNote {
  id: string;
  issue_text: string;
  solution_text: string;
  status: IssueStatus;
  reminder_date?: string;
  reminder_sent?: boolean;
  notifyBrowser?: boolean;
  notifyEmail?: boolean;
  owner_email?: string;
  created_at?: string;
}

