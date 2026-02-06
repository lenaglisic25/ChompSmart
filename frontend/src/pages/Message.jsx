import { useEffect, useMemo, useRef, useState } from "react";
import "./Message.css";

function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function Message() {
  const email = localStorage.getItem("currentUserEmail") || "guest";
  const storageKey = useMemo(() => `chompsmart_threads_${email}`, [email]);

  const starterThreads = useMemo(
    () => ({
      chompy: [
        {
          id: "c1",
          from: "bot",
          name: "Chompy",
          avatar: "gator",
          time: nowTime(),
          body: "Yeah! That food combo works best! I like the way you are thinking, keep it up.",
        },
      ],
      doctor: [
        {
          id: "d1",
          from: "staff",
          name: "Dr. Smith",
          avatar: "doctor",
          time: nowTime(),
          body: "Nothing has been said yet. Click here to start a conversation with your professional.",
        },
      ],
    }),
    []
  );


  const [view, setView] = useState("inbox"); // "inbox" | "chat"
  const [activeThread, setActiveThread] = useState(null); // "chompy" | "doctor"
  const [text, setText] = useState("");

  const [threads, setThreads] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return starterThreads;
  });


  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(threads));
    } catch {}
  }, [threads, storageKey]);

  const listRef = useRef(null);
  const messages = activeThread ? threads?.[activeThread] || [] : [];

  // scroll only in chat view
  useEffect(() => {
    if (view !== "chat") return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [view, activeThread, messages.length]);

  function openChat(threadKey) {
    setActiveThread(threadKey);
    setView("chat");
  }

  function backToInbox() {
    setView("inbox");
    setActiveThread(null);
    setText("");
  }

  function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || !activeThread) return;

    const newMsg = {
      id: `${Date.now()}`,
      from: "me",
      name: "You",
      avatar: "me",
      time: nowTime(),
      body: trimmed,
    };

    setThreads((prev) => ({
      ...prev,
      [activeThread]: [...(prev[activeThread] || []), newMsg],
    }));
    setText("");


    if (activeThread === "chompy") {
      setTimeout(() => {
        setThreads((prev) => ({
          ...prev,
          chompy: [
            ...(prev.chompy || []),
            {
              id: `${Date.now()}_bot`,
              from: "bot",
              name: "Chompy",
              avatar: "gator",
              time: nowTime(),
              body: "Got it! Want meal ideas or a goal check?",
            },
          ],
        }));
      }, 450);
    }
  }

  function clearActiveChat() {
    if (!activeThread) return;
    if (!window.confirm("Clear this chat?")) return;
    setThreads((prev) => ({
      ...prev,
      [activeThread]: starterThreads[activeThread],
    }));
  }

  function previewOf(threadKey) {
    const arr = threads?.[threadKey] || [];
    const last = arr[arr.length - 1];
    return last?.body || "";
  }

  const chatTitle = activeThread === "chompy" ? "Chompy" : "Dr. Smith";


  if (view === "inbox") {
    return (
      <div className="msgInboxPage">
        <div className="msgInboxContainer">
          <div className="msgInboxCard" role="button" onClick={() => openChat("chompy")}>
            <div className="msgInboxAvatar gator" aria-hidden="true">
              🐊
            </div>
            <div className="msgInboxText">
              <div className="msgInboxName">Chompy</div>
              <div className="msgInboxPreview">{previewOf("chompy")}</div>
            </div>
          </div>

          <div className="msgInboxCard" role="button" onClick={() => openChat("doctor")}>
            <div className="msgInboxAvatar doctor" aria-hidden="true">
              👨‍⚕️
            </div>
            <div className="msgInboxText">
              <div className="msgInboxName">Dr. Smith</div>
              <div className="msgInboxPreview">{previewOf("doctor")}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="msgPage">
      <div className="msgHeader">
        <button className="msgBackBtn" type="button" onClick={backToInbox}>
          ←
        </button>

        <div className="msgHeaderTitle">{chatTitle}</div>

        <button className="msgClearBtn" type="button" onClick={clearActiveChat}>
          Clear
        </button>
      </div>

      <div className="msgList" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={`msgRow ${m.from === "me" ? "me" : "other"}`}>
            {m.from !== "me" && (
              <div className={`msgAvatar ${m.avatar === "doctor" ? "doctor" : "gator"}`}>
                {m.avatar === "doctor" ? "👨‍⚕️" : "🐊"}
              </div>
            )}

            <div className="msgBubble">
              <div className="msgTopLine">
                <span className="msgName">{m.name}</span>
                <span className="msgTime">{m.time}</span>
              </div>
              <div className="msgBody">{m.body}</div>
            </div>

            {m.from === "me" && <div className="msgAvatar me">🙂</div>}
          </div>
        ))}
      </div>

      <div className="msgComposer">
        <input
          className="msgInput"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button className="msgSendBtn" type="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
