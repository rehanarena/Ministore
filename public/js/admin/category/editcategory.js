// edit category
const form = document.getElementById("edit-category-form");
form.addEventListener("submit", function (event) {
    event.preventDefault()
    Swal.fire({
        title: "Are you sure?",
        text: "You want to Edit this Category?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#0061bc",
        cancelButtonColor: "rgb(128, 128, 128)",
        confirmButtonText: "Yes",
    }).then(async (result) => {
            if (result.isConfirmed) {
                try {

                //  const categoryIdInput = document.getElementById("category-id"); 
                //  const categoryId = categoryIdInput.value.trim(); 
                 
                const categoryInput = document.getElementById("edit-category")
                const category = categoryInput.value.trim();
                
                const categorystatusSelect = document.getElementById("category-status")
                const categorystatus = categorystatusSelect.value.trim()

                const id =  document.getElementById("category-id").value
                const body = JSON.stringify({category,status:categorystatus})
                if (category === "") {
                    error.innerHTML = "category field can't be empty"
                    return;
                }
                    
                   
                    let res = await fetch(
                        `/admin/category/edit-category/${id}`,
                        {
                            method: "POST",
                            body: body,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                    let data = await res.json();
                    if (data.success) {
                        Swal.fire(
                            "Editted!",
                            "Category Edited successfully.",
                            "success"
                        ).then(() =>
                            location.assign("/admin/category")
                        );
                    } else {
                        throw new Error(data.error);
                    }
                } catch (e) {
                    Swal.fire("Error!", e.message, "error");
                }
            }
        });
    })
    // deleting category
