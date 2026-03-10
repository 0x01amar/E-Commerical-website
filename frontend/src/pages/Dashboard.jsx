import { useEffect, useState } from "react";

function Dashboard() {

  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(false);

  const email = localStorage.getItem("email");


  // -------- LOAD USER PROFILE --------
  useEffect(() => {

    if (!email) return;

    fetch(`http://localhost:5000/api/auth/profile/${email}`)
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.log(err));

  }, [email]);


  // -------- UPDATE PROFILE --------
  const updateProfile = () => {

    // phone validation (10 digits only)
    if (user.phone && user.phone.length !== 10) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    fetch(`http://localhost:5000/api/auth/profile/${email}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user)
    })
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setEdit(false);
      });

  };


  if (!user) {
    return <div style={{padding:"40px"}}>Loading...</div>;
  }


  return (

    <div
      style={{
        padding: "40px",
        background: "#f5f7fb",
        minHeight: "100vh",
        fontFamily: "Arial"
      }}
    >

      <h1 style={{color:"#333"}}>User Dashboard</h1>


      {/* PROFILE CARD */}

      <div
        style={{
          background: "white",
          padding: "25px",
          width: "790px",
          borderRadius: "10px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          marginTop: "20px"
        }}
      >

        <h3 style={{marginBottom:"20px",color:"#444"}}>Profile</h3>


        {/* NAME */}

        <p>
          <b>Name:</b>

          {edit ? (
            <input
              value={user.name || ""}
              onChange={(e)=>setUser({...user,name:e.target.value})}
              style={{marginLeft:"10px"}}
            />
          ) : (
            <span style={{marginLeft:"10px"}}>{user.name}</span>
          )}

        </p>


        {/* EMAIL */}

        <p>
          <b>Email:</b>
          <span style={{marginLeft:"10px",color:"#555"}}>
            {user.email}
          </span>
        </p>


        {/* PHONE */}

        <p>
          <b>Phone:</b>

          {edit ? (
            <input
              value={user.phone || ""}
              maxLength="10"
              onChange={(e)=>{

                const value = e.target.value;

                if (/^[0-9]*$/.test(value)) {
                  setUser({...user,phone:value});
                }

              }}
              style={{marginLeft:"10px"}}
            />
          ) : (
            <span style={{marginLeft:"10px"}}>
              {user.phone}
            </span>
          )}

        </p>


        {/* ADDRESS */}

        <p>
          <b>Address:</b>

          {edit ? (
            <input
              value={user.address || ""}
              onChange={(e)=>setUser({...user,address:e.target.value})}
              style={{marginLeft:"10px"}}
            />
          ) : (
            <span style={{marginLeft:"10px"}}>
              {user.address}
            </span>
          )}

        </p>


        {/* BUTTON */}

        {edit ? (

          <button
            onClick={updateProfile}
            style={{
              background:"#4CAF50",
              color:"white",
              border:"none",
              padding:"8px 20px",
              borderRadius:"5px",
              cursor:"pointer",
              marginTop:"10px"
            }}
          >
            Save
          </button>

        ) : (

          <button
            onClick={()=>setEdit(true)}
            style={{
              background:"#2196F3",
              color:"white",
              border:"none",
              padding:"8px 20px",
              borderRadius:"5px",
              cursor:"pointer",
              marginTop:"10px"
            }}
          >
            Edit Profile
          </button>

        )}

      </div>



      {/* ORDERS SECTION */}

      <div
        style={{
          marginTop:"40px",
          background:"white",
          padding:"20px",
          borderRadius:"10px",
          boxShadow:"0 4px 15px rgba(0,0,0,0.1)"
        }}
      >

        <h2>Orders</h2>

        <p style={{color:"#666"}}>No orders yet</p>

      </div>

    </div>

  );

}

export default Dashboard;