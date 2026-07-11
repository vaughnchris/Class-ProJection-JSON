import React, { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { db } from '../../firebase';
import { doc, updateDoc, collection, setDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { CheckSquare, Upload, Play, CheckCircle2, XCircle } from 'lucide-react';
import { parseQtiZip } from '../../utils/qtiParser';
import './TestingPanel.css';

const TestingPanel = () => {
  const { user, role, sessionId } = useStore();
  const isInstructor = role === 'instructor' || role === 'administrator';

  const [questions, setQuestions] = useState([]); // Instructor's parsed questions
  const [activeQuestion, setActiveQuestion] = useState(null); // The currently broadcasted question
  const [responses, setResponses] = useState({}); // Student responses map
  const [myResponse, setMyResponse] = useState(null); // The current student's response

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // 1. Listen for active question & responses
  useEffect(() => {
    if (!sessionId) return;

    // Listen to session document for activeTestQuestion
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activeTestQuestion) {
          setActiveQuestion(data.activeTestQuestion);
        } else {
          setActiveQuestion(null);
        }
      }
    });

    // Listen to testResponses subcollection
    const responsesRef = collection(db, 'sessions', sessionId, 'testResponses');
    const unsubResponses = onSnapshot(responsesRef, (snapshot) => {
      const currentResponses = {};
      snapshot.forEach(docSnap => {
        currentResponses[docSnap.id] = docSnap.data();
      });
      setResponses(currentResponses);

      if (!isInstructor && user && currentResponses[user.uid]) {
        setMyResponse(currentResponses[user.uid]);
      } else {
        setMyResponse(null);
      }
    });

    return () => {
      unsubSession();
      unsubResponses();
    };
  }, [sessionId, isInstructor, user]);


  // 2. Instructor: Handle File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    
    try {
      const parsedQuestions = await parseQtiZip(file);
      if (parsedQuestions.length === 0) {
        setError('No supported multiple-choice questions found in this QTI file.');
      } else {
        setQuestions(parsedQuestions);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to parse Canvas QTI file. Make sure it is a valid .zip export.');
    }
    setIsUploading(false);
  };

  // 3. Instructor: Broadcast Question
  const handleBroadcast = async (question) => {
    if (!sessionId) return;
    
    // Clear old responses first
    try {
      const responsesRef = collection(db, 'sessions', sessionId, 'testResponses');
      const snap = await getDocs(responsesRef);
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // Broadcast new question
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        activeTestQuestion: question
      });
    } catch (err) {
      console.error("Failed to broadcast question", err);
    }
  };

  // 4. Instructor: Stop Broadcast
  const handleStopBroadcast = async () => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        activeTestQuestion: null
      });
    } catch (err) {
      console.error("Failed to stop broadcast", err);
    }
  };

  // 5. Student: Submit Answer
  const handleSubmitAnswer = async (choiceId) => {
    if (isInstructor || !sessionId || !user || myResponse || !activeQuestion) return;

    const isCorrect = choiceId === activeQuestion.correctId;
    try {
      const responseRef = doc(db, 'sessions', sessionId, 'testResponses', user.uid);
      await setDoc(responseRef, {
        choiceId,
        isCorrect,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to submit answer", err);
    }
  };

  // --- Render Helpers ---

  const renderStatistics = (question) => {
    const totalResponses = Object.keys(responses).length;
    if (totalResponses === 0) return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No responses yet.</div>;

    return (
      <div className="testing-stats">
        <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Class Results ({totalResponses} total)</h4>
        {question.choices.map(choice => {
          const count = Object.values(responses).filter(r => r.choiceId === choice.id).length;
          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          const isCorrectChoice = choice.id === question.correctId;
          
          return (
            <div key={choice.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {isCorrectChoice && <CheckCircle2 size={12} color="#22c55e" />}
                  <span dangerouslySetInnerHTML={{ __html: choice.textHtml }} />
                </span>
                <span>{count} ({Math.round(percentage)}%)</span>
              </div>
              <div className="stat-bar-container">
                <div 
                  className={`stat-bar ${isCorrectChoice ? 'correct' : ''}`} 
                  style={{ width: \`\${percentage}%\` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderActiveQuestion = () => {
    if (!activeQuestion) return null;

    return (
      <div className="testing-active-question">
        <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Live Question
          {isInstructor && (
            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={handleStopBroadcast}>
              End Quiz
            </button>
          )}
        </h3>
        
        <div style={{ marginTop: '12px', marginBottom: '16px' }} dangerouslySetInnerHTML={{ __html: activeQuestion.promptHtml }} />
        
        <div className="testing-choices">
          {activeQuestion.choices.map(choice => {
            let choiceClass = "testing-choice";
            
            // Logic for styling chosen/correct/incorrect states
            if (isInstructor) {
               // Instructor sees the correct answer highlighted always
               if (choice.id === activeQuestion.correctId) choiceClass += " correct disabled";
               else choiceClass += " disabled";
            } else {
               // Student view
               if (myResponse) {
                 choiceClass += " disabled";
                 if (choice.id === activeQuestion.correctId) choiceClass += " correct";
                 else if (myResponse.choiceId === choice.id) choiceClass += " incorrect";
               }
            }

            return (
              <div 
                key={choice.id} 
                className={choiceClass}
                onClick={() => handleSubmitAnswer(choice.id)}
              >
                {!isInstructor && myResponse && choice.id === activeQuestion.correctId && <CheckCircle2 size={16} color="#22c55e" />}
                {!isInstructor && myResponse && myResponse.choiceId === choice.id && myResponse.choiceId !== activeQuestion.correctId && <XCircle size={16} color="#ef4444" />}
                
                <span dangerouslySetInnerHTML={{ __html: choice.textHtml }} />
              </div>
            );
          })}
        </div>

        {(isInstructor || myResponse) && renderStatistics(activeQuestion)}
      </div>
    );
  };


  // --- Main Render ---
  return (
    <div className="testing-panel">
      <div className="testing-header">
        <h2><CheckSquare size={18} color="var(--accent-primary)" /> Testing & Quizzes</h2>
      </div>

      <div className="testing-content">
        {/* Student View (No active question) */}
        {!isInstructor && !activeQuestion && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
            Waiting for your instructor to start a quiz...
          </div>
        )}

        {/* Live Question (For both Instructor and Student) */}
        {activeQuestion && renderActiveQuestion()}

        {/* Instructor Tools */}
        {isInstructor && !activeQuestion && (
          <>
            {questions.length === 0 ? (
              <div className="testing-upload-area">
                <label>
                  <Upload size={24} />
                  <span>{isUploading ? 'Parsing QTI...' : 'Upload Canvas QTI Export (.zip)'}</span>
                  <input type="file" accept=".zip" onChange={handleFileUpload} disabled={isUploading} />
                </label>
                {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '12px' }}>{error}</div>}
              </div>
            ) : (
              <div className="testing-question-list">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Extracted Questions</h3>
                  <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setQuestions([])}>Clear</button>
                </div>
                
                {questions.map((q, i) => (
                  <div key={q.id} className="testing-question-item">
                    <div className="testing-question-title">{q.title}</div>
                    <div className="testing-question-prompt" dangerouslySetInnerHTML={{ __html: q.promptHtml }} />
                    <button 
                      className="btn btn-primary" 
                      style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                      onClick={() => handleBroadcast(q)}
                    >
                      <Play size={14} /> Broadcast Question
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TestingPanel;
