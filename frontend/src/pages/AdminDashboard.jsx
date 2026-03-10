import { useEffect, useState } from "react";

function AdminDashboard() {

  // products list store करने के लिए state
  const [products, setProducts] = useState([]);

  // page load होते ही backend से products fetch होंगे
  useEffect(() => {

    fetch("http://localhost:5000/api/products")
      .then(res => res.json())
      .then(data => setProducts(data));

  }, []);


  // ---------------- ADD PRODUCT ----------------
  const addProduct = (e) => {

    e.preventDefault();

    // form से values लेना
    const name = e.target.name.value;
    const price = e.target.price.value;
    const category = e.target.category.value;

    // local file manager से image लेना
    const image = e.target.image.files[0];

    // image upload के लिए FormData जरूरी है
    const formData = new FormData();

    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("image", image);

    // backend API call
    fetch("http://localhost:5000/api/products", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(newProduct => {

        // new product तुरंत list में add
        setProducts([...products, newProduct]);

      });

  };


  // ---------------- DELETE PRODUCT ----------------
  const deleteProduct = (id) => {

    fetch(`http://localhost:5000/api/products/${id}`, {
      method: "DELETE"
    }).then(() => {

      // deleted product UI से हटाना
      setProducts(products.filter(p => p._id !== id));

    });

  };


  // ---------------- EDIT PRODUCT ----------------
  const editProduct = (product) => {

    // prompt से values edit करना
    const newName = prompt("Enter new product name", product.name);
    const newPrice = prompt("Enter new price", product.price);
    const newCategory = prompt("Enter new category", product.category);

    fetch(`http://localhost:5000/api/products/${product._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: newName,
        price: newPrice,
        category: newCategory
      })
    })
      .then(res => res.json())
      .then(updatedProduct => {

        // updated product list में replace करना
        setProducts(
          products.map(p =>
            p._id === updatedProduct._id ? updatedProduct : p
          )
        );

      });

  };


  return (

    <div style={{ padding: "40px" }}>

      <h1>Admin Dashboard</h1>

      {/* ---------------- ADD PRODUCT FORM ---------------- */}

      <form
        onSubmit={addProduct}
        style={{ marginBottom: "30px", display: "flex", gap: "10px" }}
      >

        <input name="name" placeholder="Product Name" />

        <input name="price" placeholder="Price" />

        <input name="category" placeholder="Category" />

        {/* local image upload */}
        <input type="file" name="image" />

        <button type="submit">Add Product</button>

      </form>


      {/* ---------------- PRODUCT LIST ---------------- */}

      {products.map(product => (

        <div
          key={product._id}
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "10px"
          }}
        >

          {/* product image */}
          <img
            src={
              product.image
                ? `http://localhost:5000${product.image}`
                : "https://placehold.co/200"
            }
            style={{ width: "200px", height: "120px", objectFit: "cover" }}
          />

          <h3>{product.name}</h3>
          <p>₹{product.price}</p>
          <p>{product.category}</p>

          {/* edit + delete buttons */}
          <button
            onClick={() => editProduct(product)}
            style={{ marginRight: "10px" }}
          >
            Edit
          </button>

          <button
            onClick={() => deleteProduct(product._id)}
            style={{ background: "red", color: "white" }}
          >
            Delete
          </button>

        </div>

      ))}

    </div>

  );

}

export default AdminDashboard;