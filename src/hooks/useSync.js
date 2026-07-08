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
    setInstructorCode, 
    setActiveMode,
    setStudentLocalCode,
    studentLocalCode
  } = useStore();

  const isInstructor = role === 'instructor';
  const debounceTimerRef = useRef(null);
  const prevModeRef = useRef(activeMode);

  // Instructor: Write to Firestore (Debounced)
  useEffect(() => {
    if (!user || !isInstructor) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the write to prevent hitting Firestore limits on every keystroke
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, SESSION_DOC), {
          instructorCode,
          activeMode
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing session state:", err);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimerRef.current);
  }, [instructorCode, activeMode, isInstructor, user]);


  // Student: Listen from Firestore
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
          
          setActiveMode(newMode);
          prevModeRef.current = newMode;

          // If transitioning from Broadcast to Execute, snapshot the instructor code to student local code
          if (oldMode === 'broadcast' && newMode === 'execute') {
            setStudentLocalCode(data.instructorCode || '');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [isInstructor, user, setInstructorCode, setActiveMode, setStudentLocalCode]);

};
