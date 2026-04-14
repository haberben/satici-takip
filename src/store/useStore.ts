import { create } from 'zustand';
import { type SellerNote, type NoteHistory, type IssueNote } from '../types';
import { supabase } from '../lib/supabase';

interface StoreState {
  notes: SellerNote[];
  globalNote: string;
  globalNoteId: string | null;
  isLoading: boolean;
  activeWorkspace: string | null;
  availableWorkspaces: string[];
  initWorkspaces: (userEmail: string) => Promise<void>;
  setActiveWorkspace: (workspaceEmail: string) => void;
  fetchNotes: () => Promise<void>;
  fetchGlobalNote: () => Promise<void>;
  updateGlobalNote: (content: string) => Promise<void>;
  addNote: (note: Omit<SellerNote, 'id'>) => Promise<void>;
  updateNote: (id: string, newValues: Partial<SellerNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  bulkDeleteNotes: (ids: string[]) => Promise<void>;
  markReminderSent: (id: string) => Promise<void>;
  sharePanel: (ownerEmail: string, sharedWithEmail: string) => Promise<void>;
  removeShare: (ownerEmail: string, sharedWithEmail: string) => Promise<void>;
  user: any | null;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  
  // Issues
  issues: IssueNote[];
  fetchIssues: () => Promise<void>;
  addIssue: (issue: Omit<IssueNote, 'id'>) => Promise<void>;
  updateIssue: (id: string, newValues: Partial<IssueNote>) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;
  bulkDeleteIssues: (ids: string[]) => Promise<void>;
  markIssueReminderSent: (id: string) => Promise<void>;
}

let activeChannel: any = null;
let activeIssueChannel: any = null;

export const useStore = create<StoreState>((set, get) => ({
  notes: [],
  globalNote: '',
  globalNoteId: null,
  isLoading: false,
  activeWorkspace: null,
  availableWorkspaces: [],
  user: null,
  issues: [],

  checkAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if(session?.user) {
        set({ user: session.user });
        get().initWorkspaces(session.user.email!);
    } else {
        set({ user: null });
    }
    
    supabase.auth.onAuthStateChange((_event, session) => {
      if(session?.user) {
         localStorage.setItem('saticiUserEmail', session.user.email!);
         set({ user: session.user });
         get().initWorkspaces(session.user.email!);
      } else {
         localStorage.removeItem('saticiUserEmail');
         if (activeChannel) {
            supabase.removeChannel(activeChannel);
            activeChannel = null;
         }
         if (activeIssueChannel) {
            supabase.removeChannel(activeIssueChannel);
            activeIssueChannel = null;
         }
         set({ user: null, activeWorkspace: null, availableWorkspaces: [], notes: [], issues: [] });
      }
    });
  },

  signOut: async () => {
    if (activeChannel) {
       supabase.removeChannel(activeChannel);
       activeChannel = null;
    }
    if (activeIssueChannel) {
       supabase.removeChannel(activeIssueChannel);
       activeIssueChannel = null;
    }
    await supabase.auth.signOut();
    localStorage.removeItem('saticiUserEmail');
  },

  initWorkspaces: async (userEmail: string) => {
    // Kendi hesabimiz her zaman var
    let workspaces = [userEmail];
    
    // Bize paylasilan panelleri bul
    const { data } = await supabase
      .from('panel_shares')
      .select('owner_email')
      .eq('shared_with_email', userEmail);
    
    if (data) {
      workspaces = [...workspaces, ...data.map(d => d.owner_email)];
    }
    
    set({ availableWorkspaces: workspaces, activeWorkspace: userEmail });
    get().fetchNotes();
    get().fetchIssues();
    get().fetchGlobalNote();
  },

  setActiveWorkspace: (workspaceEmail: string) => {
    set({ activeWorkspace: workspaceEmail });
    get().fetchNotes();
    get().fetchIssues();
    get().fetchGlobalNote();
  },

  fetchNotes: async () => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;

    set({ isLoading: true });
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('owner_email', activeWorkspace)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ notes: data as SellerNote[] });
    }
    set({ isLoading: false });

    // Realtime Aboneliği
    if (activeChannel) {
       supabase.removeChannel(activeChannel);
    }
    
    activeChannel = supabase.channel(`public:notes:${activeWorkspace}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `owner_email=eq.${activeWorkspace}` }, (payload) => {
        const state = get();
        if (payload.eventType === 'INSERT') {
          // If not already fetched optimistically
          if (!state.notes.find(n => n.id === payload.new.id)) {
            set({ notes: [payload.new as SellerNote, ...state.notes] });
          }
        } else if (payload.eventType === 'UPDATE') {
          set({ notes: state.notes.map(n => n.id === payload.new.id ? (payload.new as SellerNote) : n) });
        } else if (payload.eventType === 'DELETE') {
          set({ notes: state.notes.filter(n => n.id !== payload.old.id) });
        }
      })
      .subscribe();
  },

  fetchIssues: async () => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('owner_email', activeWorkspace)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ issues: data as IssueNote[] });
    }

    if (activeIssueChannel) {
       supabase.removeChannel(activeIssueChannel);
    }
    
    activeIssueChannel = supabase.channel(`public:issues:${activeWorkspace}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues', filter: `owner_email=eq.${activeWorkspace}` }, (payload) => {
        const state = get();
        if (payload.eventType === 'INSERT') {
          if (!state.issues.find(i => i.id === payload.new.id)) {
            set({ issues: [payload.new as IssueNote, ...state.issues] });
          }
        } else if (payload.eventType === 'UPDATE') {
          set({ issues: state.issues.map(i => i.id === payload.new.id ? (payload.new as IssueNote) : i) });
        } else if (payload.eventType === 'DELETE') {
          set({ issues: state.issues.filter(i => i.id !== payload.old.id) });
        }
      })
      .subscribe();
  },

  fetchGlobalNote: async () => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;

    const { data, error } = await supabase
      .from('global_notes')
      .select('*')
      .eq('owner_email', activeWorkspace)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      set({ globalNote: data[0].content, globalNoteId: data[0].id });
    } else {
      set({ globalNote: '', globalNoteId: null });
    }
  },

  updateGlobalNote: async (content: string) => {
    const { globalNoteId, activeWorkspace } = get();
    if (!activeWorkspace) return;

    set({ globalNote: content }); // optimistic update

    if (globalNoteId) {
      await supabase
        .from('global_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', globalNoteId);
    } else {
      const { data, error } = await supabase
        .from('global_notes')
        .insert([{ content, owner_email: activeWorkspace }])
        .select()
        .single();
      if (error) {
        console.error('Supabase Global Note Insert Error:', error.message);
      } else if (data) {
        set({ globalNoteId: data.id });
      }
    }
  },

  addNote: async (note) => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;

    const noteData = {
      ...note,
      notifyBrowser: note.notifyBrowser ?? true,
      notifyEmail: note.notifyEmail ?? false,
      history: [],
      owner_email: activeWorkspace,
      internalNote: ''
    };

    const tempId = crypto.randomUUID();
    const newNote = { ...noteData, id: tempId } as SellerNote;
    set((state) => ({ notes: [newNote, ...state.notes] }));

    const { data, error } = await supabase
      .from('notes')
      .insert([noteData])
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error.message);
      set((state) => ({ notes: state.notes.filter(n => n.id !== tempId) }));
    } else if (data) {
      set((state) => ({
        notes: state.notes.map(n => n.id === tempId ? (data as SellerNote) : n)
      }));
    }
  },

  updateNote: async (id, newValues) => {
    const state = get();
    const oldNote = state.notes.find(n => n.id === id);
    if (!oldNote) return;

    // create history snapshot
    const editorEmail = get().user?.email || 'Bilinmiyor';
    const historyItem: NoteHistory = {
      timestamp: new Date().toISOString(),
      previousState: { ...oldNote },
      editedBy: editorEmail
    };
    
    // limit history to 5 elements (newest at start, drop 6th)
    const currentHist = oldNote.history || [];
    const newHistory = [historyItem, ...currentHist].slice(0, 5);

    // Çözüldü Otomasyonu
    const payload = { ...newValues };
    if (payload.status === 'resolved' && oldNote.status !== 'resolved') {
      payload.solutionDate = new Date().toISOString().split('T')[0];
    }

    const updatedData = { ...payload, history: newHistory };

    set((state) => ({
      notes: state.notes.map((n) => n.id === id ? { ...n, ...updatedData } : n)
    }));

    const { error } = await supabase
      .from('notes')
      .update(updatedData)
      .eq('id', id);

    if (error) {
      console.error('Supabase Update Error:', error.message);
    }
  },

  deleteNote: async (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id)
    }));

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase Delete Error:', error.message);
    }
  },

  markReminderSent: async (id) => {
    set((state) => ({
      notes: state.notes.map((n) => n.id === id ? { ...n, reminderSent: true } : n)
    }));

    const { error } = await supabase
      .from('notes')
      .update({ reminderSent: true })
      .eq('id', id);

    if (error) {
      console.error('Supabase markReminderSent Error:', error.message);
    }
  },

  sharePanel: async (ownerEmail: string, sharedWithEmail: string) => {
    const { error } = await supabase
      .from('panel_shares')
      .insert([{ owner_email: ownerEmail, shared_with_email: sharedWithEmail }]);
    
    if (error) {
      console.error('Share Panel Error:', error.message);
      alert('Paylaşım eklenirken bir hata oluştu: ' + error.message);
    } else {
      alert(sharedWithEmail + ' artık panelinizi görebilir.');
    }
  },

  removeShare: async (ownerEmail: string, sharedWithEmail: string) => {
    const { error } = await supabase
      .from('panel_shares')
      .delete()
      .match({ owner_email: ownerEmail, shared_with_email: sharedWithEmail });
    
    if (error) {
      console.error('Remove Share Error:', error.message);
    }
  },

  bulkDeleteNotes: async (ids: string[]) => {
    set((state) => ({
      notes: state.notes.filter((n) => !ids.includes(n.id))
    }));
    const { error } = await supabase.from('notes').delete().in('id', ids);
    if (error) {
      console.error('Supabase Bulk Delete Error:', error.message);
    }
  },

  addIssue: async (issue) => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;

    const issueData = {
      ...issue,
      notifyBrowser: issue.notifyBrowser ?? true,
      notifyEmail: issue.notifyEmail ?? false,
      owner_email: activeWorkspace
    };

    const tempId = crypto.randomUUID();
    const newIssue = { ...issueData, id: tempId } as IssueNote;
    set((state) => ({ issues: [newIssue, ...state.issues] }));

    const { data, error } = await supabase
      .from('issues')
      .insert([issueData])
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error (Issue):', error.message);
      set((state) => ({ issues: state.issues.filter(i => i.id !== tempId) }));
    } else if (data) {
      set((state) => ({
        issues: state.issues.map(i => i.id === tempId ? (data as IssueNote) : i)
      }));
    }
  },

  updateIssue: async (id, newValues) => {
    set((state) => ({
      issues: state.issues.map((i) => i.id === id ? { ...i, ...newValues } : i)
    }));

    const { error } = await supabase
      .from('issues')
      .update(newValues)
      .eq('id', id);

    if (error) {
      console.error('Supabase Update Error (Issue):', error.message);
    }
  },

  deleteIssue: async (id) => {
    set((state) => ({
      issues: state.issues.filter((i) => i.id !== id)
    }));

    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase Delete Error (Issue):', error.message);
    }
  },

  bulkDeleteIssues: async (ids) => {
    set((state) => ({
      issues: state.issues.filter((i) => !ids.includes(i.id))
    }));
    const { error } = await supabase.from('issues').delete().in('id', ids);
    if (error) {
      console.error('Supabase Bulk Delete Error (Issue):', error.message);
    }
  },

  markIssueReminderSent: async (id) => {
    set((state) => ({
      issues: state.issues.map((i) => i.id === id ? { ...i, reminder_sent: true } : i)
    }));

    const { error } = await supabase
      .from('issues')
      .update({ reminder_sent: true })
      .eq('id', id);

    if (error) {
      console.error('Supabase markIssueReminderSent Error:', error.message);
    }
  }
})); 
