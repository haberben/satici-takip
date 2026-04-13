export type SellerStatus = 'pending' | 'resolved' | 'archived';

export interface NoteHistory {
  timestamp: string;
  previousState: Partial<SellerNote>;
}

export interface SellerNote {
  id: string;
  storeName: string;
  fromWhom: string;
  subject: string;
  subjectDetail: string;
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
}

export interface GlobalNote {
  id: string;
  content: string;
  updated_at: string;
}
