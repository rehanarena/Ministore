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
    
    
  // edit category
//   $('#edit-category').validate({
//       rules: {
//         name: {
//             required: true,
//             maxlength: 20
//         }
//     },
//     submitHandler: function (form) {
//         Swal.fire({
//             title: "Are you sure?",
//             text: "You want to Edit this Category?",
//             icon: "warning",
//             showCancelButton: true,
//             confirmButtonColor: "#0061bc",
//             cancelButtonColor: "rgb(128, 128, 128)",
//             confirmButtonText: "Yes",
//         }).then(async (result) => {
//             if (result.isConfirmed) {
//                 const form = document.getElementById("edit-category");
//                 try {
//                     const formData = new FormData(form);
//                     let body = Object.fromEntries(formData);
//                     let id = body.category_id
//                     console.log(body);
//                     const image_string = document.getElementById("cropped_category").value;
//                     if (image_string) {
//                         const base64String = image_string
//                         const base64Data = base64String.split(",")[1];
//                         const binaryData = atob(base64Data);
//                         const uint8Array = new Uint8Array(
//                             binaryData.length
//                         );
//                         for (let i = 0; i < binaryData.length; i++) {
//                             uint8Array[i] = binaryData.charCodeAt(i);
//                         }
//                         const blob = new Blob([uint8Array], {
//                             type: "image/png",
//                         });
//                         const file = new File([blob], "image.png", {
//                             type: "image/png",
//                         });
//                         formData.append("category_image", file);
//                         let res = await fetch(
//                             `/admin/category/edit-category/${id}`,
//                             {
//                                 method: "POST",
//                                 body: formData
//                             }
//                         );
//                         let data = await res.json();
//                         if (data.success) {
//                             Swal.fire(
//                                 "Editted!",
//                                 "Category Edited successfully.",
//                                 "success"
//                             ).then(() =>
//                                 location.assign("/admin/category")
//                             );
//                         } else {
//                             throw new Error(data.message);
//                         }
//                     } else {
//                         let res = await fetch(
//                             `/admin/category/edit-category/${id}`,
//                             {
//                                 method: "POST",
//                                 body: JSON.stringify(body),
//                                 headers: { 'Content-Type': 'application/json' }
//                             }
//                         );
//                         let data = await res.json();
//                         if (data.success) {
//                             Swal.fire(
//                                 "Editted!",
//                                 "Category Edited successfully.",
//                                 "success"
//                             ).then(() =>
//                                 location.assign("/admin/category")
//                             );
//                         } else {
//                             throw new Error(data.message);
//                         }
//                     }
//                 } catch (e) {
//                     Swal.fire("Error!", e.message, "error");
//                 }
//             }
//         });
//     }
//   });
  
  
                    })