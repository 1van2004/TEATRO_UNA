document.addEventListener("DOMContentLoaded", () => {
  const seatMap = document.getElementById("seat-map");
  const seatQuantitySelect = document.getElementById("seat-quantity");
  const selectedSeatsInput = document.getElementById("selected-seats");
  const selectedCountSpan = document.getElementById("selected-count");
  const reservationForm = document.getElementById("reservation-form");
  const customerNameInput = document.getElementById("customer-name");
  const summaryStatusLine = document.querySelector("#reservation-summary p:last-child");
  const customModal = document.getElementById("custom-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalAcceptBtn = document.getElementById("modal-accept-btn");

  const allSeatButtons = Array.from(document.querySelectorAll(".seat"));

  let seatMatrix = [];
  let selectedSeatIds = new Set();
  const seatById = new Map();

    function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    customModal.classList.add("show");
  }

  function closeModal() {
    customModal.classList.remove("show");
  }

  modalCloseBtn.addEventListener("click", closeModal);
  modalAcceptBtn.addEventListener("click", closeModal);

  customModal.addEventListener("click", (event) => {
    if (event.target === customModal) {
      closeModal();
    }
  });

  function buildSeatMatrix() {
    const rowElements = Array.from(document.querySelectorAll(".seat-row"));
    let currentId = 1;

    seatMatrix = rowElements.map((rowElement) => {
      const seatObjects = Array.from(rowElement.querySelectorAll(".seat")).map((button) => {
        const ocupado =
          button.classList.contains("occupied") ||
          button.disabled ||
          button.dataset.status === "occupied";

        const seatObject = {
          id: currentId++,
          estado: ocupado, // true = ocupado, false = libre
          label: button.dataset.seat || button.textContent.trim(),
          button,
        };

        button.dataset.id = String(seatObject.id);
        button.dataset.status = ocupado ? "occupied" : "available";

        if (ocupado) {
          button.disabled = true;
          button.classList.remove("available", "selected");
          button.classList.add("occupied");
        } else {
          button.disabled = false;
          button.classList.remove("occupied", "selected");
          button.classList.add("available");
        }

        seatById.set(seatObject.id, seatObject);
        return seatObject;
      });

      return {
        element: rowElement,
        seats: seatObjects,
      };
    });

    // Versión simplificada para inspección o evaluación
    window.asientos = seatMatrix.map((row) =>
      row.seats.map((seat) => ({
        id: seat.id,
        estado: seat.estado,
      }))
    );
  }

  function getTheaterCenter() {
    const rect = seatMap.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function getRowDistanceFromCenter(row) {
    const rect = row.element.getBoundingClientRect();
    const rowCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const theaterCenter = getTheaterCenter();

    return Math.hypot(
      rowCenter.x - theaterCenter.x,
      rowCenter.y - theaterCenter.y
    );
  }

  function getRowsSortedByCenter() {
    return [...seatMatrix].sort(
      (a, b) => getRowDistanceFromCenter(a) - getRowDistanceFromCenter(b)
    );
  }

  function findContiguousSeats(rowSeats, requestedCount) {
    if (requestedCount > rowSeats.length) {
      return [];
    }

    let contiguous = [];

    for (const seat of rowSeats) {
      if (!seat.estado) {
        contiguous.push(seat);

        if (contiguous.length === requestedCount) {
          return contiguous;
        }
      } else {
        contiguous = [];
      }
    }

    return [];
  }

  function suggest(requestedSeats) {
    const cantidad = Number(requestedSeats);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return new Set();
    }

    const maxRowSize = Math.max(...seatMatrix.map((row) => row.seats.length));

    if (cantidad > maxRowSize) {
      return new Set();
    }

    const orderedRows = getRowsSortedByCenter();

    for (const row of orderedRows) {
      const contiguousSeats = findContiguousSeats(row.seats, cantidad);

      if (contiguousSeats.length === cantidad) {
        return new Set(contiguousSeats.map((seat) => seat.id));
      }
    }

    return new Set();
  }

  // La función queda disponible globalmente
  window.suggest = suggest;

  function updateVisualSelection() {
    allSeatButtons.forEach((button) => {
      const id = Number(button.dataset.id);
      const seat = seatById.get(id);

      if (!seat || seat.estado) {
        return;
      }

      if (selectedSeatIds.has(id)) {
        button.classList.remove("available");
        button.classList.add("selected");
      } else {
        button.classList.remove("selected");
        button.classList.add("available");
      }
    });

    const labels = [...selectedSeatIds]
      .sort((a, b) => a - b)
      .map((id) => seatById.get(id)?.label)
      .filter(Boolean);

    selectedSeatsInput.value = labels.join(", ");
    selectedCountSpan.textContent = String(labels.length);

    if (labels.length === 0) {
      summaryStatusLine.innerHTML = "<strong>Estado:</strong> Pendiente";
    } else {
      summaryStatusLine.innerHTML = "<strong>Estado:</strong> Asientos seleccionados";
    }
  }

  function clearSelection() {
    selectedSeatIds = new Set();
    updateVisualSelection();
  }

  function applySuggestion() {
    clearSelection();

    const cantidad = Number(seatQuantitySelect.value);

    if (!cantidad) {
      return;
    }

    const suggestedIds = suggest(cantidad);

    if (suggestedIds.size === 0) {
      summaryStatusLine.innerHTML =
        "<strong>Estado:</strong> No hay suficientes asientos juntos";
      selectedSeatsInput.value = "";
      selectedCountSpan.textContent = "0";
      return;
    }

    selectedSeatIds = new Set(suggestedIds);
    updateVisualSelection();
  }

  function markSelectedAsOccupied() {
    for (const id of selectedSeatIds) {
      const seat = seatById.get(id);

      if (!seat) continue;

      seat.estado = true;
      seat.button.disabled = true;
      seat.button.dataset.status = "occupied";
      seat.button.classList.remove("available", "selected");
      seat.button.classList.add("occupied");
    }

    window.asientos = seatMatrix.map((row) =>
      row.seats.map((seat) => ({
        id: seat.id,
        estado: seat.estado,
      }))
    );
  }

  function getRequestedQuantity() {
    return Number(seatQuantitySelect.value);
  }

  function validateReservation() {
    const nombre = customerNameInput.value.trim();
    const cantidad = getRequestedQuantity();

    if (!nombre) {
      showModal("Validación", "Debe ingresar el nombre del cliente.");
      return false;
    }

    if (!cantidad) {
      showModal("Validación", "Debe seleccionar la cantidad de asientos.");
      return false;
    }

    if (selectedSeatIds.size !== cantidad) {
      showModal("Validación", "La cantidad de asientos seleccionados no coincide con la cantidad solicitada.");
      return false;
    }

    return true;
  }

  allSeatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const seat = seatById.get(id);
      const cantidad = getRequestedQuantity();

      if (!seat || seat.estado) {
        return;
      }

      if (!cantidad) {
        showModal("Aviso", "Primero seleccione la cantidad de asientos.");
        return;
      }

      if (selectedSeatIds.has(id)) {
        selectedSeatIds.delete(id);
        updateVisualSelection();
        return;
      }

      if (selectedSeatIds.size >= cantidad) {
        showModal("Límite de selección", `Solo puede seleccionar ${cantidad} asiento(s).`);
        return;
      }

      selectedSeatIds.add(id);
      updateVisualSelection();
    });
  });

  seatQuantitySelect.addEventListener("change", applySuggestion);

  reservationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateReservation()) {
      return;
    }

    markSelectedAsOccupied();

    const reservados = [...selectedSeatIds]
      .sort((a, b) => a - b)
      .map((id) => seatById.get(id)?.label)
      .filter(Boolean);

    showModal("Reserva confirmada", `Reserva confirmada para: ${reservados.join(", ")}`);

    reservationForm.reset();
    clearSelection();
    summaryStatusLine.innerHTML = "<strong>Estado:</strong> Reserva confirmada";
  });

  buildSeatMatrix();
  updateVisualSelection();
});