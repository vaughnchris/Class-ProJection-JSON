import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, deleteDoc, doc, limit, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { ArrowLeft, Send, Trash2, GraduationCap } from 'lucide-react';
import './ChatPanel.css';

// Helper: generate deterministic chat room ID from two UIDs
const getChatId = (uid1, uid2) => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

const ChatPanel = () => {
  const { 
    user, 
    selectedChatUser, 
    setSelectedChatUser,
    viewedStudentId,
    viewedStudentMode,
    setViewedStudentId,
    setViewedStudentMode
  } = useStore();
  const [users, setUsers] = useState([]);
  const selectedUser = selectedChatUser;
  const setSelectedUser = setSelectedChatUser;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendError, setSendError] = useState('');
  // unreadIds: a Set of chat IDs that have unread messages
  const [unreadIds, setUnreadIds] = useState(new Set());
  // lastReadAt: { [chatId]: timestamp(ms) } — when we last opened a chat
  const lastReadAt = useRef({});
  const messagesEndRef = useRef(null);
  
  const [myNeedsHelp, setMyNeedsHelp] = useState(false);
  const [helpRequesting, setHelpRequesting] = useState(false);

  const myUid = user?.uid;
  const isInstructor = user?.role === 'instructor';

  // Listen to own user doc to track needsHelp status in real time
  useEffect(() => {
    if (!myUid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', myUid), (snap) => {
      if (snap.exists()) {
        setMyNeedsHelp(snap.data().needsHelp || false);
      }
    });
    return () => unsubscribe();
  }, [myUid]);

  const handleToggleHelp = async () => {
    if (!myUid || helpRequesting) return;
    setHelpRequesting(true);
    try {
      const next = !myNeedsHelp;
      await updateDoc(doc(db, 'users', myUid), {
        needsHelp: next,
        helpRequestedAt: next ? serverTimestamp() : null
      });
    } catch (err) {
      console.error('Error toggling help request:', err);
    } finally {
      setHelpRequesting(false);
    }
  };

  const handleResolveHelp = async () => {
    if (!selectedUser || helpRequesting) return;
    setHelpRequesting(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        needsHelp: false,
        helpRequestedAt: null
      });
      setViewedStudentId(null);
      setViewedStudentMode(null);
    } catch (err) {
      console.error('Error resolving help request:', err);
    } finally {
      setHelpRequesting(false);
    }
  };

  // Fetch users for list view
  useEffect(() => {
    if (!myUid) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== myUid && data.email) {
          usersData.push({ id: docSnap.id, ...data });
        }
      });
      usersData.sort((a, b) => {
        if (a.isOnline === b.isOnline) return 0;
        return a.isOnline ? -1 : 1;
      });
      setUsers(usersData);
    }, (err) => console.error("Error loading users:", err));
    return () => unsubscribe();
  }, [myUid]);



  // Subscribe to unread indicators for ALL chats (global + each DM)
  useEffect(() => {
    if (!myUid || !users.length) return;

    const chatIds = [
      'global',
      ...users.map(u => getChatId(myUid, u.id))
    ];

    const unsubs = chatIds.map(chatId => {
      // Only set the baseline timestamp on FIRST subscription for this chatId.
      // Do NOT reset on re-subscription (e.g., caused by isOnline changes),
      // otherwise messages received while subscriptions are active get missed.
      if (!(chatId in lastReadAt.current)) {
        lastReadAt.current[chatId] = Date.now();
      }

      const q = query(
        collection(db, `chats/${chatId}/messages`),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) return;
        const latest = snapshot.docs[0].data();
        // Skip pending writes — serverTimestamp() is null until server-confirmed
        if (!latest.timestamp || snapshot.docs[0].metadata.hasPendingWrites) return;
        const latestMs = latest.timestamp.toMillis?.() ?? 0;
        const lastSeen = lastReadAt.current[chatId] ?? 0;
        if (latestMs > lastSeen && latest.senderId !== myUid) {
          setUnreadIds(prev => new Set([...prev, chatId]));
        }
      });
    });

    return () => unsubs.forEach(u => u());
  }, [myUid, users]);

  // Subscribe to messages for the active conversation
  useEffect(() => {
    if (!selectedUser || !myUid) return;

    const chatId = selectedUser.id === 'global'
      ? 'global'
      : getChatId(myUid, selectedUser.id);

    // Mark as read the moment we open the chat
    lastReadAt.current[chatId] = Date.now();
    setUnreadIds(prev => {
      const next = new Set(prev);
      next.delete(chatId);
      return next;
    });

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMessages(msgs);
      // Keep read timestamp current while chat is open
      lastReadAt.current[chatId] = Date.now();
      // Clear unread as new messages come in while this chat is open
      setUnreadIds(prev => {
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => console.error("Error loading messages:", err));

    return () => unsubscribe();
  }, [selectedUser, myUid]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !myUid) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSendError('');

    const chatId = selectedUser.id === 'global'
      ? 'global'
      : getChatId(myUid, selectedUser.id);

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text,
        senderId: myUid,
        senderName: user.firstName || '',
        senderAvatar: user.avatarUrl || '',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setSendError(`Send failed: ${err.message}`);
    }
  };

  const handleClearChat = async () => {
    if (!selectedUser || !myUid) return;
    // Only instructors can clear the global classroom chat
    if (selectedUser.id === 'global' && !isInstructor) return;

    if (!window.confirm('Clear all messages in this conversation?')) return;

    const chatId = selectedUser.id === 'global'
      ? 'global'
      : getChatId(myUid, selectedUser.id);

    try {
      const snapshot = await getDocs(collection(db, `chats/${chatId}/messages`));
      const deletes = snapshot.docs.map(d => deleteDoc(doc(db, `chats/${chatId}/messages`, d.id)));
      await Promise.all(deletes);
      setMessages([]);
    } catch (err) {
      console.error("Error clearing chat:", err);
      setSendError(`Clear failed: ${err.message}`);
    }
  };

  // Returns chatId for a given chat list entry
  const getChatIdForEntry = (entry) =>
    entry.id === 'global' ? 'global' : getChatId(myUid, entry.id);

  const openChat = (entry) => {
    setSelectedUser(entry);
    setMessages([]);
    setSendError('');
  };

  if (!user) {
    return <div className="chat-empty">Please sign in to chat.</div>;
  }

  if (selectedUser) {
    const canClear = selectedUser.id !== 'global' || isInstructor;
    const activeStudent = users.find(u => u.id === selectedUser.id) || selectedUser;
    return (
      <div className="chat-container">
        <div className="chat-header">
          <button className="icon-btn-small" onClick={() => { 
            setSelectedUser(null); 
            setMessages([]); 
            setSendError(''); 
            if (isInstructor) {
              setViewedStudentId(null);
              setViewedStudentMode(null);
            }
          }}>
            <ArrowLeft size={16} />
          </button>
          <div className="chat-header-user">
            {selectedUser.isGlobal
              ? <div className="global-chat-avatar" style={{ fontSize: '1rem', width: 24, height: 24 }}>🌐</div>
              : <img src={selectedUser.avatarUrl} alt="" className="chat-avatar-small" />
            }
            <span>{selectedUser.firstName} {selectedUser.lastName}</span>
          </div>
          
          {/* Help Request Button for Students chatting with an Instructor */}
          {!isInstructor && selectedUser.role === 'instructor' && (
            <button
              className={`icon-btn-small help-header-btn ${myNeedsHelp ? 'help-active' : ''}`}
              onClick={handleToggleHelp}
              disabled={helpRequesting}
              title={myNeedsHelp ? 'Cancel Help Request' : 'Request Instructor Assistance'}
              style={{ 
                marginLeft: 'auto', 
                marginRight: '8px', 
                color: myNeedsHelp ? 'var(--accent-red)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '50%'
              }}
            >
              <GraduationCap size={16} />
            </button>
          )}

          {/* View, Edit, and Resolve Buttons for Instructors chatting with a student */}
          {isInstructor && selectedUser.id !== 'global' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto', marginRight: '8px' }}>
              {activeStudent?.needsHelp && (
                <button
                  onClick={handleResolveHelp}
                  disabled={helpRequesting}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1.5px solid var(--accent-green)',
                    backgroundColor: 'transparent',
                    color: 'var(--accent-green)',
                    transition: 'all 0.15s ease',
                    marginRight: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Resolve help request, clear student flag, and exit workspace sharing"
                >
                  ✓ Resolve
                </button>
              )}
              <button
                onClick={() => {
                  const isCurrent = viewedStudentId === selectedUser.id && viewedStudentMode === 'view';
                  setViewedStudentId(isCurrent ? null : selectedUser.id);
                  setViewedStudentMode(isCurrent ? null : 'view');
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid var(--accent-blue)',
                  backgroundColor: (viewedStudentId === selectedUser.id && viewedStudentMode === 'view') ? 'var(--accent-blue)' : 'transparent',
                  color: (viewedStudentId === selectedUser.id && viewedStudentMode === 'view') ? '#fff' : 'var(--accent-blue)',
                  transition: 'all 0.15s ease'
                }}
                title={viewedStudentId === selectedUser.id && viewedStudentMode === 'view' ? "Stop Viewing" : "View student's live workspace"}
              >
                View
              </button>
              <button
                onClick={() => {
                  const isCurrent = viewedStudentId === selectedUser.id && viewedStudentMode === 'edit';
                  setViewedStudentId(isCurrent ? null : selectedUser.id);
                  setViewedStudentMode(isCurrent ? null : 'edit');
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid var(--accent-purple)',
                  backgroundColor: (viewedStudentId === selectedUser.id && viewedStudentMode === 'edit') ? 'var(--accent-purple)' : 'transparent',
                  color: (viewedStudentId === selectedUser.id && viewedStudentMode === 'edit') ? '#fff' : 'var(--accent-purple)',
                  transition: 'all 0.15s ease'
                }}
                title={viewedStudentId === selectedUser.id && viewedStudentMode === 'edit' ? "Stop Editing" : "Edit student's live workspace"}
              >
                Edit
              </button>
            </div>
          )}

          {canClear && (
            <button
              className="icon-btn-small"
              onClick={handleClearChat}
              title="Clear chat"
              style={{ 
                marginLeft: (isInstructor && selectedUser.id !== 'global') || (!isInstructor && selectedUser.role === 'instructor') ? '0' : 'auto', 
                color: 'var(--text-muted)' 
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">No messages yet.</div>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === myUid;
            const isGlobal = selectedUser.id === 'global';
            return (
              <div key={msg.id} className={`chat-bubble-wrapper ${isMe ? 'me' : 'them'}`}>
                {!isMe && msg.senderAvatar && (
                  <img src={msg.senderAvatar} alt="" className="chat-bubble-avatar" />
                )}
                <div className="chat-bubble-content">
                  {!isMe && isGlobal && msg.senderName && (
                    <div className="chat-bubble-name">{msg.senderName}</div>
                  )}
                  <div className={`chat-bubble ${isMe ? 'me' : 'them'}`}>
                    {msg.text}
                  </div>
                </div>
                {isMe && user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="chat-bubble-avatar chat-bubble-avatar-right" />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {sendError && <div style={{ color: 'red', fontSize: '0.75rem', padding: '4px 12px' }}>{sendError}</div>}

        <form className="chat-input-row" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          />
          <button type="submit" className="icon-btn-small" disabled={!newMessage.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    );
  }

  // User List View
  const globalEntry = { id: 'global', firstName: 'Classroom', lastName: 'Chat', isGlobal: true };
  const globalUnread = unreadIds.has('global');

  return (
    <div className="chat-container">
      <div className="chat-user-list">

        {/* Global Chat Row */}
        <div
          className={`chat-user-row global-chat-row ${globalUnread ? 'unread' : ''}`}
          onClick={() => openChat(globalEntry)}
        >
          <div className="chat-avatar-wrapper">
            <div className="global-chat-avatar">🌐</div>
          </div>
          <div className="chat-user-info">
            <span className="chat-user-name">Classroom Chat</span>
            <span className="chat-user-role">Public Group</span>
          </div>
          {globalUnread && <span className="unread-badge" />}
        </div>

        {users.length === 0 && (
          <div className="chat-empty">No other users found.</div>
        )}
        {users.map(u => {
          const dmId = getChatId(myUid, u.id);
          const hasUnread = unreadIds.has(dmId);
          const needsHelp = (isInstructor && u.needsHelp) || (!isInstructor && myNeedsHelp && u.role === 'instructor');
          return (
            <div
              key={u.id}
              className={`chat-user-row ${needsHelp ? 'needs-help' : hasUnread ? 'unread' : ''}`}
              onClick={() => openChat(u)}
            >
              <div className="chat-avatar-wrapper">
                <img src={u.avatarUrl} alt="" className="chat-avatar" />
                <div className={`online-indicator ${u.isOnline ? 'online' : 'offline'}`} />
              </div>
              <div className="chat-user-info">
                <span className="chat-user-name">{u.firstName} {u.lastName}</span>
                <span className="chat-user-role">
                  {needsHelp ? (isInstructor ? '🙋 Needs Help' : '🙋 Help Requested') : u.role}
                </span>
              </div>
              {needsHelp && <span className="help-badge" title={isInstructor ? "Student needs help" : "Help requested"} />}
              {!needsHelp && hasUnread && <span className="unread-badge" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatPanel;
