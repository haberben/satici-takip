import { create } from 'zustand';
import { type SellerNote, type NoteHistory } from '../types';
import { supabase } from '../lib/supabase';

interface StoreState {
  notes: SellerNote[];
  globalNote: string;
  globalNoteId: string | null;
  isLoading: boolean;
  fetchNotes: () => Promise<void>;
  fetchGlobalNote: () => Promise<void>;
  updateGlobalNote: (content: string) => Promise<void>;
  addNote: (note: Omit<SellerNote, 'id'>) => Promise<void>;
  updateNote: (id: string, newValues: Partial<SellerNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  markReminderSent: (id: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  notes: [],
  globalNote: '',
  globalNoteId: null,
  isLoading: false,

  fetchNotes: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // JSON parse for history if needed (supabase pg returns array of objects naturally for jsonb)
      set({ notes: data as SellerNote[] });
    }
    set({ isLoading: false });
  },

  fetchGlobalNote: async () => {
    const { data, error } = await supabase
      .from('global_notes')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      set({ globalNote: data.content, globalNoteId: data.id });
    } else {
      // Tabloda kayıt yoksa veya hata varsa initial değer
      set({ globalNote: '', globalNoteId: null });
    }
  },

  updateGlobalNote: async (content: string) => {
    const { globalNoteId } = get();
    set({ globalNote: content }); // optimistic update

    if (globalNoteId) {
      await supabase
        .from('global_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', globalNoteId);
    } else {
      const { data } = await supabase
        .from('global_notes')
        .insert([{ content }])
        .select()
        .single();
      if (data) {
        set({ globalNoteId: data.id });
      }
    }
  },

  addNote: async (note) => {
    // defaults for new note
    const noteData = {
      ...note,
      notifyBrowser: note.notifyBrowser ?? true,
      notifyEmail: note.notifyEmail ?? false,
      history: []
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
    const historyItem: NoteHistory = {
      timestamp: new Date().toISOString(),
      previousState: { ...oldNote }
    };
    
    // limit history to 5 elements (newest at start, drop 6th)
    const currentHist = oldNote.history || [];
    const newHistory = [historyItem, ...currentHist].slice(0, 5);

    const updatedData = { ...newValues, history: newHistory };

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
  }
}));
