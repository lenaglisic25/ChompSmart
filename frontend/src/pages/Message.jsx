// Message.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./Message.css";

function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// (yavna) Handle  file compression
async function compressImage(dataUrl, quality = 0.6, maxWidth = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };
    img.src = dataUrl
  });
}
//

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
  // (yavna) added simple typing indicator for ai loading
  const [typing, setTyping] = useState(false);

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

  // CAMERA/UPLOAD
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewImage, setPreviewImage] = useState(null); // dataURL
  const [cameraStream, setCameraStream] = useState(null);

  function stopCamera() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch {}

    setCameraStream(null);
    setIsCameraOpen(false);
  }

  async function openCamera() {
    setCameraError("");
    setPreviewImage(null);
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      setCameraStream(stream);
    } catch (e) {
      console.error(e);
      setCameraError("Camera permission denied or camera not available. Use Upload instead.");
      setIsCameraOpen(false);
    }
  }

  useEffect(() => {
    if (!isCameraOpen) return;
    if (!cameraStream) return;

    const video = videoRef.current;
    if (!video) return;

    video.srcObject = cameraStream;

    const play = async () => {
      try {
        await video.play();
      } catch (e) {
        console.error("video.play() failed:", e);
      }
    };

    video.onloadedmetadata = play;
    play();

    return () => {
      video.onloadedmetadata = null;
    };
  }, [isCameraOpen, cameraStream]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is still loading — wait a second and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreviewImage(dataUrl);
    stopCamera();
  }


  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  // (yavna) update to handle image messages to backend
  async function sendImageMessage(dataUrl) {
    if (!activeThread || !dataUrl) return;

    const newMsg = {
      id: `${Date.now()}`,
      from: "me",
      name: "You",
      avatar: "me",
      time: nowTime(),
      type: "image",
      imageUrl: dataUrl,
    };

    setThreads((prev) => ({
      ...prev,
      [activeThread]: [...(prev[activeThread] || []), newMsg],
    }));
    setPreviewImage(null);

    if (activeThread === "chompy") {
      setTyping(true);
      
      try {
        const compressedImage = await compressImage(dataUrl);

        const res = await fetch("http://localhost:8000/chat/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: compressedImage,
            user_email: email,
          }),
        });

        const data = await res.json();

        if (data?.reply) {
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
                body: data.reply,
              },
            ],
          }));
        }
      } catch (err) {
        console.error("Image upload failed:", err);
      } finally {
        setTyping(false);
      }
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // scroll only in chat view
  useEffect(() => {
    if (view !== "chat") return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [view, activeThread, messages.length, typing]);

  function openChat(threadKey) {
    setActiveThread(threadKey);
    setView("chat");
  }

  function backToInbox() {
    stopCamera();
    setView("inbox");
    setActiveThread(null);
    setText("");
    setPreviewImage(null);
  }

  // (backend) edit sendMessage to use api and fetch/send history
  async function sendMessage() {
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

    const updatedThreads = {
      ...threads,
      [activeThread]: [...(threads[activeThread] || []), newMsg],
    };

    setThreads(updatedThreads);
    setText("");

    if (activeThread === "chompy") {
      setTyping(true);
      try {
        const history = updatedThreads.chompy.map(m => ({
            from: m.from, 
            body: m.body 
        }));

        const res = await fetch("http://localhost:8000/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            history: history,
            user_email: email
          }),
        });

        const data = await res.json();
        if (data?.reply) {
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
                body: data.reply,
              },
            ],
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setTyping(false);
      }
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
    return last?.body || (last?.type === "image" ? "📷 Photo" : "");
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

              <div className="msgBody">
                {m.type === "image" ? (
                  <img className="msgImage" src={m.imageUrl} alt="upload" />
                ) : (
                  m.body
                )}
              </div>
            </div>

            {m.from === "me" && <div className="msgAvatar me">🙂</div>}
          </div>
        ))}
        
        {/* (yavna) simple typing indicator to show chatbot is generating a response*/}
        {typing && (
          <div className="msgRow other">
            <div className="msgAvatar gator">🐊</div>
            <div className="msgBubble">
              <div className="msgBody">
                 <span className="typing-indicator">Thinking...</span>
              </div>
            </div>
          </div>
        )}
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
          disabled={typing}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={onPickFile}
        />

        <button className="msgIconBtn" type="button" onClick={openCamera} title="Open Camera">
          📷
        </button>

        <button
          className="msgIconBtn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload Photo"
        >
          ⬆️
        </button>

        <button className="msgSendBtn" type="button" onClick={sendMessage}>
          Send
        </button>
      </div>

      {cameraError ? <div className="msgError">{cameraError}</div> : null}

      {previewImage ? (
        <div className="msgPreviewBar">
          <img src={previewImage} className="msgPreviewThumb" alt="preview" />
          <button type="button" className="msgSmallBtn" onClick={() => sendImageMessage(previewImage)}>
            Send Photo
          </button>
          <button type="button" className="msgSmallBtn ghost" onClick={() => setPreviewImage(null)}>
            Cancel
          </button>
        </div>
      ) : null}

      {isCameraOpen ? (
        <div className="msgCameraOverlay" role="dialog" aria-modal="true">
          <div className="msgCameraCard">
            <video ref={videoRef} className="msgCameraVideo" playsInline muted autoPlay/>
            <div className="msgCameraActions">
              <button type="button" className="msgSmallBtn" onClick={capturePhoto}>
                Capture
              </button>
              <button type="button" className="msgSmallBtn ghost" onClick={stopCamera}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}