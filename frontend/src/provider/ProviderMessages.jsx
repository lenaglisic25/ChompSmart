import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../components/api";
import "./ProviderMessages.css";

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function MessageBubble({ sender, text, time }) {
  const isProvider = sender === "provider";

  return (
    <div className={`providerMsgBubbleRow ${isProvider ? "provider" : "patient"}`}>
      <div className={`providerMsgBubble ${isProvider ? "provider" : "patient"}`}>
        <div className="providerMsgBubbleText">{text}</div>
        <div className="providerMsgBubbleTime">{time}</div>
      </div>
    </div>
  );
}

export default function ProviderMessages() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [noteText, setNoteText] = useState("");
  
  const [clearedChats, setClearedChats] = useState(() => {
    return JSON.parse(localStorage.getItem("provider_cleared_chats") || "{}");
  });

  const [patientStatuses, setPatientStatuses] = useState(() => {
    return JSON.parse(localStorage.getItem("provider_patient_statuses") || "{}");
  });

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await apiFetch("/providers/patients");
        if (!res.ok) throw new Error("Failed to fetch patients");

        const dbPatients = await res.json();

        const convosWithMessages = await Promise.all(
          dbPatients.map(async (user) => {
            let formatted = [];
            try {
              const msgRes = await apiFetch(`/messages/?patient_email=${encodeURIComponent(user.email)}`);
              if (msgRes.ok) {
                const data = await msgRes.json();
                if (Array.isArray(data)) {
                  formatted = data.map((m) => ({
                    id: String(m.id),
                    sender: m.sender,
                    text: m.text,
                    time: m.time,
                  }));
                }
              }
            } catch (err) {
              console.error(err);
            }

            const clearedUntilId = clearedChats[user.email];
            if (clearedUntilId) {
              const idx = formatted.findIndex((m) => m.id === clearedUntilId);
              if (idx !== -1) {
                formatted = formatted.slice(idx + 1);
              }
            }

            const hasMessages = formatted.length > 0;
            const lastMsg = hasMessages ? formatted[formatted.length - 1] : null;

            let status = patientStatuses[user.email] || "New Patient";
            let unread = 0;

            if (lastMsg && lastMsg.sender === "patient") {
              status = "New Message";
              for (let i = formatted.length - 1; i >= 0; i--) {
                if (formatted[i].sender === "patient") unread++;
                else break;
              }
            }

            return {
              id: user.email,
              patientEmail: user.email,
              patientName: user.name || user.email,
              preview: hasMessages ? lastMsg.text : "No messages yet.",
              lastTime: hasMessages ? lastMsg.time : "--",
              unread: unread,
              status: status,
              messages: formatted,
            };
          })
        );

        setConversations(convosWithMessages);
        
        if (convosWithMessages.length > 0) {
          setSelectedId(convosWithMessages[0].id);
          setConversations((prev) =>
            prev.map((item, idx) => (idx === 0 ? { ...item, unread: 0 } : item))
          );
        }
      } catch (error) {
        console.error("Error fetching database patients:", error);
      }
    };

    fetchPatients();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter(
      (item) =>
        item.patientName.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
    );
  }, [search, conversations]);

  const selectedConversation =
    conversations.find((item) => item.id === selectedId) ||
    filtered[0] ||
    null;

  async function handleSelectConversation(id) {
    setSelectedId(id);
    
    setConversations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unread: 0 } : item
      )
    );
    
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    
    try {
      const res = await apiFetch(`/messages/?patient_email=${encodeURIComponent(conv.patientEmail)}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        let formatted = data.map(m => ({
          id: String(m.id),
          sender: m.sender,
          text: m.text,
          time: m.time
        }));
        
        const clearedUntilId = clearedChats[id];
        if (clearedUntilId) {
           const idx = formatted.findIndex(m => m.id === clearedUntilId);
           if (idx !== -1) {
              formatted = formatted.slice(idx + 1);
           }
        }
        
        const hasMessages = formatted.length > 0;
        const lastMsg = hasMessages ? formatted[formatted.length - 1] : null;
        let status = patientStatuses[id] || "New Patient";

        if (lastMsg && lastMsg.sender === "patient") {
          status = "New Message";
        }

        setConversations((prev) =>
          prev.map((item) =>
            item.id === id ? { 
              ...item, 
              messages: formatted,
              preview: hasMessages ? lastMsg.text : "No messages yet.",
              lastTime: hasMessages ? lastMsg.time : "--",
              status: status,
              unread: 0 
            } : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSend() {
    const clean = draft.trim();
    if (!clean || !selectedConversation) return;

    const now = getCurrentTimeLabel();

    try {
      await apiFetch("/messages/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_email: selectedConversation.patientEmail,
          text: clean,
          time: now
        })
      });
    } catch (err) {
      console.error(err);
    }

    const newStatuses = { ...patientStatuses, [selectedConversation.id]: "Replied" };
    setPatientStatuses(newStatuses);
    localStorage.setItem("provider_patient_statuses", JSON.stringify(newStatuses));

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              preview: clean,
              lastTime: now,
              status: "Replied",
              messages: [
                ...conv.messages,
                {
                  id: `m${Date.now()}`,
                  sender: "provider",
                  text: clean,
                  time: now,
                },
              ],
            }
          : conv
      )
    );
    
    setDraft("");
  }

  function handleClearDraft() {
    setDraft("");
  }

  function handleClearConversation() {
    if (!selectedConversation) return;

    const lastMsg = selectedConversation.messages[selectedConversation.messages.length - 1];
    if (lastMsg) {
       const newCleared = { ...clearedChats, [selectedConversation.id]: lastMsg.id };
       setClearedChats(newCleared);
       localStorage.setItem("provider_cleared_chats", JSON.stringify(newCleared));
    }

    const newStatuses = { ...patientStatuses, [selectedConversation.id]: "Cleared" };
    setPatientStatuses(newStatuses);
    localStorage.setItem("provider_patient_statuses", JSON.stringify(newStatuses));

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              preview: "No messages yet.",
              lastTime: "--",
              unread: 0,
              status: "Cleared",
              messages: [],
            }
          : conv
      )
    );
    
    setDraft("");
  }

  function handleViewProfile() {
    if (!selectedConversation) return;
    navigate(`/provider/users?email=${encodeURIComponent(selectedConversation.patientEmail)}`);
  }

  async function handleAddNote() {
    if (!selectedConversation || !noteText.trim()) return;
    
    try {
      await apiFetch("/profile/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: selectedConversation.patientEmail,
          provider_notes: noteText
        })
      });
      setNoteText("");
      setShowNotePopup(false);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="providerMessagesPage">
      <aside className="providerMessagesSidebar">
        <div className="providerMessagesSidebarTop">
          <h2 className="providerMessagesTitle">Messages</h2>
          <div className="providerMessagesCount">
            {conversations.reduce((sum, item) => sum + item.unread, 0)} unread
          </div>
        </div>

        <input
          type="text"
          className="providerMessagesSearch"
          placeholder="Search patients or messages"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="providerMessagesList" style={{ marginTop: "15px" }}>
          {filtered.length === 0 ? (
            <div className="providerMessagesEmpty">No conversations found.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`providerConversationItem ${
                  selectedConversation?.id === item.id ? "active" : ""
                }`}
                onClick={() => handleSelectConversation(item.id)}
              >
                <div className="providerConversationTop">
                  <div className="providerConversationName">{item.patientName}</div>
                  <div className="providerConversationTime">{item.lastTime}</div>
                </div>

                <div className="providerConversationPreview">{item.preview}</div>

                <div className="providerConversationMeta">
                  <span className="providerConversationStatus">{item.status}</span>
                  {item.unread > 0 ? (
                    <span className="providerConversationUnread">{item.unread}</span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="providerChatPanel">
        {selectedConversation ? (
          <>
            <div className="providerChatHeader">
              <div>
                <div className="providerChatPatientName">
                  {selectedConversation.patientName}
                </div>
                <div className="providerChatSub">Provider conversation view</div>
              </div>

              <div className="providerChatHeaderActions">
                <button type="button" onClick={handleViewProfile}>View Profile</button>
                <button type="button" onClick={() => setShowNotePopup(true)}>Add Note</button>
                <button
                  type="button"
                  className="providerChatClearConversation"
                  onClick={handleClearConversation}
                >
                  Clear Chat
                </button>
              </div>
            </div>

            <div className="providerChatMessages">
              {selectedConversation.messages.length === 0 ? (
                <div className="providerMessagesEmptyPanel">
                  No messages in this conversation.
                </div>
              ) : (
                selectedConversation.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    sender={message.sender}
                    text={message.text}
                    time={message.time}
                  />
                ))
              )}
            </div>

            <div className="providerChatComposer">
              <textarea
                className="providerChatInput"
                placeholder="Write a reply..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
              />
              <div className="providerChatComposerActions">
                <button
                  type="button"
                  className="providerChatClearDraft"
                  onClick={handleClearDraft}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="providerChatSend"
                  onClick={handleSend}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="providerMessagesEmptyPanel">
            Select a conversation to view messages.
          </div>
        )}
      </section>

      {showNotePopup && (
        <div className="providerNotePopupOverlay" onClick={() => setShowNotePopup(false)}>
          <div className="providerNotePopup" onClick={(e) => e.stopPropagation()}>
            <div className="providerNotePopupHeader">
              <h3>Add Note to {selectedConversation?.patientName}</h3>
              <button
                type="button"
                className="providerNotePopupClose"
                onClick={() => setShowNotePopup(false)}
              >
                ×
              </button>
            </div>
            <textarea
              className="providerNotePopupTextarea"
              placeholder="Write your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="providerNotePopupActions">
              <button
                type="button"
                className="providerNotePopupCancel"
                onClick={() => setShowNotePopup(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="providerNotePopupSave"
                onClick={handleAddNote}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}