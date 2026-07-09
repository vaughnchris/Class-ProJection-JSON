import { create } from 'zustand';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const useStore = create((set) => ({
  // User Profile
  user: null, // Initial state should be null if not logged in
  
  // Backwards compatibility for easy role checking
  role: null, 
  userId: null,
  userName: null,

  // Session Data
  sessionId: null,
  activeMode: 'broadcast', // 'independent' | 'broadcast' | 'execute'
  isSharing: false,
  allowEdit: false,
  isSessionSyncing: false,
  
  // Instructor State
  instructorCode: 'print("Welcome to Class Projection!")',
  instructorCursor: { lineNumber: 1, column: 1 },
  instructorScroll: 0,
  
  // Student Local State
  activeTab: 'about',
  tabs: [
    { 
      id: 'about', 
      name: 'About', 
      code: '', 
      isCloseable: true,
      isOpen: true
    }
  ],
  studentLocalCode: '',
  studentNeedHelp: false,
  selectedChatUser: null,
  viewedStudentId: null,
  viewedStudentMode: null,
  viewedStudentTabs: [],
  viewedStudentActiveTab: null,
  activityInstructions: '',
  instructorTabs: [],
  instructorActiveTab: null,

  // Execution State
  consoleOutput: [],
  interactiveHistory: [], // For the interactive REPL tab
  isExecuting: false,
  isInteractiveExecuting: false,

  // Actions
  setUser: (userData) => set({ 
    user: userData,
    role: userData?.role || null,
    userId: userData?.email || null,
    userName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : null
  }),
  setRole: (role) => set({ role }),
  setUserId: (userId) => set({ userId }),
  setUserName: (userName) => set({ userName }),
  
  setSessionId: (sessionId) => set({ sessionId }),
  setActiveMode: (mode) => set({ activeMode: mode }),
  setIsSharing: (isSharing) => set({ isSharing }),
  setAllowEdit: (allowEdit) => set({ allowEdit }),
  setSessionSyncing: (isSessionSyncing) => set({ isSessionSyncing }),
  setSelectedChatUser: (selectedChatUser) => set({ selectedChatUser }),
  setViewedStudentId: (viewedStudentId) => set({ viewedStudentId }),
  setViewedStudentMode: (viewedStudentMode) => set({ viewedStudentMode }),
  setViewedStudentTabs: (viewedStudentTabs) => set({ viewedStudentTabs }),
  setViewedStudentActiveTab: (viewedStudentActiveTab) => set({ viewedStudentActiveTab }),
  setActivityInstructions: (activityInstructions) => set({ activityInstructions }),
  setInstructorTabs: (instructorTabs) => set({ instructorTabs }),
  setInstructorActiveTab: (instructorActiveTab) => set({ instructorActiveTab }),
  
  // Font Size
  fontSize: Number(localStorage.getItem('ide_font_size')) || 14,
  increaseFontSize: () => set((state) => {
    const nextSize = Math.min(state.fontSize + 1, 36);
    localStorage.setItem('ide_font_size', nextSize);
    return { fontSize: nextSize };
  }),
  decreaseFontSize: () => set((state) => {
    const nextSize = Math.max(state.fontSize - 1, 9);
    localStorage.setItem('ide_font_size', nextSize);
    return { fontSize: nextSize };
  }),
  
  setInstructorCode: (code) => set((state) => ({ 
    instructorCode: code,
    tabs: state.role === 'instructor' 
      ? state.tabs.map(t => t.id === state.activeTab ? { ...t, code } : t)
      : state.tabs
  })),
  setInstructorCursor: (cursor) => set({ instructorCursor: cursor }),
  setInstructorScroll: (scroll) => set({ instructorScroll: scroll }),
  
  setActiveTab: (tabId) => set((state) => {
    if (state.role === 'instructor' && state.viewedStudentId) {
      return { viewedStudentActiveTab: tabId };
    }
    const isInstructor = state.role === 'instructor';
    const activeTabObj = state.tabs.find(t => t.id === tabId);
    return {
      activeTab: tabId,
      ...(isInstructor && activeTabObj ? { instructorCode: activeTabObj.code } : {})
    };
  }),
  addTab: (tab) => set((state) => {
    const isInstructor = state.role === 'instructor';
    const newTab = { ...tab, isOpen: true };
    return { 
      tabs: [...state.tabs, newTab], 
      activeTab: tab.id,
      ...(isInstructor ? { instructorCode: tab.code } : {})
    };
  }),
  closeTab: (id) => set((state) => {
    const newTabs = state.tabs.map(t => t.id === id ? { ...t, isOpen: false } : t);
    let nextActiveTab = state.activeTab;
    if (state.activeTab === id) {
      const openTabs = newTabs.filter(t => t.isOpen);
      const idx = state.tabs.findIndex(t => t.id === id);
      nextActiveTab = openTabs[Math.max(0, openTabs.length - 1)]?.id || 'about';
    }
    const isInstructor = state.role === 'instructor';
    const activeTabObj = newTabs.find(t => t.id === nextActiveTab);
    return { 
      tabs: newTabs, 
      activeTab: nextActiveTab,
      ...(isInstructor && activeTabObj ? { instructorCode: activeTabObj.code } : {})
    };
  }),
  openTab: (id) => set((state) => {
    const newTabs = state.tabs.map(t => t.id === id ? { ...t, isOpen: true } : t);
    const isInstructor = state.role === 'instructor';
    const activeTabObj = newTabs.find(t => t.id === id);
    return {
      tabs: newTabs,
      activeTab: id,
      ...(isInstructor && activeTabObj ? { instructorCode: activeTabObj.code } : {})
    };
  }),
  deleteTab: (id) => set((state) => {
    const activeTab = state.activeTab;
    const newTabs = state.tabs.filter(t => t.id !== id);
    let nextActiveTab = activeTab;
    if (activeTab === id) {
      const openTabs = newTabs.filter(t => t.isOpen);
      nextActiveTab = openTabs[Math.max(0, openTabs.length - 1)]?.id || 'about';
    }
    const isInstructor = state.role === 'instructor';
    const activeTabObj = newTabs.find(t => t.id === nextActiveTab);
    return { 
      tabs: newTabs, 
      activeTab: nextActiveTab,
      ...(isInstructor && activeTabObj ? { instructorCode: activeTabObj.code } : {})
    };
  }),
  renameTab: (id, name) => set((state) => ({
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, name } : t))
  })),
  updateTabCode: (id, code) => set((state) => {
    if (state.role === 'instructor' && state.viewedStudentId && state.viewedStudentMode === 'edit') {
      return {
        viewedStudentTabs: state.viewedStudentTabs.map((t) => (t.id === id ? { ...t, code } : t))
      };
    }
    const isInstructor = state.role === 'instructor';
    const extraUpdates = {};
    if (isInstructor && id === state.activeTab) {
      extraUpdates.instructorCode = code;
    } else if (!isInstructor && id === state.activeTab) {
      extraUpdates.studentLocalCode = code;
    }
    return {
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, code } : t)),
      ...extraUpdates
    };
  }),
  setStudentLocalCode: (code) => set((state) => ({ 
    studentLocalCode: code,
    tabs: state.role !== 'instructor' 
      ? state.tabs.map(t => t.id === state.activeTab ? { ...t, code } : t)
      : state.tabs
  })),
  setStudentNeedHelp: (needsHelp) => set({ studentNeedHelp: needsHelp }),

  setExecuting: (isExecuting) => set({ isExecuting }),
  setInteractiveExecuting: (isInteractiveExecuting) => set({ isInteractiveExecuting }),
  
  appendToConsole: (text, type = 'output') => set((state) => ({ 
    consoleOutput: [...state.consoleOutput, { text, type, timestamp: Date.now() }] 
  })),
  clearConsole: () => set({ consoleOutput: [] }),

  appendToInteractive: (text, type = 'output') => set((state) => ({ 
    interactiveHistory: [...state.interactiveHistory, { text, type, timestamp: Date.now() }] 
  })),
  clearInteractive: () => set({ interactiveHistory: [] }),
  
  updateSession: async (fields) => {
    set({ isSessionSyncing: true });
    try {
      await setDoc(doc(db, 'sessions/main_classroom'), fields, { merge: true });
    } catch (err) {
      console.error("Error updating session in Firebase:", err);
    } finally {
      set({ isSessionSyncing: false });
    }
  },

  // Helper to sync remote state from Firebase
  syncFromFirebase: (data) => set((state) => ({
    ...state,
    ...data
  }))
}));

export default useStore;
