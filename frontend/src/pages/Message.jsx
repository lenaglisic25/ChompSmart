// Message.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useFavorites } from "../context/FavoritesContext";
import { useGrocery } from "../grocery/GroceryContext";
import { apiFetch } from "../components/api";
import "./Message.css";

const chompyGreetings = [
  "Hi! I'm Chompy. I can log your meals, check your food photos, or fix your recipes to fit your goals. What should we do first?",
  "Chomp chomp! I'm Chompy. Tell me what you ate or send me a picture of your plate. I can also help you change a recipe to follow your plan!",
  "Hey there! I'm Chompy, and I am here to help you log food and reach your daily targets. You can even ask me to adjust a recipe just for you!",
  "Hello! I am Chompy. I can track your calories, identify food in photos, and give you new recipe ideas. How can I help you today?",
  "Snap snap! I'm Chompy. Let's hit your targets by logging your meals or scanning a food photo. I can also help you with your favorite recipes!",
  "Hi! I am Chompy, your nutrition gator. I can log your snacks, read your food labels in photos, and adjust any recipe for you. What is on your mind?",
  "Chomp chomp! I'm Chompy, and I am ready to track your breakfast, lunch, or dinner. You can also ask me for tips on how to make a recipe fit your specific rules!",
  "Hey! I'm Chompy. It is a great day to reach your goals. I can log your food, check your macros from a photo, or help you find a substitution for a recipe!",
  "Hi! I am Chompy. I can help you track your nutrition, log your meals, or find the right ingredients for your recipes. What are we working on?",
  "Snap snap! I'm Chompy. I can track your food goals, identify ingredients in your photos, and help you swap out items in your recipes. What's up?"
];

function getRandomGreeting() {
  return chompyGreetings[Math.floor(Math.random() * chompyGreetings.length)];
}

function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

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
    img.src = dataUrl;
  });
}

const MAX_MESSAGE_LENGTH = 2000;

export default function Message() {
  const email = localStorage.getItem("currentUserEmail") || "guest";
  const providerEmail = localStorage.getItem("myProviderEmail");
  const providerName = localStorage.getItem("myProviderName") || "Provider";

  const { favoritesList } = useFavorites() || {};
  const { items, addItem } = useGrocery() || {};
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
          body: getRandomGreeting(),
        },
      ],
      doctor: [
        {
          id: "d1",
          from: "staff",
          name: providerName,
          avatar: "doctor",
          time: nowTime(),
          body: `Nothing has been said yet. Click here to start a conversation with ${providerName}.`,
        },
      ],
    }),
    [providerName]
  );

  const [view, setView] = useState("inbox"); // "inbox" | "chat"
  const [activeThread, setActiveThread] = useState(null); // "chompy" | "doctor"
  const [text, setText] = useState("");
  // (yavna) added simple typing indicator for ai loading
  const [typing, setTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState({ chompy: 0, doctor: 0 });
  const [doctorThreadCleared, setDoctorThreadCleared] = useState(false);

  const [threads, setThreads] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.doctor) {
          parsed.doctor = starterThreads.doctor;
        }
        return parsed;
      }
    } catch (err) {
      console.error(err);
    }
    return starterThreads;
  });

  useEffect(() => {
    try {
      const chompyOnly = { chompy: threads.chompy };
      localStorage.setItem(storageKey, JSON.stringify(chompyOnly));
    } catch (err) {
      console.error(err);
    }
  }, [threads.chompy, storageKey]);

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

  const [fadeIn, setFadeIn] = useState(false);
  
    useEffect(() => {
      setTimeout(() => setFadeIn(true), 50);
    }, []);

  function stopCamera() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch (err) {
      console.debug(err);
    }
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
        console.error(e);
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

        const res = await apiFetch("/chat/upload", {
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
        console.error(err);
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

  useEffect(() => {
    if (providerEmail && !doctorThreadCleared) {
      apiFetch(`/messages/?provider_email=${encodeURIComponent(providerEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            let formatted = data.map(m => ({
              id: String(m.id),
              from: m.sender === "patient" ? "me" : "staff",
              name: m.sender === "patient" ? "You" : providerName,
              avatar: m.sender === "patient" ? "me" : "doctor",
              time: m.time,
              body: m.text,
            }));

            const clearedUntilId = localStorage.getItem(`doctor_cleared_until_${email}`);
            if (clearedUntilId) {
              const idx = formatted.findIndex(m => m.id === clearedUntilId);
              if (idx !== -1) {
                formatted = formatted.slice(idx + 1);
              }
            }

            setThreads(prev => ({ ...prev, doctor: formatted.length > 0 ? formatted : starterThreads.doctor }));

            let unreadCount = 0;
            const readUntilId = localStorage.getItem(`doctor_read_until_${email}`);
            
            if (activeThread === "doctor") {
              if (formatted.length > 0) {
                localStorage.setItem(`doctor_read_until_${email}`, formatted[formatted.length - 1].id);
              }
            } else {
              for (let i = formatted.length - 1; i >= 0; i--) {
                if (formatted[i].id === readUntilId) break;
                if (formatted[i].from === "staff") {
                  unreadCount++;
                } else if (formatted[i].from === "me") {
                  break;
                }
              }
            }
            
            setUnreadCount(prev => ({ ...prev, doctor: unreadCount }));
          } else {
            setThreads(prev => ({ ...prev, doctor: starterThreads.doctor }));
            setUnreadCount(prev => ({ ...prev, doctor: 0 }));
          }
        })
        .catch(console.error);
    }
  }, [activeThread, providerEmail, providerName, starterThreads.doctor, doctorThreadCleared, email]);

  function openChat(threadKey) {
    setActiveThread(threadKey);
    setView("chat");
    if (threadKey === "doctor") {
      setUnreadCount(prev => ({ ...prev, doctor: 0 }));
      const lastMsg = threads.doctor?.[threads.doctor.length - 1];
      if (lastMsg && lastMsg.id && lastMsg.id !== "d1") {
        localStorage.setItem(`doctor_read_until_${email}`, lastMsg.id);
      }
    }
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

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      alert(`Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

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

    if (activeThread === "doctor" && providerEmail) {
      try {
        apiFetch("/messages/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_email: providerEmail,
            text: trimmed,
            time: nowTime()
          })
        });
      } catch (err) {
        console.error(err);
      }
      setDoctorThreadCleared(false);
    }

    if (activeThread === "chompy") {
      setTyping(true);
      try {
        const history = updatedThreads.chompy.map(m => ({
            from: m.from, 
            body: m.body 
        }));

        const favoriteTitles = Array.isArray(favoritesList) ? favoritesList.map(recipe => recipe.title) : [];
        const currentGroceries = Array.isArray(items) 
            ? items.map(i => ({ name: i.name, purchased: i.purchased })) 
            : [];

        const res = await apiFetch("/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            history: history,
            user_email: email,
            favorites: favoriteTitles,
            groceries: currentGroceries
          }),
        });

        const data = await res.json();
        
        if (data?.added_groceries && Array.isArray(data.added_groceries)) {
          data.added_groceries.forEach(itemName => {
            if (addItem) addItem(itemName, 1, "Other", "");
          });
        }
        
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
    
    if (activeThread === "doctor") {
      const lastMsg = threads.doctor?.[threads.doctor.length - 1];
      if (lastMsg && lastMsg.id && lastMsg.id !== "d1") {
        localStorage.setItem(`doctor_cleared_until_${email}`, lastMsg.id);
      }
      setThreads((prev) => ({
        ...prev,
        doctor: starterThreads.doctor,
      }));
      setUnreadCount(prev => ({ ...prev, doctor: 0 }));
      setDoctorThreadCleared(true);
    } else {
      setThreads((prev) => ({
        ...prev,
        chompy: [
          {
            id: `c_${Date.now()}`,
            from: "bot",
            name: "Chompy",
            avatar: "gator",
            time: nowTime(),
            body: getRandomGreeting(),
          },
        ],
      }));
    }
  }

  function previewOf(threadKey) {
    const arr = threads?.[threadKey] || [];
    const last = arr[arr.length - 1];
    if (!last) return "";
    return last.body || (last.type === "image" ? "📷 Photo" : "");
  }

  const chatTitle = activeThread === "chompy" ? "Chompy" : providerName;

  if (view === "inbox") {
    return (
      <div className={`msgInboxPage fadePage ${fadeIn ? "visible" : ""}`}>
        <div className="msgInboxContainer">
          <div
            className={`msgInboxCard fadeCard ${fadeIn ? "visible" : ""}`}
            role="button"
            onClick={() => openChat("chompy")}
          >
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
              <div className="msgInboxName">
                {providerName}
                {unreadCount.doctor > 0 && (
                  <span className="msgUnreadBadge">{unreadCount.doctor}</span>
                )}
              </div>
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
                  <ReactMarkdown>{m.body}</ReactMarkdown>
                )}
              </div>
            </div>

            {m.from === "me" && <div className="msgAvatar me">🙂</div>}
          </div>
        ))}

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
          maxLength={MAX_MESSAGE_LENGTH}
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