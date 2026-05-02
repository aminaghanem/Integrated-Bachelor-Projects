// components/RunnerGame.tsx
"use client"
import { useEffect, useRef, useCallback, useState } from "react"

interface RunnerRec { title: string; url: string }
interface RunnerGroup { category: string; label: string; color?: string; items: RunnerRec[] }

interface Props {
  recGroups: RunnerGroup[]
  exploreRecs: RunnerRec[]
  onLaunch: (url: string) => void
  currentBestScore: number
  onNewBestScore: (score: number) => void
}

const PIXEL_SIZE = 2
const W = 680, H = 200, GROUND = 155

// Map your categories to colors
const CAT_COLORS: Record<string, string> = {
  Science: "#00ff88", Math: "#ffe600", History: "#ff9944",
  Coding: "#5b8dee", English: "#ff6bcd", Default: "#cb6ce6"
}

function SidebarGroup({ group, onLaunch }: { group: RunnerGroup; onLaunch: (url:string)=>void }) {
  const [open, setOpen] = useState(false)
  const color = CAT_COLORS[group.category] ?? CAT_COLORS.Default

    return (
        <div style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
          {/* Header — click to expand */}
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 14px", background:"none", border:"none", cursor:"pointer",
              fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:"0.08em",
              color:"#e8e8f0", transition:"background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(203,108,230,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block", flexShrink:0 }} />
              {group.label.toUpperCase()}
            </div>
            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:10 }}>{open ? "▲" : "▼"}</span>
          </button>

          {/* Expanded items */}
          {open && (
            <div style={{ paddingBottom:6 }}>
              {group.items.map((item, i) => (
                <div
                  key={i}
                  onClick={() => onLaunch(item.url)}
                  style={{
                    padding:"7px 14px 7px 30px", cursor:"pointer",
                    fontFamily:"'Share Tech Mono',monospace", fontSize:10,
                    color:"rgba(255,255,255,0.55)", transition:"all 0.15s",
                    borderLeft:`2px solid transparent`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.color = color
                    ;(e.currentTarget as HTMLDivElement).style.borderLeftColor = color
                    ;(e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.55)"
                    ;(e.currentTarget as HTMLDivElement).style.borderLeftColor = "transparent"
                    ;(e.currentTarget as HTMLDivElement).style.background = "none"
                  }}
                >
                  <div style={{ marginBottom:2, color:"inherit" }}>{item.title}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.url}</div>
                </div>
              ))}
            </div>
          )}
        </div>
    )
  }

export default function RunnerGame({ recGroups, exploreRecs, onLaunch, currentBestScore, onNewBestScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<"idle"|"running"|"paused"|"dead">("idle")
  const [gameState, setGameState] = useState<"idle"|"running"|"paused"|"dead">("idle")
  const gameRef = useRef<any>({})
  const rafRef = useRef<number>(0)

  // Build orb pool from recommendations
  const orbPool = useCallback(() => {
    const pool: Array<{ label: string; color: string; items: RunnerRec[] }> = []
    recGroups.forEach(g => {
      pool.push({
        label: g.label,
        color: CAT_COLORS[g.category] ?? CAT_COLORS.Default,
        items: g.items
      })
    })
    if (exploreRecs.length > 0) {
      pool.push({ label: "Explore", color: "#aaaaff", items: exploreRecs })
    }
    return pool.length > 0 ? pool : [
      { label: "Learn", color: "#ffe600", items: [] }
    ]
  }, [recGroups, exploreRecs])

  const openPanel = useCallback((cat: { label: string; color: string; items: RunnerRec[] }) => {
    stateRef.current = "paused"
    setGameState("paused")
    const panel = panelRef.current
    if (!panel) return
    const title = panel.querySelector<HTMLDivElement>("#rg-panel-title")!
    const list = panel.querySelector<HTMLDivElement>("#rg-panel-list")!
    title.textContent = `${cat.label.toUpperCase()} ORB COLLECTED — SELECT A RESOURCE`
    list.innerHTML = ""
    cat.items.forEach(item => {
      const d = document.createElement("div")
      d.style.cssText = `padding:8px 12px;margin-bottom:6px;border-radius:8px;cursor:pointer;
        border:1.5px solid rgba(203,108,230,0.3);background:rgba(203,108,230,0.1);`
      d.innerHTML = `<div style="font-size:12px;color:#e8e8f0;font-weight:bold">${item.title}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.35)">${item.url}</div>`
      d.onmouseenter = () => d.style.background = "rgba(203,108,230,0.25)"
      d.onmouseleave = () => d.style.background = "rgba(203,108,230,0.1)"
      d.onclick = () => {
        panel.style.maxHeight = "0"
        stateRef.current = "running"
        setGameState("running")
        onLaunch(item.url)
      }
      list.appendChild(d)
    })
    panel.style.maxHeight = "280px"
  }, [onLaunch, setGameState])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const pool = orbPool()
    const g = gameRef.current

    // ── Game state ──────────────────────────────────────────────
    let frame = 0, score = 0, hiScore = currentBestScore, orbsCollected = 0
    let lives = 3, speed = 1.5
    let bgX = 0
    let P = { x: 80, y: GROUND, vy: 0, onGround: true, animF: 0, hurt: false, hurtTimer: 0 }
    let obstacles: Array<{x:number}> = []
    let orbs: Array<{x:number,y:number,label:string,color:string,items:RunnerRec[],phase:number}> = []
    let particles: Array<{x:number,y:number,vx:number,vy:number,color:string,life:number,maxLife:number}> = []
    let floatTexts: Array<{x:number,y:number,text:string,color:string,vy:number,life:number,maxLife:number}> = []
    let obstTimer = 300, orbTimer = 180

    const STARS = Array.from({length:40}, () => ({
      x: Math.random()*W, y: Math.random()*(GROUND-30),
      r: Math.random()<0.3?2:1, t: Math.random()*Math.PI*2
    }))

    function updateHUDEl() {
      const el = (id: string) => document.getElementById(id)
      if (el("rg-score")) el("rg-score")!.textContent = String(score)
      if (el("rg-orbs")) el("rg-orbs")!.textContent = String(orbsCollected)
      if (el("rg-lives")) el("rg-lives")!.textContent = "♥".repeat(lives) + "♡".repeat(Math.max(0,3-lives))
      if (el("rg-hi")) el("rg-hi")!.textContent = String(hiScore)
    }

    // ── Draw calls ──────────────────────────────────────────────
    function drawBg() {
      ctx.fillStyle = "#1a0e2e"; ctx.fillRect(0,0,W,GROUND)
      ctx.strokeStyle = "rgba(203,108,230,0.12)"; ctx.lineWidth = 1
      const sp = 48, off = bgX % sp
      for (let x = -off; x < W+sp; x+=sp) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,GROUND); ctx.stroke() }
      for (let y = 20; y < GROUND; y+=36) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      STARS.forEach(s => {
        ctx.globalAlpha = (0.5+0.5*Math.sin(s.t+frame*0.03))*0.8
        ctx.fillStyle="#ffe600"; ctx.fillRect(s.x,s.y,s.r,s.r)
      }); ctx.globalAlpha=1
    }

    function drawGround() {
      ctx.fillStyle="#7c2fa0"; ctx.fillRect(0,GROUND,W,H-GROUND)
      ctx.fillStyle="#cb6ce6"; ctx.fillRect(0,GROUND,W,8)
      const tW=40, off=bgX%tW
      ctx.fillStyle="rgba(255,255,255,0.07)"
      for (let x=-off; x<W; x+=tW) ctx.fillRect(x+2,GROUND+2,tW-4,4)
    }

    function drawPlayer() {
      const px=Math.floor(P.x), py=Math.floor(P.y)
      if (P.hurt && Math.floor(frame/3)%2===0) return
      const a=Math.floor(P.animF/6)%2; const S=PIXEL_SIZE
      const px2 = [
        [3,0,"#cb6ce6"],[4,0,"#cb6ce6"],[5,0,"#cb6ce6"],[6,0,"#cb6ce6"],
        [2,1,"#cb6ce6"],[3,1,"#ffe600"],[4,1,"#ffe600"],[5,1,"#ffe600"],[6,1,"#ffe600"],[7,1,"#cb6ce6"],
        [2,2,"#cb6ce6"],[3,2,"#aaa"],[4,2,"#5b8dee"],[5,2,"#5b8dee"],[6,2,"#aaa"],[7,2,"#cb6ce6"],
        [2,3,"#cb6ce6"],[3,3,"#cb6ce6"],[4,3,"#cb6ce6"],[5,3,"#cb6ce6"],[6,3,"#cb6ce6"],[7,3,"#cb6ce6"],
        [3,4,"#7c2fa0"],[4,4,"#ffe600"],[5,4,"#ffe600"],[6,4,"#7c2fa0"],
        [3,5,"#7c2fa0"],[4,5,"#ffe600"],[5,5,"#ffe600"],[6,5,"#7c2fa0"],
        [2,6,"#5b8dee"],[3,6,"#7c2fa0"],[4,6,"#7c2fa0"],[5,6,"#7c2fa0"],[6,6,"#7c2fa0"],[7,6,"#5b8dee"],
        [2,7,"#5b8dee"],[3,7,"#7c2fa0"],[4,7,"#7c2fa0"],[5,7,"#7c2fa0"],[6,7,"#7c2fa0"],[7,7,"#5b8dee"],
        ...(a===0 ? [
          [3,8,"#2a1a42"],[4,8,"#2a1a42"],[5,8,"#cb6ce6"],[6,8,"#cb6ce6"],
          [3,9,"#2a1a42"],[4,9,"#2a1a42"],[5,9,"#cb6ce6"],
          [3,10,"#ffe600"],[4,10,"#ffe600"],[6,9,"#ffe600"],[7,9,"#ffe600"],
        ] : [
          [3,8,"#cb6ce6"],[4,8,"#cb6ce6"],[5,8,"#2a1a42"],[6,8,"#2a1a42"],
          [4,9,"#cb6ce6"],[5,9,"#2a1a42"],[6,9,"#2a1a42"],
          [3,9,"#ffe600"],[2,9,"#ffe600"],[6,10,"#ffe600"],[7,10,"#ffe600"],
        ])
      ] as [number,number,string][]
      px2.forEach(([dx,dy,c]) => {
        ctx.fillStyle=c; ctx.fillRect(px-8*S+dx*S, py-22*S+dy*S, S, S)
      })
    }

    function drawObstacle(o:{x:number}) {
      const S=2; const px=Math.floor(o.x)
      const m:[ number,number,string][] = [
        [1,0,"#ff4444"],[2,0,"#ff6644"],[3,0,"#ff4444"],
        [0,1,"#ff4444"],[1,1,"#ff8866"],[2,1,"#ffaa88"],[3,1,"#ff6644"],[4,1,"#ff4444"],
        [0,2,"#cc2222"],[1,2,"#ff6644"],[2,2,"#ff4444"],[3,2,"#cc2222"],
        [1,3,"#aa2222"],[2,3,"#cc2222"],
      ]
      m.forEach(([dx,dy,c]) => { ctx.fillStyle=c; ctx.fillRect(px+dx*S, GROUND-8*S+dy*S, S, S) })
    }

    function drawOrb(o: typeof orbs[0]) {
      const bob=Math.sin(frame*0.06+o.phase)*4
      const px=Math.floor(o.x), py=Math.floor(o.y+bob); const S=2; const c=o.color
      ctx.globalAlpha=0.18; ctx.fillStyle=c; ctx.beginPath()
      ctx.arc(px+5*S,py-5*S,14,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1
      const pts:[number,number,string][] = [
        [2,0,"#fff"],[3,0,"#fff"],
        [1,1,"#fff"],[2,1,c],[3,1,c],[4,1,c],[5,1,"#fff"],
        [0,2,"#fff"],[1,2,c],[2,2,"#fff"],[3,2,c],[4,2,c],[5,2,c],[6,2,"#fff"],
        [0,3,"#fff"],[1,3,c],[2,3,c],[3,3,c],[4,3,c],[5,3,c],[6,3,"#fff"],
        [0,4,"#fff"],[1,4,c],[2,4,c],[3,4,c],[4,4,c],[5,4,c],[6,4,"#fff"],
        [1,5,"#fff"],[2,5,c],[3,5,c],[4,5,c],[5,5,"#fff"],
        [2,6,"#fff"],[3,6,"#fff"],
      ]
      pts.forEach(([dx,dy,col]) => { ctx.fillStyle=col; ctx.fillRect(px+dx*S, py-14*S+dy*S, S, S) })
      ctx.fillStyle=c; ctx.font="bold 10px 'Press start 2p',monospace"
      ctx.textAlign="center"; ctx.fillText(o.label,px+6*S,py-17*S); ctx.textAlign="left"
    }

    function spawnParticles(x:number,y:number,color:string,n=12) {
      for (let i=0;i<n;i++) {
        const angle=(Math.PI*2*i)/n+Math.random()*0.5
        const spd=1.5+Math.random()*2.5
        particles.push({x,y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd-1,color,life:30,maxLife:30})
      }
    }

    function rectsOverlap(ax:number,ay:number,aw:number,ah:number,bx:number,by:number,bw:number,bh:number) {
      return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by
    }

    function loop() {
      ctx.clearRect(0,0,W,H); drawBg(); drawGround()

      if (stateRef.current === "running") {
        frame++; bgX+=speed; score=Math.floor(frame/6)
        //speed = 1.0 + Math.floor(frame/400)*0.5
        P.vy+=0.55; P.y+=P.vy
        if (P.y>=GROUND) { P.y=GROUND; P.vy=0; P.onGround=true } else P.onGround=false
        P.animF++
        if (P.hurt) { P.hurtTimer--; if (P.hurtTimer<=0) P.hurt=false }

        obstTimer--
        if (obstTimer<=0) { obstacles.push({x:W+20}); obstTimer=300+Math.floor(Math.random()*200) }
        orbTimer--
        if (orbTimer<=0) {
          const cat=pool[Math.floor(Math.random()*pool.length)]
          const yOpts=[GROUND,GROUND,GROUND-60]
          orbs.push({x:W+20,y:yOpts[Math.floor(Math.random()*yOpts.length)],
            label:cat.label,color:cat.color,items:cat.items,phase:Math.random()*Math.PI*2})
          orbTimer=220+Math.floor(Math.random()*160)
        }

        obstacles=obstacles.filter(o=>o.x>-40); obstacles.forEach(o=>o.x-=speed)
        orbs=orbs.filter(o=>o.x>-40); orbs.forEach(o=>o.x-=speed)

        const pb={x:P.x-14,y:P.y-44,w:28,h:44}
        obstacles.forEach((o,i) => {
          if (!P.hurt && rectsOverlap(pb.x,pb.y,pb.w,pb.h,o.x-4,GROUND-16,18,16)) {
            lives--; P.hurt=true; P.hurtTimer=60
            spawnParticles(o.x+6,GROUND-8,"#ff4444",10)
            obstacles.splice(i,1)
            if (lives==0) { stateRef.current="dead"; setGameState("dead"); hiScore=Math.max(hiScore,score); if (score > currentBestScore) { onNewBestScore(score) } }
            updateHUDEl()
          }
        })

        orbs.forEach((o,i) => {
          const ox=o.x+6,oy=o.y-14
          if (rectsOverlap(pb.x,pb.y,pb.w,pb.h,ox-10,oy-10,20,20)) {
            orbsCollected++; score+=50
            spawnParticles(ox,oy,o.color,14)
            floatTexts.push({x:ox,y:oy-10,text:`+50 ${o.label}`,color:o.color,vy:-1.2,life:50,maxLife:50})
            orbs.splice(i,1)
            openPanel({label:o.label,color:o.color,items:o.items})
            updateHUDEl()
          }
        })

        particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--})
        particles=particles.filter(p=>p.life>0)
        floatTexts.forEach(t=>{t.y+=t.vy;t.life--})
        floatTexts=floatTexts.filter(t=>t.life>0)
        updateHUDEl()
      } else if (stateRef.current==="paused") {
        frame++; bgX+=0.5; P.animF++
      }

      obstacles.forEach(drawObstacle); orbs.forEach(drawOrb)
      particles.forEach(p=>{ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),3,3)}); ctx.globalAlpha=1
      drawPlayer()
      floatTexts.forEach(t=>{ctx.globalAlpha=t.life/t.maxLife;ctx.fillStyle=t.color;ctx.font="bold 12px monospace";ctx.textAlign="center";ctx.fillText(t.text,t.x,t.y)});ctx.textAlign="left";ctx.globalAlpha=1

      rafRef.current=requestAnimationFrame(loop)
    }

    // Expose jump to DOM events
    g.jump = () => {
      if (stateRef.current==="idle"||stateRef.current==="dead") { stateRef.current="running"; setGameState("running") }
      else if (stateRef.current==="running" && P.onGround) { P.vy=-10; P.onGround=false }
    }
    g.closePanel = () => {
      const panel = panelRef.current
      if (panel) {
        panel.style.maxHeight = "0"
      }
      if (stateRef.current === "paused") {
        stateRef.current = "running"
        setGameState("running")
      }
    }
    g.reset = () => {
      score=0;orbsCollected=0;lives=3;speed=1.5;frame=0
      obstacles=[];orbs=[];particles=[];floatTexts=[]
      P={x:80,y:GROUND,vy:0,onGround:true,animF:0,hurt:false,hurtTimer:0}
      obstTimer=300;orbTimer=180;stateRef.current="running"; setGameState("running")
      updateHUDEl()
    }

    rafRef.current=requestAnimationFrame(loop)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (stateRef.current === "paused") {
          g.closePanel()
        } else {
          jump()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [orbPool, openPanel])

  const jump = useCallback(() => { gameRef.current?.jump?.() }, [])

  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>

      {/* ── Game ── */}
      <div style={{ flex:1, minWidth:0, borderRadius:12, overflow:"hidden", border:"1px solid rgba(203,108,230,0.3)" }}>
        {/* HUD */}
        <div style={{ display:"flex",gap:8,padding:"8px 14px",background:"#2a1a42",borderBottom:"1px solid rgba(203,108,230,0.3)" }}>
          {[["rg-score","SCORE","#ffe600"],["rg-orbs","ORBS","#00ff88"],["rg-lives","LIVES","#ff6b6b"],["rg-hi","BEST","#ffffff"]].map(([id,lbl,c])=>(
            <div key={id} style={{ background:"#1a0e2e",border:"1.5px solid rgba(203,108,230,0.3)",borderRadius:6,padding:"4px 12px",fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:c,letterSpacing:"0.1em" }}>
              {lbl} <span id={id} style={{ color:"#fff",fontWeight:"bold" }}>0</span>
            </div>
          ))}
          <div style={{ marginLeft:"auto",fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.3)" }}>
            SPACE / TAP = JUMP
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position:"relative" }} onClick={jump}>
          <canvas ref={canvasRef} width={W} height={H}
            style={{ display:"block",width:"100%",imageRendering:"pixelated",cursor:"pointer",background:"#1a0e2e" }} />
          {gameState === "idle" && (
            <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center" }}>
              <div style={{ fontFamily:"'Orbitron',monospace",fontSize:16,color:"#ffe600",marginBottom:8 }}>RECOMMENDATION RUNNER</div>
              <button onClick={e=>{e.stopPropagation();jump()}} style={{ padding:"8px 22px",background:"#ffe600",border:"2px solid #3d2c1e",borderRadius:8,color:"#1a0e2e",fontFamily:"'Orbitron',monospace",fontSize:12,cursor:"pointer",fontWeight:"bold",letterSpacing:"0.1em" }}>
                LAUNCH
              </button>
            </div>
          )}
          {gameState === "dead" && (
            <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center" }}>
              <div style={{ fontFamily:"'Orbitron',monospace",fontSize:16,color:"#ff6b6b",marginBottom:8 }}>GAME OVER</div>
              <button onClick={e=>{e.stopPropagation(); gameRef.current.reset()}} style={{ padding:"8px 22px",background:"#ff6b6b",border:"2px solid #3d2c1e",borderRadius:8,color:"#1a0e2e",fontFamily:"'Orbitron',monospace",fontSize:12,cursor:"pointer",fontWeight:"bold",letterSpacing:"0.1em" }}>
                RESTART
              </button>
            </div>
          )}
        </div>

        {/* Resource panel */}
        <div ref={panelRef} style={{ background:"#1a0e2e",borderTop:"1px solid rgba(203,108,230,0.3)",maxHeight:0,overflow:"hidden",transition:"max-height 0.3s ease" }}>
          <div style={{ padding:"14px 16px" }}>
            <div id="rg-panel-title" style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"#ffe600",letterSpacing:"0.1em",marginBottom:10 }} />
            <div id="rg-panel-list" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }} />
          </div>
          <button onClick={()=>{ if(panelRef.current) panelRef.current.style.maxHeight="0"; stateRef.current="running"; setGameState("running") }}
            style={{ display:"block",width:"100%",padding:6,background:"none",border:"none",borderTop:"1px solid rgba(203,108,230,0.2)",color:"rgba(255,255,255,0.35)",fontSize:10,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.08em" }}>
            ▲ CLOSE &amp; OR CLICK SPACE TO CONTINUE RUNNING
          </button>
        </div>
      </div>

      {/* ── Rec sidebar ── */}
      <div style={{ width:240, flexShrink:0, background:"rgba(10,10,26,0.95)", border:"1px solid rgba(203,108,230,0.25)", borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(203,108,230,0.15)", fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"rgba(255,230,0,0.7)", letterSpacing:"0.15em" }}>
          MISSION SECTORS
        </div>
        <div style={{ maxHeight:400, overflowY:"auto" }}>
          {recGroups.map((group) => (
            <SidebarGroup key={group.category} group={group} onLaunch={onLaunch} />
          ))}
          {exploreRecs.length > 0 && (
            <SidebarGroup
              group={{ category:"explore", label:"Explore", items: exploreRecs }}
              onLaunch={onLaunch}
            />
          )}
        </div>
      </div>

    </div>
  )
}