document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("product-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputs = form.querySelectorAll("input");
    const nombre = inputs[0].value;
    const cantidad = inputs[1].value;
    const descripcion = inputs[2].value;

    // Aquí puedes cambiar por el ID real del usuario si tienes login real
    const id_usuario = 1;

    const data = {
      nombre,
      cantidad,
      descripcion,
      id_usuario
    };

    try {
      const response = await fetch("http://localhost:5500/api/productos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        alert("✅ Producto guardado con éxito");
        form.reset();
      } else {
        const errText = await response.text();
        alert("❌ Error al guardar: " + errText);
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("❌ No se pudo conectar al servidor");
    }
  });
});
