import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

const SESSION_DOC = 'sessions/main_classroom';

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
    setStudentSharedLocalCode,
    setSessionSyncing,
    addTab,
    setActiveTab
  } = useStore();

  const isInstructor = role === 'instructor';
  const debounceTimerRef = useRef(null);
  const prevModeRef = useRef(activeMode);
  const prevAllowEditRef = useRef(allowEdit);

  // Instructor: Sync Code (Debounced to protect database writes)
  useEffect(() => {
    if (!user || !isInstructor) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, SESSION_DOC), {
          instructorCode
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing code state:", err);
      }
    }, 500); // 500ms debounce for keystrokes

    return () => clearTimeout(debounceTimerRef.current);
  }, [instructorCode, isInstructor, user]);


  // Both: Listen to control state changes from Firestore (Single source of truth for controls)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, SESSION_DOC), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Sync sharing state
        if (data.isSharing !== undefined) {
          setIsSharing(data.isSharing);
        }

        // Sync allowEdit state
        if (data.allowEdit !== undefined) {
          const newAllowEdit = data.allowEdit;
          const oldAllowEdit = prevAllowEditRef.current;
          prevAllowEditRef.current = newAllowEdit;

          setAllowEdit(newAllowEdit);

          // If allowEdit transitions to true, create a new persistent editable shared tab for the student
          if (!isInstructor && !oldAllowEdit && newAllowEdit) {
            const newTabId = 'shared_' + Date.now();
            const currentTabs = useStore.getState().tabs;
            // Subtract welcome.py (1) to name it Shared Code 1, 2, etc.
            const sharedCount = currentTabs.filter(t => t.id !== 'welcome.py').length + 1;
            
            addTab({
              id: newTabId,
              name: `Shared Code ${sharedCount}`,
              code: data.instructorCode || '',
              isCloseable: true
            });
            setActiveTab(newTabId);
          }
        }

        // Sync activeMode
        if (data.activeMode !== undefined) {
          setActiveMode(data.activeMode);
        }
      }
    }, (err) => {
      console.error("Error in classroom control session listener:", err);
    });

    return () => unsubscribe();
  }, [user, setIsSharing, setAllowEdit, setActiveMode, addTab, setActiveTab, isInstructor]);

  // Student-Only: Listen to code updates
  useEffect(() => {
    if (!user || isInstructor) return;

    const unsubscribe = onSnapshot(doc(db, SESSION_DOC), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Update local instructor code
        if (data.instructorCode !== undefined) {
          setInstructorCode(data.instructorCode);
        }

        // Handle Mode Changes
        if (data.activeMode !== undefined) {
          const newMode = data.activeMode;
          const oldMode = prevModeRef.current;
          prevModeRef.current = newMode;

          // If transitioning from Broadcast to Execute, snapshot the instructor code to student local code
          if (oldMode === 'broadcast' && newMode === 'execute') {
            setStudentLocalCode(data.instructorCode || '');
          }
        }
      }
    }, (err) => {
      console.error("Error in student code sync listener:", err);
    });

    return () => unsubscribe();
  }, [isInstructor, user, setInstructorCode, setStudentLocalCode]);

};
