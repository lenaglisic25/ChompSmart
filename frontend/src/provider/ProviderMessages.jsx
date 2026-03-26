import { useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      const email = localStorage.getItem("currentProviderEmail");
      if (!email) return;

      try {
        const res = await fetch(`http://localhost:8000/providers/patients?email=${email}`);
        if (!res.ok) throw new Error("Failed to fetch patients");

        const dbPatients = await res.json();

        const formattedConvos = dbPatients.map((user) => ({
          id: user.email,
          patientEmail: user.email,
          patientName: user.name || user.email, 
          preview: "No messages yet.",
          lastTime: "--",
          unread: 0,
          status: "New Patient",
          messages: [],
        }));

        if (formattedConvos.length > 0) {
          const firstConv = formattedConvos[0];
          setSelectedId(firstConv.id);
          
          try {
            const msgRes = await fetch(`http://localhost:8000/messages/${firstConv.patientEmail}/${email}`);
            const msgData = await msgRes.json();
            
            if (Array.isArray(msgData) && msgData.length > 0) {
              const formattedMsgs = msgData.map(m => ({
                id: String(m.id),
                sender: m.sender,
                text: m.text,
                time: m.time
              }));
              
              formattedConvos[0].messages = formattedMsgs;
              formattedConvos[0].preview = formattedMsgs[formattedMsgs.length - 1].text;
              formattedConvos[0].lastTime = formattedMsgs[formattedMsgs.length - 1].time;
            }
          } catch (err) {
            console.error(err);
          }
        }

        setConversations(formattedConvos);
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
    
    const conv = conversations.find(c => c.id === id);
    const providerEmail = localStorage.getItem("currentProviderEmail");
    
    if (conv && conv.patientEmail && providerEmail) {
      try {
        const res = await fetch(`http://localhost:8000/messages/${conv.patientEmail}/${providerEmail}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const formatted = data.map(m => ({
            id: String(m.id),
            sender: m.sender,
            text: m.text,
            time: m.time
          }));
          
          setConversations((prev) =>
            prev.map((item) =>
              item.id === id ? { 
                ...item, 
                unread: 0, 
                messages: formatted,
                preview: formatted.length > 0 ? formatted[formatted.length - 1].text : "No messages yet.",
                lastTime: formatted.length > 0 ? formatted[formatted.length - 1].time : "--"
              } : item
            )
          );
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setConversations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, unread: 0 } : item
        )
      );
    }
  }

  async function handleSend() {
    const clean = draft.trim();
    if (!clean || !selectedConversation) return;

    const now = getCurrentTimeLabel();
    const providerEmail = localStorage.getItem("currentProviderEmail");

    try {
      await fetch("http://localhost:8000/messages/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_email: selectedConversation.patientEmail,
          provider_email: providerEmail,
          sender: "provider",
          text: clean,
          time: now
        })
      });
    } catch (err) {
      console.error(err);
    }

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
                <button type="button">View Profile</button>
                <button type="button">Add Note</button>
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
    </div>
  );
}