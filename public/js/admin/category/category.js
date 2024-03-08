// add new category
document.addEventListener('DOMContentLoaded', function () {
const form = document.getElementById("add-category");
form.addEventListener("submit", function (event) {
    event.preventDefault()
   
        Swal.fire({
            title: "Are you sure?",
            text: "You want to add new Category?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#0061bc",
            cancelButtonColor: "rgb(128, 128, 128)",
            confirmButtonText: "Yes",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // const categoryIdInput = document.getElementById("category-id"); 
                    // const categoryId = categoryIdInput.value.trim(); 

                   const categoryInput = document.getElementById("edit-category")
                   const category = categoryInput.value.trim();

                   const categorystatusSelect = document.getElementById("category-status")
                   const categorystatus = categorystatusSelect.value.trim()

                   const id=document.getElementById("category-id")
                   const body = JSON.stringify({category,status:categorystatus})
                   if (category === "") {
                       error.innerHTML = "category field can't be empty"
                       return;
                   }
                    
                   
                    let res = await fetch(
                        `/admin/category/add-category/${id}`,
                        {
                            method: "POST",
                            body: body,id,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                    let data = await res.json();
                    if (data.success) {
                        Swal.fire(
                            "Created!",
                            "New category has been created successfully.",
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
                    })