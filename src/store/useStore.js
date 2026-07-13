import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const defaultMainPy = `import json

# CS classroom JSON database
print("--- 1. Loading data.json ---")
with open("data.json", "r") as file:
    data = json.load(file)

print(f"Room name: {data.get('classroom_name')}")
print("Roster of students:")
for student in data.get("students", []):
    status = "Active" if student.get("active") else "Inactive"
    print(f"- {student.get('name')} (Grade: {student.get('grade')}%): {status}")

# Modify JSON data (add a student)
print("\\n--- 2. Adding a new student ---")
new_student = {
    "id": 103,
    "name": "David Miller",
    "grade": 94.0,
    "active": True
}
data["students"].append(new_student)
print(f"Added {new_student['name']} to list.")

# Write back to updated_data.json
print("\\n--- 3. Writing to updated_data.json ---")
with open("updated_data.json", "w") as file:
    json.dump(data, file, indent=4)

print("Saved successfully! The new file 'updated_data.json' will appear in your explorer shortly.")
`;

const defaultDataJson = `{
  "classroom_name": "CS 101: Introduction to Programming",
  "instructor": "Professor Chris Vaughn",
  "semester": "Fall 2026",
  "students": [
    {
      "id": 101,
      "name": "Alice Smith",
      "grade": 95.5,
      "active": true
    },
    {
      "id": 102,
      "name": "Bob Johnson",
      "grade": 88.0,
      "active": false
    }
  ]
}
`;

const defaultTabs = [
  { 
    id: 'about', 
    name: 'About', 
    code: '', 
    isCloseable: false,
    isOpen: true
  },
  {
    id: 'main_py',
    name: 'main.py',
    code: defaultMainPy,
    isCloseable: true,
    isOpen: true
  },
  {
    id: 'data_json',
    name: 'data.json',
    code: defaultDataJson,
    isCloseable: true,
    isOpen: true
  }
];

const useStore = create(
  persist(
    (set) => ({
      // User Profile
  user: null, // Initial state should be null if not logged in
  
  // Backwards compatibility for easy role checking
  role: null, 
  userId: null,
  userName: null,
 
  // Session Data
  sessionId: localStorage.getItem('ide_session_id') || null,
  sessionTitle: 'Python JSON Explorer',
  activeMode: 'broadcast', // 'independent' | 'broadcast' | 'execute'
  isSharing: false,
  allowEdit: false,
  lockStudentActivity: false,
  isSessionSyncing: false,
  studentFeatures: {
    files: true,
    search: true,
    instructions: true,
    testing: true,
    modules: true,
    chat: true,
    presentations: true,
  },
  lastExecuteSignal: null,
  
  // Instructor State
  instructorCode: defaultMainPy,
  instructorCursor: { lineNumber: 1, column: 1 },
  instructorScroll: 0,
  
  // Student Local State
  activeTab: 'about',
  tabs: defaultTabs,
  studentLocalCode: defaultMainPy,
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
  
  setSessionId: (sessionId) => {
    if (sessionId) {
      localStorage.setItem('ide_session_id', sessionId);
    } else {
      localStorage.removeItem('ide_session_id');
    }
    set({ sessionId });
  },
  setSessionTitle: (title) => set({ sessionTitle: title || 'Python JSON Explorer' }),
  leaveSession: () => {
    localStorage.removeItem('ide_session_id');
    set((state) => ({
      sessionId: null,
    isSharing: false,
    allowEdit: false,
    instructorTabs: [],
    instructorActiveTab: null,
    viewedStudentId: null,
    viewedStudentTabs: [],
    viewedStudentActiveTab: null,
    sessionTitle: 'Python JSON Explorer',
    tabs: defaultTabs,
    activeTab: 'about'
    }));
  },
  resetWorkspace: () => set({
    tabs: defaultTabs,
    activeTab: 'about'
  }),
  setActiveMode: (mode) => set({ activeMode: mode }),
  setIsSharing: (isSharing) => set({ isSharing }),
  setAllowEdit: (allowEdit) => set({ allowEdit }),
  setLockStudentActivity: (lock) => set({ lockStudentActivity: lock }),
  setSessionSyncing: (isSessionSyncing) => set({ isSessionSyncing }),
  setSelectedChatUser: (selectedChatUser) => set({ selectedChatUser }),
  setViewedStudentId: (viewedStudentId) => set({ viewedStudentId }),
  setViewedStudentMode: (viewedStudentMode) => set({ viewedStudentMode }),
  setViewedStudentTabs: (viewedStudentTabs) => set({ viewedStudentTabs }),
  setViewedStudentActiveTab: (viewedStudentActiveTab) => set({ viewedStudentActiveTab }),
  setActivityInstructions: (activityInstructions) => set({ activityInstructions }),
  setInstructorTabs: (instructorTabs) => set({ instructorTabs }),
  setInstructorActiveTab: (instructorActiveTab) => set({ instructorActiveTab }),
  setStudentFeatures: (features) => set({ studentFeatures: features }),
  setLastExecuteSignal: (signal) => set({ lastExecuteSignal: signal }),

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
  setTabs: (tabs) => set({ tabs }),
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
      nextActiveTab = openTabs[Math.max(0, openTabs.length - 1)]?.id || null;
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
      nextActiveTab = openTabs[Math.max(0, openTabs.length - 1)]?.id || null;
    }
    const isInstructor = state.role === 'instructor';
    const activeTabObj = newTabs.find(t => t.id === nextActiveTab);
    return { 
      tabs: newTabs, 
      activeTab: nextActiveTab,
      ...(isInstructor && activeTabObj ? { instructorCode: activeTabObj.code } : {})
    };
  }),
  clearAllCustomTabs: () => set((state) => {
    const newTabs = state.tabs.filter(t => t.id === 'about');
    const isInstructor = state.role === 'instructor';
    return {
      tabs: newTabs,
      activeTab: 'about',
      ...(isInstructor ? { instructorCode: '' } : {})
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
      const currentSessionId = useStore.getState().sessionId;
      if (currentSessionId) {
        await setDoc(doc(db, `sessions/${currentSessionId}`), fields, { merge: true });
      }
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
    }),
    {
      name: 'ide-workspace-storage',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTab: state.activeTab,
        instructorCode: state.instructorCode,
        studentLocalCode: state.studentLocalCode,
        activeMode: state.activeMode,
        isSharing: state.isSharing,
        allowEdit: state.allowEdit,
        activityInstructions: state.activityInstructions,
        instructorTabs: state.instructorTabs,
        instructorActiveTab: state.instructorActiveTab
      }),
    }
  )
);

export default useStore;
