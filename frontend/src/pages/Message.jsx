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
  const storageKey = useMemo(() => `chompsmart_messages_${email}`, [email]);

  const [text, setText] = useState("");

  // starter messages
  const starter = useMemo(
    () => [
      {
        id: "m1",
        from: "bot",
        name: "Chompy",
        avatar: "gator",
        time: nowTime(),
        body: "Yeah! That food combo works best! I like the way you are thinking, keep it up.",
      },
      {
        id: "m2",
        from: "staff",
        name: "Dr. Smith",
        avatar: "doctor",
        time: nowTime(),
        body: "Nothing has been said yet. Click here to start a conversation with your professional.",
      },
    ],
    []
  );

  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return starter;
  });

  const listRef = useRef(null);


  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newMsg = {
      id: `${Date.now()}`,
      from: "me",
      name: "You",
      avatar: "me",
      time: nowTime(),
      body: trimmed,
    };

    setMessages((prev) => [...prev, newMsg]);
    setText("");

    //auto bot reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_bot`,
          from: "bot",
          name: "Chompy",
          avatar: "gator",
          time: nowTime(),
          body: "Got it! I saved your message. Want meal ideas or a goal check?",
        },
      ]);
    }, 450);
  }

  function clearChat() {
    if (!window.confirm("Clear messages?")) return;
    setMessages(starter);
  }

  return (
    <div className="msgPage">
      <div className="msgHeader">
        <div className="msgHeaderTitle">Messages</div>

        <button className="msgClearBtn" type="button" onClick={clearChat}>
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
