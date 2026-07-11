import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export const useSync = () => {
  const { 
    user, 
    role, 
    instructorCode, 
    activeMode, 
    isSharing,
    allowEdit,
    setInstructorCode, 
    setActiveMode,
    setIsSharing,
    setAllowEdit,
    setStudentLocalCode,
    studentLocalCode,
    setSessionSyncing,
    addTab,
    setActiveTab,
    tabs,
    activeTab,
    activityInstructions,
    setActivityInstructions,
    setInstructorTabs,
    setInstructorActiveTab,
    setStudentFeatures,
    setLastExecuteSignal,
    sessionId
  } = useStore();

  const isInstructor = role === 'instructor';
  const debounceTimerRef = useRef(null);
  const studentDebounceTimerRef = useRef(null);
  const prevModeRef = useRef(activeMode);
  const prevAllowEditRef = useRef(allowEdit);

  const viewedStudentId = useStore(state => state.viewedStudentId);
  const viewedStudentMode = useStore(state => state.viewedStudentMode);
  const viewedStudentTabs = useStore(state => state.viewedStudentTabs);

  // Instructor: Sync Code (Debounced to protect database writes)
  useEffect(() => {
    if (!user || !isInstructor || !sessionId) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const activeTabObj = tabs.find(t => t.id === activeTab);
        await setDoc(doc(db, `sessions/${sessionId}`), {
          instructorTabs: tabs,
          instructorActiveTab: activeTab,
          instructorCode: activeTabObj?.code || ''
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing instructor workspace state:", err);
      }
    }, 500); // 500ms debounce for keystrokes

    return () => clearTimeout(debounceTimerRef.current);
  }, [tabs, activeTab, isInstructor, user, sessionId]);

  // Instructor: Sync activityInstructions to Firestore (Debounced)
  useEffect(() => {
    if (!user || !isInstructor || !sessionId) return;

    const timer = setTimeout(async () => {
      try {
        await setDoc(doc(db, `sessions/${sessionId}`), {
          activityInstructions
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing activity instructions:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activityInstructions, isInstructor, user, sessionId]);


  // Both: Listen to control state changes from Firestore (Single source of truth for controls)
  useEffect(() => {
    if (!user || !sessionId) return;

    const unsubscribe = onSnapshot(doc(db, `sessions/${sessionId}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Sync sharing state
        if (data.isSharing !== undefined) {
          setIsSharing(data.isSharing);
        }
        
        // Sync student features
        if (data.studentFeatures) {
          setStudentFeatures(data.studentFeatures);
        }

        // Sync execute signal
        if (data.lastExecuteSignal && data.lastExecuteSignal !== useStore.getState().lastExecuteSignal) {
          setLastExecuteSignal(data.lastExecuteSignal);
        }

        // Sync allowEdit state
        if (data.allowEdit !== undefined) {
          const newAllowEdit = data.allowEdit;
          const oldAllowEdit = prevAllowEditRef.current;
          prevAllowEditRef.current = newAllowEdit;

          setAllowEdit(newAllowEdit);

          // If allowEdit transitions to true, create persistent editable shared tabs for all instructor tabs
          if (!isInstructor && !oldAllowEdit && newAllowEdit && data.instructorTabs) {
            const currentTabs = useStore.getState().tabs;
            const newTabs = currentTabs.map(t => ({ ...t }));
            let firstNewTabId = null;

            data.instructorTabs.forEach(instTab => {
              if (instTab.id === 'about') return;

              const existingTab = newTabs.find(t => t.originalTabId === instTab.id);
              if (existingTab) {
                existingTab.code = instTab.code;
                return;
              }

              let targetName = instTab.name;
              let suffixCount = 1;
              while (newTabs.some(t => t.name === targetName)) {
                const parts = instTab.name.split('.');
                if (parts.length > 1) {
                  const ext = parts.pop();
                  targetName = `${parts.join('.')}_${suffixCount}.${ext}`;
                } else {
                  targetName = `${instTab.name}_${suffixCount}`;
                }
                suffixCount++;
              }

              const newTabId = 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
              if (!firstNewTabId) firstNewTabId = newTabId;

              newTabs.push({
                id: newTabId,
                name: targetName,
                code: instTab.code,
                isCloseable: true,
                isOpen: true,
                originalTabId: instTab.id
              });
            });

            useStore.setState({ 
              tabs: newTabs, 
              activeTab: firstNewTabId || useStore.getState().activeTab 
            });
          }
        }

        // Sync activeMode
        if (data.activeMode !== undefined) {
          setActiveMode(data.activeMode);
        }

        // Sync activityInstructions
        if (data.activityInstructions !== undefined) {
          setActivityInstructions(data.activityInstructions);
        }

        // Sync instructor's shared workspace tabs
        if (data.instructorTabs !== undefined) {
          setInstructorTabs(data.instructorTabs);
        }
        if (data.instructorActiveTab !== undefined) {
          setInstructorActiveTab(data.instructorActiveTab);
        }
      }
    }, (err) => {
      console.error("Error in classroom control session listener:", err);
    });

    return () => unsubscribe();
  }, [user, setIsSharing, setAllowEdit, setActiveMode, addTab, setActiveTab, isInstructor, setInstructorTabs, setInstructorActiveTab, sessionId]);

  // Student-Only: Focus the shared lecture tab when sharing starts, and fallback when it ends
  const prevSharingRef = useRef(isSharing);
  useEffect(() => {
    if (isInstructor || !user) return;
    if (isSharing && !prevSharingRef.current) {
      const currentInstructorActiveTab = useStore.getState().instructorActiveTab;
      if (currentInstructorActiveTab) {
        setActiveTab(currentInstructorActiveTab);
      }
    } else if (!isSharing && prevSharingRef.current) {
      // Sharing just stopped. Check if activeTab is valid in storeTabs
      const { tabs, activeTab } = useStore.getState();
      if (!tabs.some(t => t.id === activeTab)) {
        setActiveTab('about');
      }
    }
    prevSharingRef.current = isSharing;
  }, [isSharing, isInstructor, user, setActiveTab]);

  // Student-Only: Listen to code updates
  useEffect(() => {
    if (!user || isInstructor || !sessionId) return;

    const unsubscribe = onSnapshot(doc(db, `sessions/${sessionId}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Update local instructor code
        if (data.instructorCode !== undefined) {
          setInstructorCode(data.instructorCode);
        }

        // Handle Mode Changes
        if (data.activeMode !== undefined) {
          prevModeRef.current = data.activeMode;
        }
      }
    }, (err) => {
      console.error("Error in student code sync listener:", err);
    });

    return () => unsubscribe();
  }, [isInstructor, user, setInstructorCode, sessionId]);

  // Student-Only: Sync workspace/tabs to Firestore user doc
  useEffect(() => {
    if (!user || isInstructor) return;

    if (studentDebounceTimerRef.current) {
      clearTimeout(studentDebounceTimerRef.current);
    }

    studentDebounceTimerRef.current = setTimeout(async () => {
      try {
        const currentTabs = useStore.getState().tabs;
        const currentActiveTab = useStore.getState().activeTab;
        await updateDoc(doc(db, 'users', user.uid), {
          sharedTabs: currentTabs,
          sharedActiveTab: currentActiveTab
        });
      } catch (err) {
        console.error("Error syncing student workspace to Firestore:", err);
      }
    }, 500);

    return () => clearTimeout(studentDebounceTimerRef.current);
  }, [tabs, activeTab, isInstructor, user]);

  // Student-Only: Listen to remote updates to own workspace (edits from Instructor)
  useEffect(() => {
    if (!user || isInstructor) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.sharedTabs) {
          const currentTabs = useStore.getState().tabs;
          if (JSON.stringify(currentTabs) !== JSON.stringify(data.sharedTabs)) {
            useStore.setState({ tabs: data.sharedTabs });
          }
        }
        if (data.sharedActiveTab !== undefined) {
          const currentActiveTab = useStore.getState().activeTab;
          if (currentActiveTab !== data.sharedActiveTab) {
            useStore.setState({ activeTab: data.sharedActiveTab });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [isInstructor, user]);

  // Instructor-Only: Listen to remote updates of the viewed student
  useEffect(() => {
    if (!user || !isInstructor || !viewedStudentId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', viewedStudentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.sharedTabs) {
          useStore.setState({ viewedStudentTabs: data.sharedTabs });
        }
        if (data.sharedActiveTab) {
          useStore.setState({ viewedStudentActiveTab: data.sharedActiveTab });
        }
      }
    });

    return () => unsubscribe();
  }, [user, isInstructor, viewedStudentId]);

  // Instructor-Only: Sync instructor's workspace edits back to the viewed student's Firestore user doc
  useEffect(() => {
    if (!user || !isInstructor || !viewedStudentId || viewedStudentMode !== 'edit') return;

    if (studentDebounceTimerRef.current) {
      clearTimeout(studentDebounceTimerRef.current);
    }

    studentDebounceTimerRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, viewedStudentId ? `users/${viewedStudentId}` : 'users/dummy'), {
          sharedTabs: viewedStudentTabs
        });
      } catch (err) {
        console.error("Error syncing instructor edits to student workspace:", err);
      }
    }, 500);

    return () => clearTimeout(studentDebounceTimerRef.current);
  }, [viewedStudentTabs, viewedStudentId, viewedStudentMode, isInstructor, user]);
};
