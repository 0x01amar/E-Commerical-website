import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function ProductPage() {

  // URL se product id milega
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);

  useEffect(() => {

    fetch(`http://localhost:5000/api/products/${id}`)
      .then(res => res.json())
      .then(data => setProduct(data));

  }, [id]);

  // jab tak product load nahi hota
  if (!product) {
    return <h2>Loading...</h2>;
  }

        return (
            

            <div style={{padding:"40px"}}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                    marginBottom:"20px",
                    padding:"8px 15px",
                    cursor:"pointer",
                    background:"#ff9900",
                    color:"#black",
                    borderRadius:"5px",
                    boxShadow:"0 2px 5px rgba(0,0,0,0.2)"
                    }}
                    >
                    ⬅ Back
                </button>
            
            <div
                style={{
                display:"flex",
                gap:"40px",
                alignItems:"flex-start"
                }}
            >
            
            {/* LEFT SIDE IMAGE */}

            <img
                src={`http://localhost:5000${product.image}`}
                style={{
                width:"400px",
                height:"400px",
                objectFit:"cover",
                borderRadius:"5px"
                }}
            />

            {/* RIGHT SIDE DETAILS */}

            <div>

                <h1>{product.name}</h1>

                <h2 style={{color:"green"}}>₹{product.price}</h2>

                <p>Category: {product.category}</p>

            <button
                style={{
                background:"#ff9900",
                border:"none",
                padding:"10px 20px",
                fontSize:"40px",
                cursor:"pointer",
                borderRadius:"5px",
                marginTop:"10px"
            }}
            >
            Buy Now
            </button>
            

            </div>

        </div>

    </div>
  );

}

export default ProductPage;