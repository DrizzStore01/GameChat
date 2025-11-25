import React, { useState, useEffect, useRef } from 'react';
import { Send, MoreVertical, Phone, Video, Search, Smile, Paperclip, Check, CheckCheck, User } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function WhatsappGlobal() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // 1. Authentication Setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Cek apakah user sudah punya nama di local storage sesi ini
        const storedName = localStorage.getItem(`wa_global_name_${currentUser.uid}`);
        if (storedName) {
          setUsername(storedName);
          setHasJoined(true);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch Messages (Real-time)
  useEffect(() => {
    if (!user) return;

    // RULE 1: Strict Path /artifacts/{appId}/public/data/{collectionName}
    const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'wa_global_messages');
    
    // RULE 2: No complex queries. Fetch simple collection.
    const q = query(messagesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory (Rule 2 compliancy)
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(msgs);
      scrollToBottom();
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 3. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const textToSend = newMessage;
    setNewMessage(''); // Clear input immediately for UX

    try {
      const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'wa_global_messages');
      await addDoc(messagesRef, {
        text: textToSend,
        sender: username || 'Anonim',
        uid: user.uid,
        timestamp: Date.now(),
        type: 'text'
      });
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // 4. Handle Join (Set Name)
  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    if (user) {
      localStorage.setItem(`wa_global_name_${user.uid}`, username);
      setHasJoined(true);
    }
  };

  // --- Format Time ---
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // --- Colors ---
  // WhatsApp Colors
  const colors = {
    teal: '#008069',
    lightGreen: '#dcf8c6',
    bgBeige: '#e5ddd5',
    outgoing: '#e7ffdb',
    incoming: '#ffffff',
    headerText: '#ffffff'
  };

  // --- Render: Login Screen ---
  if (!hasJoined || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#25D366] rounded-full flex items-center justify-center text-white">
              <Phone size={40} fill="white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Selamat Datang di WA Global</h2>
          <p className="text-gray-500 mb-6">Masukkan nama kamu untuk mulai mengobrol dengan semua orang di seluruh dunia.</p>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              placeholder="Nama Panggilan Kamu"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={20}
            />
            <button 
              type="submit" 
              className="w-full bg-[#008069] hover:bg-[#006d59] text-white font-bold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? 'Memuat...' : 'Mulai Chatting'}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-4">Koneksi aman & anonim</p>
        </div>
      </div>
    );
  }

  // --- Render: Main Chat App ---
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#e5ddd5] relative">
      {/* Background Pattern Mock */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0" 
           style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
      </div>

      {/* Header */}
      <div className="bg-[#008069] text-white px-4 py-3 flex items-center justify-between shadow-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border border-white/30 flex items-center justify-center">
            <User className="text-gray-500" size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-semibold text-lg leading-tight">Wassap Global</h1>
            <p className="text-xs text-white/80 overflow-hidden whitespace-nowrap text-ellipsis max-w-[150px] sm:max-w-xs">
              {messages.length} pesan • Publik
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <Video className="cursor-pointer hover:opacity-80 hidden sm:block" size={22} />
          <Phone className="cursor-pointer hover:opacity-80 hidden sm:block" size={20} />
          <Search className="cursor-pointer hover:opacity-80" size={20} />
          <MoreVertical className="cursor-pointer hover:opacity-80" size={20} />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 z-10 flex flex-col gap-2 custom-scrollbar">
        {/* Encryption Notice */}
        <div className="flex justify-center my-4">
          <div className="bg-[#fff5c4] text-gray-800 text-xs px-3 py-1.5 rounded-lg shadow-sm text-center max-w-xs border border-[#ffeeb0]">
            🔒 Pesan di grup global ini bersifat publik. Harap sopan.
          </div>
        </div>

        {messages.map((msg, index) => {
          const isMe = msg.uid === user?.uid;
          const showSender = !isMe && (index === 0 || messages[index - 1].uid !== msg.uid);

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div 
                className={`relative px-3 py-1.5 rounded-lg shadow-sm text-sm sm:text-base break-words
                  ${isMe 
                    ? 'bg-[#e7ffdb] rounded-tr-none' 
                    : 'bg-white rounded-tl-none'
                  }
                `}
              >
                {/* Sender Name (only for others) */}
                {!isMe && showSender && (
                  <p className="text-xs font-bold text-[#e11d48] mb-1">{msg.sender}</p>
                )}

                {/* Message Text */}
                <div className="pr-16 pb-1 text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </div>

                {/* Metadata (Time & Check) */}
                <div className="absolute right-2 bottom-1 flex items-center gap-1">
                  <span className="text-[10px] text-gray-500 min-w-[30px] text-right">
                    {formatTime(msg.timestamp)}
                  </span>
                  {isMe && (
                    <span className="text-[#53bdeb]">
                      <CheckCheck size={14} />
                    </span>
                  )}
                </div>

                {/* Triangle Decor for bubbles */}
                <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent 
                  ${isMe 
                    ? 'right-[-6px] border-t-[#e7ffdb] border-r-0' 
                    : 'left-[-6px] border-t-white border-l-0'
                  }
                `}></div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] px-2 py-2 sm:px-4 sm:py-3 flex items-end gap-2 z-20 sticky bottom-0 w-full">
        <div className="bg-white rounded-3xl flex items-center flex-1 px-3 py-2 shadow-sm border border-gray-100">
          <button className="text-gray-500 hover:text-gray-700 p-1 hidden sm:block">
            <Smile size={24} />
          </button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Ketik pesan"
            className="flex-1 mx-2 bg-transparent outline-none text-gray-800 text-sm sm:text-base resize-none max-h-24 py-1"
            rows={1}
            style={{ minHeight: '24px' }}
          />
          <button className="text-gray-500 hover:text-gray-700 p-1 rotate-45 hidden sm:block">
            <Paperclip size={22} />
          </button>
        </div>
        <button 
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          className={`p-3 rounded-full shadow-md transition-all duration-200 flex items-center justify-center
            ${newMessage.trim() 
              ? 'bg-[#008069] text-white hover:bg-[#006d59] cursor-pointer transform hover:scale-105' 
              : 'bg-[#f0f2f5] text-gray-400 cursor-default'
            }
          `}
        >
          {newMessage.trim() ? <Send size={20} className="ml-0.5" /> : <Phone size={20} />} 
          {/* Note: WhatsApp shows Mic usually, using Phone as placeholder for disabled state logic if needed, but logic above swaps color */}
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

