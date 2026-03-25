"use client"

import { useRouter } from "next/navigation"
import Link from "next/link";

export default function Dashboard() {

    const router = useRouter()

    const handleLogout = () => {
        localStorage.removeItem("token")
        router.push("/login")
    }

    return (
        <div className="home-container">
        <h1>Admin Dashboard</h1>
        <p>Welcome back!</p>

        <button onClick={handleLogout} style={{ padding: "8px 18px", cursor: "pointer" }}>
          Logout
        </button>

        <div className="buttons">
            <Link href="/admin/create-student">
            <button className="btn-primary">Create Student</button>
            </Link>

            <Link href="/admin/create-subject">
            <button className="btn-primary">Create Subject</button>
            </Link>

            <Link href="/admin/create-class">
            <button className="btn-primary">Create Class</button>
            </Link>

            <Link href="/admin/create-teacher">
            <button className="btn-primary">Create Teacher</button>
            </Link>

            <Link href="/admin/create-parent">
            <button className="btn-primary">Create Parent</button>
            </Link>

        
        </div>
        </div>
    );
}