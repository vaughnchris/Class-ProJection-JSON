import { create } from 'zustand';

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
  
  // Instructor State
  instructorCode: 'print("Welcome to Class Projection!")',
  instructorCursor: { lineNumber: 1, column: 1 },
  instructorScroll: 0,
  
  // Student Local State
  studentLocalCode: '',
  studentSharedLocalCode: '',
  studentNeedHelp: false,

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
  
  setInstructorCode: (code) => set({ instructorCode: code }),
  setInstructorCursor: (cursor) => set({ instructorCursor: cursor }),
  setInstructorScroll: (scroll) => set({ instructorScroll: scroll }),
  
  setStudentLocalCode: (code) => set({ studentLocalCode: code }),
  setStudentSharedLocalCode: (code) => set({ studentSharedLocalCode: code }),
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
  
  // Helper to sync remote state from Firebase
  syncFromFirebase: (data) => set((state) => ({
    ...state,
    ...data
  }))
}));

export default useStore;
