import Link from "next/link";

export default function Home() {
  return (
    <div className="home-container">
      <h1>SmartGuard</h1>
      <p>Profile Driven Web Safety Platform</p>

      <div className="buttons">
        <Link href="/signup/student">
          <button className="btn-primary">Create Student</button>
        </Link>

        <Link href="/admin/create-class">
          <button className="btn-primary">Create Class</button>
        </Link>

        <Link href="/signup/teacher">
          <button className="btn-primary">Teacher Sign Up</button>
        </Link>

        <Link href="/signup/parent">
          <button className="btn-primary">Parent Sign Up</button>
        </Link>

        <Link href="/login">
          <button className="btn-secondary">Login</button>
        </Link>
      </div>
    </div>
  );
}