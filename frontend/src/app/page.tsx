// import LoginWizard from "../components/login/LoginWizard";

// export default function LoginPage() {
//   return (
//     <div>
//       <LoginWizard />
//     </div>
//   );
// }

"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      localStorage.setItem("token", data.token)
      localStorage.setItem("role", data.role)
      localStorage.setItem("userId", data.userId)
      if (data.role === "student") router.push("/student/dashboard")
      if (data.role === "teacher") router.push("/teacher/dashboard")
      if (data.role === "parent")  router.push("/parent/dashboard")
      if (data.role === "admin")   router.push("/admin/dashboard")
    } catch {
      setError("Network error")
    }
  }

  // return (
  //   <div style={{
  //     minHeight: "100vh", position: "relative",
  //     display: "flex", flexDirection: "column",
  //     alignItems: "center", justifyContent: "flex-end",
  //     fontFamily: "sans-serif", padding: "0 20px 40px",
  //     overflow: "hidden"
  //   }}>

  //     {/* Full-screen background logo */}
  //     <img
  //       src="/logo2.png"
  //       alt=""
  //       style={{
  //         position: "relative", inset: 0,
  //         width: "50%", height: "50%",
  //         objectFit: "cover", zIndex: 0,
          
  //       }}
  //     />

  //     {/* Login window pinned to bottom */}
  //     <div style={{
  //       position: "relative", zIndex: 1,
  //       background: "#fff8ee", border: "2.5px solid #3d2c1e",
  //       borderRadius: 14, boxShadow: "4px 4px 0 #3d2c1e",
  //       width: "100%", maxWidth: 380, overflow: "hidden"
  //     }}>

  //       {/* Title bar */}
  //       <div style={{
  //         display: "flex", alignItems: "center", gap: 7,
  //         padding: "8px 14px", background: "#5ab4e8",
  //         borderBottom: "2.5px solid #3d2c1e"
  //       }}>
  //         {/* {[["#f47b7b"], ["#f5c842"], ["#7bc67e"]].map(([bg], i) => (
  //           <span key={i} style={{
  //             width: 11, height: 11, borderRadius: "50%",
  //             background: bg, border: "1.5px solid #3d2c1e", flexShrink: 0
  //           }} />
  //         ))}
  //         <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginLeft: 4 }}>
  //           safe browse — login
  //         </span> */}
  //       </div>

  //       {/* Body */}
  //       <div style={{ padding: "18px 22px 20px" }}>

  //         <label style={{
  //           display: "block", fontSize: 11, fontWeight: 700, color: "#b89b82",
  //           textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5
  //         }}>Username</label>
  //         <input
  //           type="text"
  //           placeholder="Enter your username"
  //           value={username}
  //           onChange={e => setUsername(e.target.value)}
  //           onKeyDown={e => e.key === "Enter" && handleLogin()}
  //           style={{
  //             width: "100%", padding: "9px 13px", fontSize: 14,
  //             border: "2px solid #3d2c1e", borderRadius: 9,
  //             background: "#fef3e2", color: "#3d2c1e", outline: "none",
  //             boxShadow: "2px 2px 0 #3d2c1e", boxSizing: "border-box", marginBottom: 12
  //           }}
  //         />

  //         <label style={{
  //           display: "block", fontSize: 11, fontWeight: 700, color: "#b89b82",
  //           textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5
  //         }}>Password</label>
  //         <input
  //           type="password"
  //           placeholder="••••••••"
  //           value={password}
  //           onChange={e => setPassword(e.target.value)}
  //           onKeyDown={e => e.key === "Enter" && handleLogin()}
  //           style={{
  //             width: "100%", padding: "9px 13px", fontSize: 14,
  //             border: "2px solid #3d2c1e", borderRadius: 9,
  //             background: "#fef3e2", color: "#3d2c1e", outline: "none",
  //             boxShadow: "2px 2px 0 #3d2c1e", boxSizing: "border-box", marginBottom: 16
  //           }}
  //         />

  //         <button
  //           onClick={handleLogin}
  //           style={{
  //             width: "100%", padding: 11, fontSize: 14, fontWeight: 700,
  //             border: "2.5px solid #3d2c1e", borderRadius: 9,
  //             background: "#5ab4e8", color: "#fff", cursor: "pointer",
  //             boxShadow: "3px 3px 0 #3d2c1e", letterSpacing: "0.02em"
  //           }}
  //           onMouseDown={e => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = "none" }}
  //           onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "3px 3px 0 #3d2c1e" }}
  //         >
  //           Login
  //         </button>

  //         {error && (
  //           <div style={{
  //             display: "flex", alignItems: "center", gap: 7, marginTop: 12,
  //             padding: "9px 12px", background: "#fde8e8",
  //             border: "2px solid #3d2c1e", borderRadius: 9,
  //             boxShadow: "2px 2px 0 #3d2c1e", fontSize: 12, fontWeight: 600, color: "#c0392b"
  //           }}>
  //             <span>⚠️</span> {error}
  //           </div>
  //         )}
  //       </div>
  //     </div>
  //   </div>
  // )
  return (

    <div style={{ 
      backgroundColor: '#F5EAD4', // Warm cream background
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'sans-serif', // Clean sans-serif like examples
    }}>
      
      {/* The main centered layout, split into two distinct columns */}
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center'
      }}>

        {/* Left Column: The Logo and Title Bubble */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '30px',
          backgroundColor: '#C7C0E1', // Pastel lavender bubble from image_1
          borderRadius: '50px', // Circular, rounded like image_1 windows
          border: '3px solid #4F4A45', // Strong border
          width: '800px',
          height: '600px',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* The Pixel-Safe Eye Logo Icon */}
          <div style={{
            width: '750px',
            height: '500px',
            border: '3px solid #4F4A45', // Blocky, bold brown lines
            backgroundColor: '#F9EB9B', // Muted yellow frame
            borderRadius: '15px', // Pixelated curves
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            position: 'relative'
          }}>
            {/* Miniature window icons styled as 'eyes' or details */}
            <img
              src="/image-removebg-preview.png"
              alt=""
              style={{
                position: "relative", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover", zIndex: 0
              }}
            />
          </div>
          {/* Text is in a simple pixel font */}
{/*           <div style={{
            fontFamily: "'Press Start 2P', cursive",
            color: '#4F4A45',
            fontSize: 50,
//             fontWeight: 'bold',
            position: 'relative',
            top: '5px'
          }}>SMARTGUARD</div> */}
          <div style={{
           fontFamily: "'Silkscreen', monospace", fontSize: 30,
            color: '#4F4A45',
            position: 'relative',
            top: '5px',
          }}>SECURE SCHOOL BROWSING</div>
        </div>

        {/* Decorative element spanning the columns: The Pixel Rainbow (1) */}
{/*         <div style={{
          position: 'absolute',
          top: '40%',
          left: '300px',
          fontSize: '48px'
        }}>🌈</div> */}

        {/* Right Column: The Login Window Widget (Inspired by image_0.png) */}
        <div style={{ 
          backgroundColor: '#F9EB9B', // Soft pastel yellow frame like image_0 Login
          border: '3px solid #4F4A45', // Strong border
          borderRadius: '15px', // Rounded corners
          width: '320px',
          height: '300px',
          padding: '20px',
          boxShadow: '5px 5px 0 rgba(0,0,0,0.1)', // Subtle shadow
          position: 'relative'
        }}>
          
          {/* The Distinct Title Bar, perfectly mimicking image_0 New Message */}
          <div style={{
            backgroundColor: '#C7C0E1', // Dusty rose title bar
            position: 'absolute',
            top: '0',
            left: '0',
            width: '93%',
            height: '50px',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            borderBottom: '2px solid #4F4A45'
          }}>
            <div style={{ fontWeight: 'bold', color: '#4F4A45', fontSize: '17px', position: 'relative', left: '-90px' }}>User Login</div>
          </div>

          {/* Content starts below the title bar */}
          <div style={{ marginTop: '30px' }}>
          
            {/* Input Fields, separated into individual rounded boxes like image_0 read window */}
            <div style={{ 
              backgroundColor: 'white', 
              height: '40px',
              border: '2px solid #4F4A45', 
              borderRadius: '10px', 
              padding: '10px', 
              marginBottom: '15px', 
              position: 'relative'
            }}>
              <label style={{ 
                fontSize: '10px', 
                color: '#4F4A45', 
                opacity: 0.6, 
                position: 'absolute', 
                top: '4px', 
                left: '5px' 
              }}>username</label>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  paddingLeft: '5px',
                  border: 'none', // Border is on the container
                  marginTop: '-20px', // Content below internal label
                  backgroundColor: 'transparent',
                  color: '#4F4A45'
                }}
              />
            </div>

            <div style={{ 
              backgroundColor: 'white',
              height: '40px',
              border: '2px solid #4F4A45', 
              borderRadius: '10px', 
              padding: '10px', 
              marginBottom: '20px', 
              position: 'relative'
            }}>
              <label style={{ 
                fontSize: '10px', 
                color: '#4F4A45', 
                opacity: 0.6, 
                position: 'absolute', 
                top: '4px', 
                left: '5px' 
              }}>password</label>
              <input
                type="password"
                placeholder="Enter Password" // Dot-style placeholder like in image_0.png
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  paddingLeft: '5px',
                  border: 'none', // Border is on the container
                  marginTop: '-20px',
                  backgroundColor: 'transparent',
                  color: '#4F4A45'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {/* Buttons styled like the 'OK' widget in image_0, using specific colors */}
              <button 
                onClick={handleLogin}
                style={{
                  width: "200%",
                  height: "50px",
                  backgroundColor: '#C7C0E1',
                  color: '#4F4A45',
                  border: '2px solid #4F4A45',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  cursor: 'pointer',
                  position: 'relative',
                  bottom: '20px',
                  left: '-10px',
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ fontSize: '20px', position: 'relative', left: '0%', transform: 'translateY(-90%)' }}>Login</div>
              </button>
{/*               <button style={{
                backgroundColor: '#F2994A', // Muted orange like image_0 read button
                color: '#4F4A45',
                border: '2px solid #4F4A45',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 rgba(0,0,0,0.1)'
              }}>Cancel</button> */}
            </div>

            {/* Error message, cleanly styled within a notification box */}
            {error && (
              <div style={{ 
                backgroundColor: 'white', 
                color: '#4F4A45', 
                border: '2px solid #F5BFC9', // Dusty rose outline
                borderRadius: '8px', 
                padding: '10px', 
                marginTop: '15px',
                display: 'flex',
                gap: '5px',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: '600',
                width: '100%',
              }}>
                <p style={{ margin: -50, fontFamily: 'monospace', fontSize: '15px', alignItems: 'center' }}>🚫 {error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>

  )

}