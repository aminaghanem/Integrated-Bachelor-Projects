"use client"
import { useState } from "react"

interface Props {
  username: string
  currentNickname?: string | null        // ← add this
  currentAvatar?: string | null          // ← and this
  onSave: (nickname: string, selectedAvatar: string | null) => void
}

// const AVATARS = [
//   { id: "rocket",   emoji: "🚀", label: "Rocket"   },
//   { id: "star",     emoji: "⭐", label: "Star"     },
//   { id: "planet",   emoji: "🪐", label: "Planet"   },
//   { id: "robot",    emoji: "🤖", label: "Robot"    },
//   { id: "alien",    emoji: "👾", label: "Alien"    },
//   { id: "comet",    emoji: "☄️", label: "Comet"    },
// ]

const AVATARS = [
  { id: "avatar1",    image: "/sg-avatar1.png", color: "#fff" },
  { id: "avatar2",    image: "/sg-avatar2.png", color: "#fff" },
  { id: "avatar3",    image: "/sg-avatar3.png", color: "#c47be8" },
  { id: "avatar4",    image: "/sg-avatar4.png", color: "#fff" },
  { id: "avatar5",    image: "/sg-avatar5.png", color: "#c47be8" },
  { id: "avatar6",    image: "/sg-avatar6.png", color: "#f5c842" },
]

export default function NicknameModal({ username, currentNickname, currentAvatar, onSave }: Props) {
  const [nickname, setNickname] = useState(currentNickname || "")           // ← pre-fill
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar || null) 
  const [error, setError] = useState("")

  const handleSave = () => {
    const trimmed = nickname.trim()
    if (trimmed && trimmed.length < 2) { setError("At least 2 characters"); return }
    if (trimmed && trimmed.length > 20) { setError("Max 20 characters"); return }
    onSave(trimmed || username, selectedAvatar)
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,5,26,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000 }}>
      <div style={{
        background:"#1a0e2e", border:"2px solid #cb6ce6", borderRadius:16,
        padding:"32px 28px", width:"100%", maxWidth:440,
        boxShadow:"0 0 40px rgba(203,108,230,0.2)",
        fontFamily:"'Share Tech Mono',monospace",
      }}>
        {/* Title */}
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, color:"#ffe600", letterSpacing:"0.15em", marginBottom:6 }}>
          {currentNickname? "EDIT NICKNAME" : "CHOOSE NICKNAME"}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:24 }}>
            {currentNickname
                ? "Update your nickname"
                : "Choose your nickname — or skip to use your username"}
        </div>

        {/* Avatar picker */}
        {/* <div style={{ fontSize:10, color:"rgba(255,230,0,0.6)", letterSpacing:"0.1em", marginBottom:10 }}>
          SELECT AVATAR
        </div> */}
        {/* <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:24 }}>
          {AVATARS.map(av => (
            <button
              key={av.id}
              onClick={() => setSelectedAvatar(av.id)}
              title={av.id}
              style={{
                padding:"10px 0", borderRadius:10, border:"2px solid",
                borderColor: selectedAvatar === av.id ? "#ffe600" : "rgba(203,108,230,0.25)",
                background: selectedAvatar === av.id ? "rgba(255,230,0,0.1)" : "rgba(203,108,230,0.06)",
                cursor:"pointer", fontSize:22, lineHeight:1,
                transition:"all 0.15s",
                boxShadow: selectedAvatar === av.id ? "0 0 10px rgba(255,230,0,0.2)" : "none",
              }}
            >
              <img src={av.image} alt={av.id} style={{ width: "100%", height: "100%" }} />
            </button>
          ))}
        </div> */}

        {/* Nickname input */}
        <div style={{ fontSize:10, color:"rgba(255,230,0,0.6)", letterSpacing:"0.1em", marginBottom:8 }}>
          NICKNAME
        </div>
        <input
          type="text"
          value={nickname}
          onChange={e => { setNickname(e.target.value); setError("") }}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          placeholder={`Leave blank to use "${username}"`}
          maxLength={20}
          style={{
            width:"100%", padding:"10px 14px", borderRadius:8,
            border:"1.5px solid rgba(203,108,230,0.4)",
            background:"rgba(255,255,255,0.04)", color:"#e8e8f0",
            fontFamily:"'Share Tech Mono',monospace", fontSize:12,
            outline:"none", boxSizing:"border-box", marginBottom:4,
          }}
        />
        {error && <div style={{ fontSize:10, color:"#ff6b6b", marginBottom:8 }}>{error}</div>}
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.2)", marginBottom:24 }}>
          {nickname.length}/20
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={handleSave}
            style={{
              flex:1, padding:"11px", borderRadius:8,
              border:"1.5px solid #ffe600", background:"rgba(255,230,0,0.1)",
              color:"#ffe600", cursor:"pointer",
              fontFamily:"'Orbitron',monospace", fontSize:11, letterSpacing:"0.08em",
            }}
          >
            CONFIRM
          </button>
          <button
            onClick={() => onSave(username, selectedAvatar)}
            style={{
              padding:"11px 16px", borderRadius:8,
              border:"1.5px solid rgba(255,255,255,0.15)", background:"transparent",
              color:"rgba(255,255,255,0.4)", cursor:"pointer",
              fontFamily:"'Share Tech Mono',monospace", fontSize:10,
            }}
          >
            SKIP
          </button>
        </div>
      </div>
    </div>
  )
}