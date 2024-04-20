
const addToWishlist = async (productId) => {
    try {
      const response = await fetch(`/user/add-to-wishlist/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Network response was not ok.');
      }
  
      const data = await response.json();
      const wishlistCount = document.getElementById("wishlistCount"); // Update to the appropriate element ID
      if (wishlistCount) {
        wishlistCount.innerText = data.count; // Update to the correct property from the response
      }
      Swal.fire({
        icon: "success",
        title: "Added to Wishlist",
        text: "Your product has been added to the wishlist.",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.log(error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.message, // Display the actual error message
      });
    }
  };
  