import { create } from 'zustand';
import { type SellerNote, type NoteHistory } from '../types';
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
}

let activeChannel: any = null;

export const useStore = create<StoreState>((set, get) => ({
  notes: [],
  globalNote: '',
  globalNoteId: null,
  isLoading: false,
  activeWorkspace: null,
  availableWorkspaces: [],
  user: null,

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
         set({ user: null, activeWorkspace: null, availableWorkspaces: [], notes: [] });
      }
    });
  },

  signOut: async () => {
    if (activeChannel) {
       supabase.removeChannel(activeChannel);
       activeChannel = null;
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
  },

  setActiveWorkspace: (workspaceEmail: string) => {
    set({ activeWorkspace: workspaceEmail });
    get().fetchNotes();
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

  fetchGlobalNote: async () => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;

    const { data, error } = await supabase
      .from('global_notes')
      .select('*')
      .eq('owner_email', activeWorkspace)
      .limit(1)
      .single();

    if (!error && data) {
      set({ globalNote: data.content, globalNoteId: data.id });
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
      const { data } = await supabase
        .from('global_notes')
        .insert([{ content, owner_email: activeWorkspace }])
        .select()
        .single();
      if (data) {
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
  }
}));
