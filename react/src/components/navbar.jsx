import { Outlet, useNavigate } from "react-router"

function Navbar() {
  let navigate = useNavigate();

  return (
    <>
    <nav>
      <div onClick={() => navigate("/home")}>Home</div>
      <div onClick={() => navigate("/signup")}>Signup</div>
    </nav>
    </>
  )
}

export default Navbar