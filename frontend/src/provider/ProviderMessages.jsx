import { useEffect, useMemo, useState } from "react";
import "./ProviderMessages.css";

const STORAGE_KEY = "provider_mock_conversations";

const mockConversations = [
  {
    id: "c1",
    patientName: "Maria Gonzalez",
    preview: "I am confused about carb counting for tortillas.",
    lastTime: "10:42 AM",
    unread: 2,
    status: "Needs reply",
    messages: [
      {
        id: "m1",
        sender: "patient",
        text: "Hi, I am confused about carb counting for tortillas.",
        time: "10:30 AM",
      },
      {
        id: "m2",
        sender: "provider",
        text: "No problem — are these corn or flour tortillas?",
        time: "10:35 AM",
      },
      {
        id: "m3",
        sender: "patient",
        text: "Mostly flour tortillas, and I do not know how many carbs to count.",
        time: "10:42 AM",
      },
    ],
  },
  {
    id: "c2",
    patientName: "James Carter",
    preview: "I missed my pickup this week.",
    lastTime: "Yesterday",
    unread: 0,
    status: "Follow-up",
    messages: [
      {
        id: "m1",
        sender: "patient",
        text: "I missed my Food Pharmacy pickup this week.",
        time: "Yesterday",
      },
      {
        id: "m2",
        sender: "provider",
        text: "Thanks for letting us know. We can help figure out another option.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "c3",
    patientName: "Alicia Brown",
    preview: "Can you explain sodium on labels again?",
    lastTime: "Mon",
    unread: 1,
    status: "Unread",
    messages: [
      {
        id: "m1",
        sender: "patient",
        text: "Can you explain sodium on labels again?",
        time: "Mon",
      },
    ],
  },
  {
    id: "c4",
    patientName: "Kevin Lopez",
    preview: "Thank you for the meal suggestions.",
    lastTime: "Sun",
    unread: 0,
    status: "Resolved",
    messages: [
      {
        id: "m1",
        sender: "patient",
        text: "Thank you for the meal suggestions.",
        time: "Sun",
      },
      {
        id: "m2",
        sender: "provider",
        text: "You are welcome — glad they helped.",
        time: "Sun",
      },
    ],
  },
];

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadStoredConversations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return mockConversations;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : mockConversations;
  } catch (error) {
    console.error("Failed to load provider messages from localStorage:", error);
    return mockConversations;
  }
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
  const [conversations, setConversations] = useState(loadStoredConversations);
  const [selectedId, setSelectedId] = useState(mockConversations[0].id);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

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

  function handleSelectConversation(id) {
    setSelectedId(id);

    setConversations((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              unread: 0,
            }
          : item
      )
    );
  }

  function handleSend() {
    const clean = draft.trim();
    if (!clean || !selectedConversation) return;

    const now = getCurrentTimeLabel();

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

  function handleResetAllMessages() {
    setConversations(mockConversations);
    setSelectedId(mockConversations[0].id);
    setDraft("");
    localStorage.removeItem(STORAGE_KEY);
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

        <button
          type="button"
          className="providerMessagesResetBtn"
          onClick={handleResetAllMessages}
        >
          Reset All Mock Messages
        </button>

        <div className="providerMessagesList">
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