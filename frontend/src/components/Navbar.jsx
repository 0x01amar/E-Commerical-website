import { useNavigate } from "react-router-dom";
function Navbar({search,setSearch}) {

const navigate = useNavigate();
  return (

    <div
      style={{
        background: "#131921",
        color: "white",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >

      {/* Logo */}
      <h2 style={{ cursor: "pointer" }}>
        MAA SHEELA IRON ART
      </h2>


      {/* Search Bar */}
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          style={{
            width:"35%",
            padding:"14px"
          }}
        />
            <div style={{display:"flex",gap:"10px"}}>

        <button
            onClick={()=>navigate("/login")}
            style={{padding:"14px 12px",cursor:"pointer"}}
            >
            User Login
        </button>

        <button
            onClick={()=>navigate("/admin-login")}
            style={{padding:"14px 12px",cursor:"pointer"}}
            >
            Admin Login
        </button>

        </div>
    </div>

  );

}

export default Navbar;