import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import { Routes, Route,useNavigate } from "react-router-dom";
import ProductPage from "./pages/ProductPage";
import UserLogin from "./pages/UserLogin";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CompleteProfile from "./pages/CompleteProfile";
import LoginPassword from "./pages/LoginPassword";

function App() {

  // yaha products ka state store ho raha hai
  const [products, setProducts] = useState([]);

  // search input ke liye state
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  // component load hone par backend se products fetch karega
  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then(res => res.json())
      .then(data => setProducts(data));
  }, []);

  // new product add karne ka function
  const addProduct = (e) => {

    e.preventDefault();

    // form se values le rahe hain
    const name = e.target.name.value;
    const price = e.target.price.value;
    const category = e.target.category.value;
    const image = e.target.image.files[0];

    // image upload ke liye FormData use ho raha hai
    const formData = new FormData();

    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("image", image);

    // backend API ko POST request
    fetch("http://localhost:5000/api/products", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {

        // naya product state me add ho jayega
        setProducts([...products, data]);

      });

  };

  // product delete karne ka function
  const deleteProduct = (id) => {

    fetch(`http://localhost:5000/api/products/${id}`, {
      method: "DELETE"
    }).then(() => {

      // deleted product ko state se hata rahe hain
      setProducts(products.filter(p => p._id !== id));

    });

  };

  // product edit karne ka function
  const editProduct = (product) => {

    // prompt se new values le rahe hain
    const newName = prompt("Enter new product name", product.name);
    const newPrice = prompt("Enter new price", product.price);
    const newCategory = prompt("Enter new category", product.category);

    fetch(`http://localhost:5000/api/products/${product._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        price: newPrice,
        category: newCategory
      })
    })
      .then(res => res.json())
      .then(updated => {

        // updated product ko state me replace kar rahe hain
        setProducts(
          products.map(p => p._id === updated._id ? updated : p)
        );

      });

  };

  return (

    <Routes>

      <Route
        path="/"
        element={

          <div style={{ padding: "20px" }}>

            {/* Navbar component jisme search pass ho raha hai */}
            <Navbar search={search} setSearch={setSearch} />

            <h1>Satyam Iron ART</h1>

            {/* product add karne ka form */}
            <form
              style={{ display: "flex", gap: "10px", marginTop: "20px" }}
              onSubmit={addProduct}
            >

              <input name="name" placeholder="Product Name" />
              <input name="price" placeholder="Price" />
              <input name="category" placeholder="Category" />
              <input type="file" name="image" />

              <button type="submit">Add Product</button>

            </form>

            {/* product cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
                gap: "20px",
                marginTop: "20px"
              }}
            >

              {products
                // search filter apply ho raha hai
                .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
                .map(product => (

                  <div
                    key={product._id}
                    onClick={()=>navigate(`/product/${product._id}`)}
                    
                    style={{
                      border: "1px solid #ddd",
                      padding: "15px",
                      borderRadius: "10px",
                      background: "#fff",
                      cursor:"pointer"
                    }}
                  >

                    {/* product image */}
                    <img
                      src={
                        product.image
                          ? `http://localhost:5000${product.image}`
                          : "https://placehold.co/200"
                      }
                      style={{ width: "100%", height: "180px", objectFit: "cover" }}
                    />

                    <h3>{product.name}</h3>
                    <p>₹{product.price}</p>
                    <p>{product.category}</p>

                    {/* edit aur delete buttons */}
                      <div style={{display:"flex", gap:"10px", marginTop:"10px"}}>

                      <button
                        style={{
                          background: "#4CAF50",
                          color: "white",
                          border: "none",
                          padding: "10px 45px",
                          borderRadius: "10px",
                          cursor: "pointer"
                        }}
                        onClick={() => editProduct(product)}
                      >
                      Edit
                      </button>
                      
                      <button
                        style={{
                          background: "#f44336",
                          color: "white",
                          border: "none",
                          padding: "10px 45px",
                          borderRadius: "10px",
                          cursor: "pointer"
                        }}
                        onClick={() => deleteProduct(product._id)}
                      >
                      Delete
                      </button>
                      
                      </div>
                  </div>

                ))}

            </div>

          </div>

        }
      />

      {/* product details page route */}
      <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/login" element={<UserLogin/>}/>
        <Route path="/admin-login" element={<AdminLogin/>}/>
        <Route path ="/dashboard" element={<Dashboard/>}/>
        <Route path="/admin-dashboard" element={<AdminDashboard/>}/>
        <Route path="/complete-profile" element={<CompleteProfile/>}/>
        <Route path="/login-password" element={<LoginPassword/>}/>
        
    </Routes>
      
  );

}

export default App;