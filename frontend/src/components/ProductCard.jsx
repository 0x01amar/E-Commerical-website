import React from "react";

function ProductCard({ product, deleteProduct, editProduct }) {

  const email = localStorage.getItem("email");

  // admin email
  const isAdmin = email === "yashraj45858@gmail.com";

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "15px",
        margin: "10px",
        width: "250px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.1)"
      }}
    >

      <img
        src={`http://localhost:5000/uploads/${product.image}`}
        alt={product.name}
        style={{
          width: "100%",
          height: "200px",
          objectFit: "cover",
          borderRadius: "8px"
        }}
      />

      <h3 style={{ marginTop: "10px" }}>
        {product.name}
      </h3>

      <p style={{ fontWeight: "bold" }}>
        ₹{product.price}
      </p>

      <p style={{ color: "#666" }}>
        {product.category}
      </p>


      {/* ADMIN CONTROLS */}
      {isAdmin && (
        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>

          <button
            onClick={() => editProduct(product._id)}
            style={{
              padding: "6px 12px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Edit
          </button>

          <button
            onClick={() => deleteProduct(product._id)}
            style={{
              padding: "6px 12px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Delete
          </button>

        </div>
      )}

    </div>
  );
}

export default ProductCard;